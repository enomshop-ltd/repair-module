import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys, ModuleRegistrationName } from "@medusajs/framework/utils";
import { REPAIR_MODULE } from "../../modules/repair";
import RepairModuleService from "../../modules/repair/service";

type AddRepairPartsInput = {
  repair_ticket_id: string;
  variant_ids: string[];
  customer_id?: string;
  region_id?: string;
};

export const addRepairPartsStep = createStep(
  "add-repair-parts",
  async (input: AddRepairPartsInput, { container }) => {
    const link = container.resolve(ContainerRegistrationKeys.LINK);
    const repairService: RepairModuleService = container.resolve(REPAIR_MODULE);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const inventoryModule = container.resolve(ModuleRegistrationName.INVENTORY, { allowUnregistered: true }) as any;

    // Create links between repair ticket and product variants
    const linkData = input.variant_ids.map((variantId) => ({
      repair_ticket: { repair_ticket_id: input.repair_ticket_id },
      product_variant: { product_variant_id: variantId },
    }));

    await link.create(linkData);

    const createdReservationIds: string[] = [];

    // Attempt to reserve stock if the inventory module is available
    if (inventoryModule) {
      const { data: variantsWithInventory } = await query.graph({
        entity: "product_variant",
        fields: ["id", "inventory_items.*", "inventory_items.inventory_item_id"],
        filters: { id: input.variant_ids },
      });

      if (variantsWithInventory?.length) {
        for (const variant of variantsWithInventory) {
          if (variant.inventory_items?.length) {
            for (const itemLink of variant.inventory_items) {
              const [levels, count] = await inventoryModule.listAndCountInventoryLevels({
                inventory_item_id: itemLink.inventory_item_id,
              });

              if (levels?.length) {
                // Determine a location to deduct from (for simplicity we pick the first one with stock, or just the first one if none have stock but we assume first)
                const levelToAdjust = levels.find((l: any) => l.stocked_quantity > 0) || levels[0];
                const qtyToReserve = itemLink.required_quantity || 1;

                const [reservation] = await inventoryModule.createReservationItems([
                  {
                    line_item_id: `repair_${input.repair_ticket_id}_${variant.id}`, // We supply a placeholder for reservations identifying
                    inventory_item_id: levelToAdjust.inventory_item_id,
                    location_id: levelToAdjust.location_id,
                    quantity: qtyToReserve,
                    metadata: { repair_ticket_id: input.repair_ticket_id, variant_id: variant.id }
                  }
                ]);
                createdReservationIds.push(reservation.id);
              }
            }
          }
        }
      }
    }

    let priceMetadata = {};

    // Fetch prices for the variants respecting customer price groups
    if (input.customer_id && input.region_id) {
      const { data: variantsWithPrices } = await query.graph({
        entity: "product_variant",
        fields: ["id", "calculated_price.*", "calculated_price.price_list.*"],
        filters: {
          id: input.variant_ids,
        },
        context: {
          region_id: input.region_id,
          customer_id: input.customer_id,
        },
      });

      // Store price data for display
      priceMetadata = variantsWithPrices?.reduce(
        (acc: any, variant: any) => {
          acc[variant.id] = {
            calculated_price: variant.calculated_price?.calculated_amount,
            price_list_id: variant.calculated_price?.price_list?.id,
            price_list_name: variant.calculated_price?.price_list?.name,
          };
          return acc;
        },
        {},
      );
    }

    return new StepResponse(
      {
        repair_ticket_id: input.repair_ticket_id,
        variant_ids: input.variant_ids,
        price_metadata: priceMetadata,
        created_reservations: createdReservationIds,
      },
      { linkData, createdReservationIds }
    );
  },
  async (compensationData, { container }) => {
    if (!compensationData) return;
    const { linkData, createdReservationIds } = compensationData;
    
    const link = container.resolve(ContainerRegistrationKeys.LINK);
    if (linkData) {
      await link.dismiss(linkData);
    }

    // Rollback reservations
    const inventoryModule = container.resolve(ModuleRegistrationName.INVENTORY, { allowUnregistered: true }) as any;
    if (inventoryModule && createdReservationIds?.length) {
      await inventoryModule.deleteReservationItems(createdReservationIds);
    }
  },
);
