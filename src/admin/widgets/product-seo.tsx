import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import SeoMetadataSection from "../components/seo-metadata-section"

const ProductSeoWidget = ({ data: product }: DetailWidgetProps<{ id: string }>) => {
  return <SeoMetadataSection entityType="product" entityId={product.id} />
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSeoWidget
