import { model } from "@medusajs/framework/utils"

const WishlistItem = model
  .define("wishlist_item", {
    id: model.id().primaryKey(),
    customer_id: model.text(),
    product_id: model.text(),
  })
  .indexes([
    {
      on: ["customer_id", "product_id"],
      unique: true,
      name: "IDX_wishlist_customer_product",
    },
  ])

export default WishlistItem
