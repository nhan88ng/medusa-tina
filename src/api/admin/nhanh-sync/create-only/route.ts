import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncNhanhCreateOnlyWorkflow } from "../../../../workflows/sync-nhanh-products"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  try {
    const { result } = await syncNhanhCreateOnlyWorkflow(req.scope).run({
      input: {},
    })

    res.status(200).json({
      success: true,
      message: "Create-only sync from Nhanh.vn completed successfully",
      result,
    })
  } catch (error) {
    console.error("[Nhanh Create-Only Sync Error]:", error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}
