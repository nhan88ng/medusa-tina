import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { BRAND_MODULE } from "../../modules/brand"
import BrandModuleService from "../../modules/brand/service"

type UpdateBrandInput = {
  id: string
  name?: string
  description?: string
  logo_url?: string
}

export const updateBrandStep = createStep(
  "update-brand-step",
  async (input: UpdateBrandInput, { container }) => {
    const brandService: BrandModuleService = container.resolve(BRAND_MODULE)
    const previousBrand = await brandService.retrieveBrand(input.id)
    const brand = await brandService.updateBrands(input)
    return new StepResponse(brand, previousBrand)
  },
  async (previousBrand, { container }) => {
    if (!previousBrand) return
    const brandService: BrandModuleService = container.resolve(BRAND_MODULE)
    await brandService.updateBrands(previousBrand)
  }
)
