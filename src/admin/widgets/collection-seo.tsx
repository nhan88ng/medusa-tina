import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import SeoMetadataSection from "../components/seo-metadata-section"

const CollectionSeoWidget = ({ data: collection }: DetailWidgetProps<{ id: string }>) => {
  return <SeoMetadataSection entityType="collection" entityId={collection.id} />
}

export const config = defineWidgetConfig({
  zone: "product_collection.details.after",
})

export default CollectionSeoWidget
