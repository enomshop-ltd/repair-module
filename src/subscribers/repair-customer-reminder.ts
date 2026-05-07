import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
} from "@medusajs/framework/utils";

type RepairCustomerReminderData = {
  repair_ticket_id: string;
};

export default async function repairCustomerReminderHandler({
  event: { data },
  container,
}: SubscriberArgs<RepairCustomerReminderData>) {
  const logger = container.resolve("logger");
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // Fetch the repair ticket details
  const { data: tickets } = await query.graph({
    entity: "repair_ticket",
    fields: ["*", "device.*"],
    filters: { id: data.repair_ticket_id },
  });

  if (!tickets || tickets.length === 0) {
    logger.warn(`Repair ticket ${data.repair_ticket_id} not found`);
    return;
  }

  const ticket = tickets[0];

  // Handle Notifications (Email, SMS, WhatsApp)
  try {
    const notificationModule = container.resolve(
      ModuleRegistrationName.NOTIFICATION,
      { allowUnregistered: true },
    );
    if (notificationModule && ticket.customer_id) {
      const customerModule = container.resolve(
        ModuleRegistrationName.CUSTOMER,
        { allowUnregistered: true },
      );
      if (customerModule) {
        const customer = await customerModule.retrieveCustomer(ticket.customer_id);
        if (customer) {
          const approvalUrl = ticket.approval_token
            ? `${process.env.STORE_URL || "http://localhost:3000"}/store/repairs/track?token=${ticket.approval_token}`
            : "";

          let nudgeMessage = "Please review the status of your repair.";
          if (ticket.status === "awaiting_approval") {
              nudgeMessage = "We are waiting for your approval to proceed with the repair.";
          } else if (ticket.status === "completed" || ticket.status === "ready") {
              nudgeMessage = "Your device is ready for pickup or payment.";
          }
          
          const payloadData = {
            ticket_number: ticket.ticket_number,
            status: ticket.status,
            device: ticket.device?.model_name,
            total_estimate: (
              Number((ticket.total_estimate as any)?.value ?? ticket.total_estimate) / 100
            ).toFixed(2),
            approval_url: approvalUrl,
            nudge_message: nudgeMessage
          };

          // 1. Email Notification
          if (customer.email) {
            await notificationModule.createNotifications({
              to: customer.email,
              channel: "email",
              template: "repair-customer-reminder",
              data: payloadData,
            });
            logger.info(
              `Reminder email sent to ${customer.email} for ticket ${ticket.ticket_number}`,
            );
          }

          // 2. SMS Notification 
          if (customer.phone) {
            await notificationModule
              .createNotifications({
                to: customer.phone,
                channel: "sms",
                template: "repair-customer-reminder-sms",
                data: payloadData,
              })
              .catch((e) =>
                logger.debug(
                  `SMS provider not configured or failed: ${e.message}`,
                ),
              );

            // WhatsApp 
            await notificationModule
              .createNotifications({
                to: customer.phone,
                channel: "whatsapp",
                template: "repair-customer-reminder-wa",
                data: payloadData,
              })
              .catch((e) =>
                logger.debug(
                  `WhatsApp provider not configured or failed: ${e.message}`,
                ),
              );
          }
        }
      }
    }
  } catch (err) {
    logger.warn(`Failed to send reminder for repair ticket: ${err}`);
  }
}

export const config: SubscriberConfig = {
  event: "repair.customer_reminder",
};
