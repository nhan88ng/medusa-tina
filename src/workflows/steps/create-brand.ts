import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { BRAND_MODULE } from "../../modules/brand"
import BrandModuleService from "../../modules/brand/service"

type CreateBrandInput = {
  name: string
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

export const createBrandStep = createStep(
  "create-brand-step",
  async (input: CreateBrandInput, { container }) => {
    const brandService: BrandModuleService = container.resolve(BRAND_MODULE)
    const brand = await brandService.createBrands({
      ...input,
      handle: input.handle || generateHandle(input.name),
    })
    return new StepResponse(brand, brand.id)
  },
  async (brandId: string | undefined, { container }) => {
    if (!brandId) return
    const brandService: BrandModuleService = container.resolve(BRAND_MODULE)
    await brandService.deleteBrands(brandId)
  }
)
