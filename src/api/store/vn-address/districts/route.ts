import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { fetchNhanhLocations } from "../../../../lib/nhanh"
import { cacheGet, cacheSet } from "../cache"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const provinceId = req.query.provinceId as string
  if (!provinceId) {
    return res.status(400).json({ message: "provinceId is required" })
  }

  const id = Number(provinceId)
  if (isNaN(id)) {
    return res.status(400).json({ message: "provinceId must be a number" })
  }

  const CACHE_KEY = `nhanh:locations:districts:${id}`
  const cached = cacheGet<{ id: number; name: string }[]>(CACHE_KEY)
  if (cached) {
    return res.json({ districts: cached })
  }

  try {
    const items = await fetchNhanhLocations("DISTRICT", id)
    const districts = items.map(({ id: dId, name }) => ({ id: dId, name }))
    cacheSet(CACHE_KEY, districts)
    console.log(`[vn-address] Fetched ${districts.length} districts for province ${id} from Nhanh, cached 24h`)
    return res.json({ districts })
  } catch (err: any) {
    console.error(`[vn-address] Failed to fetch districts for province ${id}:`, err?.message)
    return res.status(503).json({ message: "Address service temporarily unavailable" })
  }
}
