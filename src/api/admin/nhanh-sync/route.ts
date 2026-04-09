import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncNhanhProductsWorkflow } from "../../../workflows/sync-nhanh-products"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  try {
    const { result } = await syncNhanhProductsWorkflow(req.scope).run({
      input: {},
    })

    res.status(200).json({
      success: true,
      message: "Nhanh.vn sync completed successfully",
      result,
    })
  } catch (error) {
    console.error("[Nhanh Sync Error]:", error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}
