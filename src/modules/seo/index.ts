import SeoModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const SEO_MODULE = "seo"

export default Module(SEO_MODULE, {
  service: SeoModuleService,
})
