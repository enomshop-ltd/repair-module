import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { removeRepairPartStep } from "./steps/remove-repair-part";

type RemoveRepairPartWorkflowInput = {
  repair_ticket_id: string;
  variant_id: string;
};

export const removeRepairPartWorkflow = createWorkflow(
  "remove-repair-part-workflow",
  function (input: RemoveRepairPartWorkflowInput) {
    const result = removeRepairPartStep(input);

    return new WorkflowResponse(result);
  },
);
