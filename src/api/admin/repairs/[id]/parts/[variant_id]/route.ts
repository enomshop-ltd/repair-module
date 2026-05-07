import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { removeRepairPartWorkflow } from "../../../../../../workflows/remove-repair-part-workflow";

// DELETE /admin/repairs/:id/parts/:variant_id
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse,
) {
  const { result } = await removeRepairPartWorkflow(req.scope).run({
    input: {
      repair_ticket_id: req.params.id,
      variant_id: req.params.variant_id,
    },
  });

  res.json(result);
}
