import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

// POST /admin/repairs/:id/remind - Send customer reminder
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
) {
  const eventBus = req.scope.resolve(Modules.EVENT_BUS);

  await eventBus.emit({
    name: "repair.customer_reminder",
    data: {
      repair_ticket_id: req.params.id,
    },
  });

  res.json({ success: true });
}
