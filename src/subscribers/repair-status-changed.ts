import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
} from "@medusajs/framework/utils";
import { REPAIR_MODULE } from "../modules/repair";
import RepairModuleService from "../modules/repair/service";

type RepairStatusChangedData = {
  repair_ticket_id: string;
  status: string;
  previous_status?: string;
};

export default async function repairStatusChangedHandler({
  event: { data },
  container,
}: SubscriberArgs<RepairStatusChangedData>) {
  const logger = container.resolve("logger");
  const repairService: RepairModuleService = container.resolve(REPAIR_MODULE);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info(
    `Repair ticket ${data.repair_ticket_id} status changed to ${data.status}`,
  );

  // Fetch the repair ticket details along with parts
  const { data: tickets } = await query.graph({
    entity: "repair_ticket",
    fields: [
      "*",
      "device.*",
      "product_variant.*",
      "product_variant.inventory_items.*", // Resolve inventory items
    ],
    filters: { id: data.repair_ticket_id },
  });

  if (!tickets || tickets.length === 0) {
    logger.warn(`Repair ticket ${data.repair_ticket_id} not found`);
    return;
  }

  const ticket = tickets[0];

  // Auto-deduct parts when repair is completed
  if (data.status === "completed" && data.previous_status !== "completed") {
    logger.info(
      `Processing part deductions for completed repair ticket ${ticket.ticket_number}`,
    );
    try {
      const inventoryModule = container.resolve(
        ModuleRegistrationName.INVENTORY,
        { allowUnregistered: true },
      );
      if (
        inventoryModule &&
        ticket.product_variant &&
        ticket.product_variant.length > 0
      ) {
        for (const part of ticket.product_variant) {
          if (part.inventory_items && part.inventory_items.length > 0) {
            for (const itemLink of part.inventory_items) {
              // We retrieve the inventory levels for this item
              const [levels, count] =
                await inventoryModule.listAndCountInventoryLevels({
                  inventory_item_id: itemLink.inventory_item_id,
                });

              if (levels && levels.length > 0) {
                // Deduct from the first available location
                const levelToAdjust = levels[0];
                const qtyToDeduct = itemLink.required_quantity || 1;

                await inventoryModule.updateInventoryLevels([
                  {
                    inventory_item_id: levelToAdjust.inventory_item_id,
                    location_id: levelToAdjust.location_id,
                    stocked_quantity:
                      levelToAdjust.stocked_quantity - qtyToDeduct,
                  } as any,
                ]);

                logger.info(
                  `Deducted ${qtyToDeduct} from inventory item ${levelToAdjust.inventory_item_id} (Variant: ${part.title})`,
                );
              }
            }
          } else {
            logger.warn(
              `Product variant ${part.title} (${part.id}) has no inventory items linked.`,
            );
          }
          
          // Delete associated reservation
          const [reservations] = await inventoryModule.listAndCountReservationItems({
            line_item_id: `repair_${ticket.id}_${part.id}`
          });
          
          if (reservations?.length) {
            await inventoryModule.deleteReservationItems(reservations.map((r: any) => r.id));
            logger.info(`Cleared reservation for variant ${part.title}`);
          }
        }
      } else if (!inventoryModule) {
        logger.warn("Inventory module not registered, skipping auto-deduct.");
      } else {
        logger.info(
          `No parts to deduct for repair ticket ${ticket.ticket_number}.`,
        );
      }
    } catch (err) {
      logger.error(
        `Error auto-deducting parts for repair ticket ${ticket.ticket_number}: ${err}`,
      );
    }
  }

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
        const customer = await customerModule.retrieveCustomer(
          ticket.customer_id,
        );
        if (customer) {
          const approvalUrl = ticket.approval_token
            ? `${process.env.STORE_URL || "http://localhost:3000"}/store/repairs/track?token=${ticket.approval_token}`
            : "";

          const payloadData = {
            ticket_number: ticket.ticket_number,
            status: data.status,
            device: ticket.device?.model_name,
            total_estimate: (
              Number(
                (ticket.total_estimate as any)?.value ?? ticket.total_estimate,
              ) / 100
            ).toFixed(2),
            approval_url: approvalUrl,
          };

          // Admin Internal Notification
          await notificationModule
            .createNotifications({
              to: "admin",
              channel: "admin", // Internal admin notification channel
              template: "admin-repair-status",
              data: {
                ...payloadData,
                customer_name: customer.first_name
                  ? `${customer.first_name} ${customer.last_name || ""}`
                  : customer.email,
              },
            })
            .catch((e) =>
              logger.warn(`Admin notification failed: ${e.message}`),
            );
          logger.info(
            `Admin notification queued for ticket ${ticket.ticket_number}`,
          );

          // 1. Email Notification
          if (customer.email) {
            await notificationModule.createNotifications({
              to: customer.email,
              channel: "email",
              template: "repair-status-updated",
              data: payloadData,
            });
            logger.info(
              `Email sent to ${customer.email} for ticket ${ticket.ticket_number}`,
            );
          }

          // 2. SMS / WhatsApp Notification (Assuming customer.phone exists)
          if (customer.phone) {
            // SMS
            await notificationModule
              .createNotifications({
                to: customer.phone,
                channel: "sms",
                template: "repair-status-updated-sms",
                data: payloadData,
              })
              .catch((e) =>
                logger.warn(
                  `SMS provider not configured or failed: ${e.message}`,
                ),
              );
            logger.info(
              `SMS queued for ${customer.phone} for ticket ${ticket.ticket_number}`,
            );

            // WhatsApp (Custom channel label)
            await notificationModule
              .createNotifications({
                to: customer.phone,
                channel: "whatsapp",
                template: "repair-status-updated-wa",
                data: payloadData,
              })
              .catch((e) =>
                logger.warn(
                  `WhatsApp provider not configured or failed: ${e.message}`,
                ),
              );
            logger.info(
              `WhatsApp message queued for ${customer.phone} for ticket ${ticket.ticket_number}`,
            );
          }
        }
      }
    }
  } catch (err) {
    logger.warn(`Failed to send notification for repair ticket: ${err}`);
  }

  logger.info(
    `Processed event for repair ticket ${ticket.ticket_number} - Status: ${data.status}`,
  );
}

export const config: SubscriberConfig = {
  event: "repair.status_changed",
};
