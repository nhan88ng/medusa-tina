import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import SeoMetadataSection from "../components/seo-metadata-section"

const CategorySeoWidget = ({ data: category }: DetailWidgetProps<{ id: string }>) => {
  return <SeoMetadataSection entityType="category" entityId={category.id} />
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after",
})

export default CategorySeoWidget
