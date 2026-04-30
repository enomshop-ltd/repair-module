import { defineMiddlewares } from "@medusajs/framework/http"
import { repairMiddlewares } from "./admin/repairs/middleware"
import { storeRepairMiddlewares } from "./store/repairs/middleware"

export default defineMiddlewares({
  routes: [...repairMiddlewares, ...storeRepairMiddlewares],
})
