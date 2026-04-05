import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import vnData from "../../../../data/vn-provinces.json"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const provinces = vnData.map(({ code, codename, name }) => ({
    code,
    codename,
    name,
  }))
  res.json({ provinces })
}
