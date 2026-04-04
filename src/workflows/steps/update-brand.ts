import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { BRAND_MODULE } from "../../modules/brand"
import BrandModuleService from "../../modules/brand/service"

type UpdateBrandInput = {
  id: string
  name?: string
  handle?: string
  description?: string
  content?: string
  logo_url?: string
}

function generateHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export const updateBrandStep = createStep(
  "update-brand-step",
  async (input: UpdateBrandInput, { container }) => {
    const brandService: BrandModuleService = container.resolve(BRAND_MODULE)
    const previousBrand = await brandService.retrieveBrand(input.id)
    const updateData = { ...input }
    if (input.name && !input.handle) {
      updateData.handle = generateHandle(input.name)
    }
    const brand = await brandService.updateBrands(updateData)
    return new StepResponse(brand, previousBrand)
  },
  async (previousBrand, { container }) => {
    if (!previousBrand) return
    const brandService: BrandModuleService = container.resolve(BRAND_MODULE)
    await brandService.updateBrands(previousBrand)
  }
)
