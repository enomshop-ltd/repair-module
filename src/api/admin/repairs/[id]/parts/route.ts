import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { addRepairPartsWorkflow } from "../../../../../workflows/add-repair-parts-workflow"

// POST /admin/repairs/:id/parts - Add parts to repair ticket
export async function POST(
  req: MedusaRequest<{
    variant_ids: string[]
  }>,
  res: MedusaResponse
) {
  const { variant_ids } = req.validatedBody

  const { result } = await addRepairPartsWorkflow(req.scope).run({
    input: {
      repair_ticket_id: req.params.id,
      variant_ids,
    },
  })

  res.json(result)
}
