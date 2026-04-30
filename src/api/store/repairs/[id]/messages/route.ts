import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { addRepairUpdateStep } from "../../../../../workflows/steps/add-repair-update"

const addRepairUpdateWorkflow = createWorkflow(
  "add-repair-update-workflow-store",
  function (input: {
    repair_ticket_id: string
    message: string
    author_id?: string
    author_type?: "user" | "customer"
  }) {
    const update = addRepairUpdateStep(input)
    return new WorkflowResponse({ update })
  }
)

// GET /store/repairs/:id/messages - Get messages for repair
export async function GET(
  req: MedusaRequest<{ id: string }>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "repair_update",
    fields: ["*"],
    filters: { repair_ticket_id: req.params.id },
  })

  res.json({
    messages: data || [],
  })
}

// POST /store/repairs/:id/messages - Send message to repair chat
export async function POST(
  req: AuthenticatedMedusaRequest<{
    message: string
  }>,
  res: MedusaResponse
) {
  const { message } = req.validatedBody
  const customerId = req.auth_context?.actor_id

  const { result } = await addRepairUpdateWorkflow(req.scope).run({
    input: {
      repair_ticket_id: req.params.id,
      message,
      author_id: customerId,
      author_type: "customer",
    },
  })

  res.json({
    update: result.update,
  })
}
