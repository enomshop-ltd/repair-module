import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { addRepairUpdateStep } from "../../../../../workflows/steps/add-repair-update"

const addRepairUpdateWorkflow = createWorkflow(
  "add-repair-update-workflow",
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

// POST /admin/repairs/:id/messages - Add message to repair chat
export async function POST(
  req: AuthenticatedMedusaRequest<{
    message: string
  }>,
  res: MedusaResponse
) {
  const { message } = req.validatedBody
  const userId = req.auth_context?.actor_id

  const { result } = await addRepairUpdateWorkflow(req.scope).run({
    input: {
      repair_ticket_id: req.params.id,
      message,
      author_id: userId,
      author_type: "user",
    },
  })

  res.json({
    update: result.update,
  })
}
