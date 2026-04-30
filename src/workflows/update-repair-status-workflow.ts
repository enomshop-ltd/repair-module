import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateRepairTicketStatusStep } from "./steps/update-repair-ticket-status"
import { emitRepairStatusChangedEventStep } from "./steps/emit-repair-status-changed-event"

type UpdateRepairStatusWorkflowInput = {
  repair_ticket_id: string
  status: "received" | "diagnosing" | "awaiting_approval" | "repairing" | "ready" | "completed" | "cancelled"
  estimated_completion?: Date
  previous_status?: string
}

export const updateRepairStatusWorkflow = createWorkflow(
  "update-repair-status-workflow",
  function (input: UpdateRepairStatusWorkflowInput) {
    const updatedTicket = updateRepairTicketStatusStep({
      repair_ticket_id: input.repair_ticket_id,
      status: input.status,
      estimated_completion: input.estimated_completion,
    })

    // Emit event for subscribers
    emitRepairStatusChangedEventStep({
      repair_ticket_id: input.repair_ticket_id,
      status: input.status,
      previous_status: input.previous_status,
    })

    return new WorkflowResponse({
      repairTicket: updatedTicket,
    })
  }
)
