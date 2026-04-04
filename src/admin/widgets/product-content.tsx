import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import EntityContentSection from "../components/entity-content-section"

const ProductContentWidget = ({ data: product }: DetailWidgetProps<{ id: string }>) => {
  return <EntityContentSection entityType="product" entityId={product.id} />
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductContentWidget
