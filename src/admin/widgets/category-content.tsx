import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import EntityContentSection from "../components/entity-content-section"

const CategoryContentWidget = ({ data: category }: DetailWidgetProps<{ id: string }>) => {
  return <EntityContentSection entityType="category" entityId={category.id} />
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after",
})

export default CategoryContentWidget
