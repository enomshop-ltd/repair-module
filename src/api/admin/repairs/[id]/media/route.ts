import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { addRepairMediaStep } from "../../../../../workflows/steps/add-repair-media"

const addRepairMediaWorkflow = createWorkflow(
  "add-repair-media-workflow",
  function (input: {
    repair_ticket_id: string
    file_url: string
    file_name: string
    file_type: "image" | "video"
    mime_type?: string
    file_size?: number
    description?: string
  }) {
    const media = addRepairMediaStep(input)
    return new WorkflowResponse({ media })
  }
)

// POST /admin/repairs/:id/media - Add media to repair ticket
export async function POST(
  req: MedusaRequest<{
    file_url: string
    file_name: string
    file_type: "image" | "video"
    mime_type?: string
    file_size?: number
    description?: string
  }>,
  res: MedusaResponse
) {
  const { file_url, file_name, file_type, mime_type, file_size, description } = req.validatedBody

  const { result } = await addRepairMediaWorkflow(req.scope).run({
    input: {
      repair_ticket_id: req.params.id,
      file_url,
      file_name,
      file_type,
      mime_type,
      file_size,
      description,
    },
  })

  res.json({
    media: result.media,
  })
}
