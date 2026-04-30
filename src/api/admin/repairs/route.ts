import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createRepairTicketWorkflow } from "../../../workflows/create-repair-ticket-workflow"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/repairs - List all repair tickets
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data, metadata } = await query.graph({
    entity: "repair_ticket",
    fields: [
      "*",
      "device.*",
      "media.*",
      "notes.*",
      "updates.*",
    ],
    filters: req.filterableFields,
    pagination: req.queryConfig?.pagination,
  })

  res.json({
    repair_tickets: data,
    ...metadata,
  })
}

// POST /admin/repairs - Create a new repair ticket
export async function POST(
  req: MedusaRequest<{
    device: any
    ticket: any
  }>,
  res: MedusaResponse
) {
  const { device, ticket } = req.validatedBody

  const { result } = await createRepairTicketWorkflow(req.scope).run({
    input: {
      device,
      ticket,
    },
  })

  res.json({
    repair_ticket: result.repairTicket,
    device: result.device,
  })
}
