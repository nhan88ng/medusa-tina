import EntityContentModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const ENTITY_CONTENT_MODULE = "entityContent"

export default Module(ENTITY_CONTENT_MODULE, {
  service: EntityContentModuleService,
})
