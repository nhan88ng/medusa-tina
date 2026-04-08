import { MedusaService, InjectManager, MedusaContext } from "@medusajs/framework/utils"
import Review from "./models/review"

class ProductReviewModuleService extends MedusaService({
  Review,
}) {
  @InjectManager("productReview")
  async getAverageRating(
    productId: string,
    @MedusaContext() sharedContext: any = {}
  ): Promise<{ average: number; count: number }> {
    const manager = sharedContext.transactionManager
    const connection = manager.getConnection()
    const result = await connection.execute(
      `SELECT AVG(rating) as avg, COUNT(*) as count FROM review WHERE product_id = ? AND status = 'approved' AND deleted_at IS NULL`,
      [productId]
    )
    
    const row = result[0]
    return {
      average: row?.avg ? Math.round(parseFloat(row.avg) * 10) / 10 : 0,
      count: row?.count ? parseInt(row.count) : 0,
    }
  }
}

export default ProductReviewModuleService
