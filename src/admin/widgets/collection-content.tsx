import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import EntityContentSection from "../components/entity-content-section"

const CollectionContentWidget = ({ data: collection }: DetailWidgetProps<{ id: string }>) => {
  return <EntityContentSection entityType="collection" entityId={collection.id} />
}

export const config = defineWidgetConfig({
  zone: "product_collection.details.after",
})

export default CollectionContentWidget
