import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { fetchNhanhLocations } from "../../../../lib/nhanh"
import { cacheGet, cacheSet } from "../cache"

const CACHE_KEY = "nhanh:locations:cities"

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const cached = cacheGet<{ id: number; name: string }[]>(CACHE_KEY)
  if (cached) {
    return res.json({ provinces: cached })
  }

  try {
    const items = await fetchNhanhLocations("CITY")
    const provinces = items.map(({ id, name }) => ({ id, name }))
    cacheSet(CACHE_KEY, provinces)
    console.log(`[vn-address] Fetched ${provinces.length} provinces from Nhanh, cached 24h`)
    return res.json({ provinces })
  } catch (err: any) {
    console.error("[vn-address] Failed to fetch provinces from Nhanh:", err?.message)
    return res.status(503).json({ message: "Address service temporarily unavailable" })
  }
}
