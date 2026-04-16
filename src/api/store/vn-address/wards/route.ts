import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { fetchNhanhLocations } from "../../../../lib/nhanh"
import { cacheGet, cacheSet } from "../cache"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const districtId = req.query.districtId as string
  if (!districtId) {
    return res.status(400).json({ message: "districtId is required" })
  }

  const id = Number(districtId)
  if (isNaN(id)) {
    return res.status(400).json({ message: "districtId must be a number" })
  }

  const CACHE_KEY = `nhanh:locations:wards:${id}`
  const cached = cacheGet<{ id: number; name: string }[]>(CACHE_KEY)
  if (cached) {
    return res.json({ wards: cached })
  }

  try {
    const items = await fetchNhanhLocations("WARD", id)
    const wards = items.map(({ id: wId, name }) => ({ id: wId, name }))
    cacheSet(CACHE_KEY, wards)
    console.log(`[vn-address] Fetched ${wards.length} wards for district ${id} from Nhanh, cached 24h`)
    return res.json({ wards })
  } catch (err: any) {
    console.error(`[vn-address] Failed to fetch wards for district ${id}:`, err?.message)
    return res.status(503).json({ message: "Address service temporarily unavailable" })
  }
}
