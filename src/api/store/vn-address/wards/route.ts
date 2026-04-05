import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import vnData from "../../../../data/vn-provinces.json"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const provinceCode = req.query.province_code as string
  if (!provinceCode) {
    return res.status(400).json({ message: "province_code is required" })
  }
  const province = vnData.find((p) => p.code === provinceCode)
  if (!province) {
    return res.status(404).json({ message: "Province not found" })
  }
  res.json({ wards: province.wards })
}
