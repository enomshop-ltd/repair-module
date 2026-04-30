import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { addRepairNoteStep } from "../../../../../workflows/steps/add-repair-note"

const addRepairNoteWorkflow = createWorkflow(
  "add-repair-note-workflow",
  function (input: {
    repair_ticket_id: string
    content: string
    is_internal: boolean
    author_id?: string
    author_type?: "user" | "customer"
  }) {
    const note = addRepairNoteStep(input)
    return new WorkflowResponse({ note })
  }
)

// POST /admin/repairs/:id/notes - Add note to repair ticket
export async function POST(
  req: AuthenticatedMedusaRequest<{
    content: string
    is_internal: boolean
  }>,
  res: MedusaResponse
) {
  const { content, is_internal } = req.validatedBody
  const userId = req.auth_context?.actor_id

  const { result } = await addRepairNoteWorkflow(req.scope).run({
    input: {
      repair_ticket_id: req.params.id,
      content,
      is_internal,
      author_id: userId,
      author_type: "user",
    },
  })

  res.json({
    note: result.note,
  })
}
