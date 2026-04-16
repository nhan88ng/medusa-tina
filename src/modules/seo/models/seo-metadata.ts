import { model } from "@medusajs/framework/utils"

const SeoMetadata = model.define("seo_metadata", {
  id: model.id().primaryKey(),
  meta_title: model.text().nullable(),
  meta_description: model.text().nullable(),
  meta_keywords: model.text().nullable(),
  og_title: model.text().nullable(),
  og_description: model.text().nullable(),
  og_image: model.text().nullable(),
  canonical_url: model.text().nullable(),
})

export default SeoMetadata
