import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { BRAND_MODULE } from "../../modules/brand"
import BrandModuleService from "../../modules/brand/service"

export const deleteBrandStep = createStep(
  "delete-brand-step",
  async (id: string, { container }) => {
    const brandService: BrandModuleService = container.resolve(BRAND_MODULE)
    const brand = await brandService.retrieveBrand(id)
    await brandService.deleteBrands(id)
    return new StepResponse(null, brand)
  },
  async (brand, { container }) => {
    if (!brand) return
    const brandService: BrandModuleService = container.resolve(BRAND_MODULE)
    await brandService.createBrands(brand)
  }
)
