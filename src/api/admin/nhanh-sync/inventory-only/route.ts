import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncNhanhInventoryOnlyWorkflow } from "../../../../workflows/sync-nhanh-products"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  try {
    const { result } = await syncNhanhInventoryOnlyWorkflow(req.scope).run({
      input: {},
    })

    res.status(200).json({
      success: true,
      message: "Inventory sync from Nhanh.vn completed successfully",
      result,
    })
  } catch (error) {
    console.error("[Nhanh Inventory Sync Error]:", error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}
