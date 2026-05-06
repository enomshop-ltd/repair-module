import { model } from "@medusajs/framework/utils"
import RepairTicket from "./repair-ticket"

const Device = model.define("device", {
  id: model.id().primaryKey(),
  serial_number: model.text().unique(),
  model_name: model.text(),
  brand: model.text(),
  customer_id: model.text().nullable(),
  imei: model.text().nullable(),
  condition: model.text().nullable(),
  metadata: model.json().nullable(),
  repair_tickets: model.hasMany(() => RepairTicket, {
    mappedBy: "device",
  }),
})

export default Device

