export const NHANH_API_BASE = "https://pos.open.nhanh.vn/v3.0";

function getCredentials() {
  return {
    appId: process.env.NHANH_APP_ID,
    businessId: process.env.NHANH_BUSINESS_ID,
    accessToken: process.env.NHANH_ACCESS_TOKEN,
  };
}

export async function fetchNhanhProductList() {
  const { appId, businessId, accessToken } = getCredentials();
  if (!appId || !businessId || !accessToken) {
    throw new Error("Missing Nhanh.vn credentials in environment variables.");
  }

  let allProducts: any[] = [];
  let nextToken: string | null = null;
  let pageCount = 1;

  try {
    do {
      console.log(`[Nhanh.vn] Fetching product list page ${pageCount}...`);
      
      const payload: any = {
        paginator: { size: 100 }
      };
      
      if (nextToken) {
        payload.paginator.next = nextToken;
      }

      const response = await fetch(`${NHANH_API_BASE}/product/list?appId=${appId}&businessId=${businessId}`, {
        method: "POST",
        headers: {
          "Authorization": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      
      if (json.code === 1 && json.data) {
        allProducts = allProducts.concat(json.data);
        nextToken = json.paginator?.next || null;
        pageCount++;
      } else {
        console.error("[Nhanh.vn] API Error during list fetch:", json);
        break;
      }
    } while (nextToken);

    console.log(`[Nhanh.vn] Successfully fetched ${allProducts.length} total products from list API.`);
    return allProducts;
  } catch (error) {
    console.error("[Nhanh.vn] Network Error during list fetch:", error);
    throw error;
  }
}

export async function fetchNhanhProductDetail(productId: string | number) {
  const { appId, businessId, accessToken } = getCredentials();

  try {
    const response = await fetch(`${NHANH_API_BASE}/product/detail?appId=${appId}&businessId=${businessId}`, {
      method: "POST",
      headers: {
        "Authorization": accessToken ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: { id: String(productId) }
      }),
    });

    const json = await response.json();
    if (json.code === 1 && json.data) {
      return json.data;
    }
    
    // In case product doesn't exist or error (e.g. 404 for sub-variants sometimes)
    console.warn(`[Nhanh.vn] Could not fetch detail for product ${productId}:`, json.messages);
    return null;
  } catch (error) {
    console.error(`[Nhanh.vn] Network Error fetching detail for product ${productId}:`, error);
    return null;
  }
}

export async function fetchNhanhCategories() {
  const { appId, businessId, accessToken } = getCredentials();
  try {
    const response = await fetch(`${NHANH_API_BASE}/product/category?appId=${appId}&businessId=${businessId}`, {
      method: "POST",
      headers: { "Authorization": accessToken ?? "", "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await response.json();
    return json.code === 1 ? json.data : [];
  } catch (err) {
    console.error("[Nhanh.vn] Error fetching categories:", err);
    return [];
  }
}

// ─── Location API ──────────────────────────────────────────────────────────

export type NhanhLocationType = "CITY" | "DISTRICT" | "WARD"

export interface NhanhLocation {
  id: number
  name: string
  otherName?: string
}

export class NhanhApiError extends Error {
  constructor(
    message: string,
    public readonly raw: unknown
  ) {
    super(message)
    this.name = "NhanhApiError"
  }
}

/**
 * Fetch Nhanh.vn location list.
 *
 * @param type    - "CITY" (provinces), "DISTRICT", or "WARD"
 * @param parentId - Nhanh ID of the parent: district ID for wards, province ID for districts. Omit for cities.
 * @param version  - "v1" (3-tier, default) or "v2" (2-tier legacy)
 */
export async function fetchNhanhLocations(
  type: NhanhLocationType,
  parentId?: number,
  version: "v1" | "v2" = "v1"
): Promise<NhanhLocation[]> {
  const { appId, businessId, accessToken } = getCredentials()
  if (!appId || !businessId || !accessToken) {
    throw new Error("Missing Nhanh.vn credentials in environment variables.")
  }

  const body: Record<string, unknown> = { type, version }
  if (parentId !== undefined) {
    body.parentId = parentId
  }

  const response = await fetch(
    `${NHANH_API_BASE}/shipping/location?appId=${appId}&businessId=${businessId}`,
    {
      method: "POST",
      headers: {
        Authorization: accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: body }),
    }
  )

  const json = await response.json()

  if (json.code !== 1) {
    console.error("[Nhanh.vn] fetchNhanhLocations error:", json)
    throw new NhanhApiError(
      `Nhanh location API error (type=${type}): ${JSON.stringify(json.messages ?? json)}`,
      json
    )
  }

  // API returns an array directly in json.data
  const items: Array<{ id: number; name: string; otherName?: string }> = json.data ?? []
  return items
}

// ─── Order push API ────────────────────────────────────────────────────────

export interface NhanhOrderProduct {
  id: number
  price: number
  quantity: number
}

export interface NhanhOrderPayload {
  info?: {
    status?: number
    [key: string]: unknown
  }
  channel?: {
    appOrderId?: string
    [key: string]: unknown
  }
  shippingAddress?: {
    name?: string
    mobile?: string
    cityId?: number
    districtId?: number
    wardId?: number
    [key: string]: unknown
  }
  carrier?: {
    carrierId?: string | number
    serviceId?: string | number
    sendCarrierType?: number
    autoSend?: number
    [key: string]: unknown
  }
  products?: NhanhOrderProduct[]
  payment?: Record<string, unknown>
  locationVersion?: string
  [key: string]: unknown
}

export interface NhanhPushOrderResult {
  id: number
  trackingUrl: string
}

/**
 * Push a new order to Nhanh.vn via POST /v3.0/order/add.
 * Throws NhanhApiError when the API responds with code !== 1.
 * Enforces a 30-second timeout.
 */
export async function pushNhanhOrder(payload: NhanhOrderPayload): Promise<NhanhPushOrderResult> {
  const { appId, businessId, accessToken } = getCredentials()
  if (!appId || !businessId || !accessToken) {
    throw new Error("Missing Nhanh.vn credentials in environment variables.")
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)

  let json: any
  try {
    const response = await fetch(
      `${NHANH_API_BASE}/order/add?appId=${appId}&businessId=${businessId}`,
      {
        method: "POST",
        headers: {
          Authorization: accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: payload }),
        signal: controller.signal,
      }
    )
    json = await response.json()
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === "AbortError") {
      throw new NhanhApiError("Nhanh order/add request timed out after 30s", null)
    }
    throw err
  }
  clearTimeout(timeoutId)

  if (json.code !== 1) {
    console.error("[Nhanh.vn] pushNhanhOrder error:", json)
    throw new NhanhApiError(
      `Nhanh order/add API error: ${JSON.stringify(json.messages ?? json)}`,
      json
    )
  }

  return {
    id: Number(json.data?.id ?? json.data?.orderId),
    trackingUrl: String(json.data?.trackingUrl ?? ""),
  }
}

// ─── Variant helpers ───────────────────────────────────────────────────────

/**
 * Extracts the Nhanh product / variant integer ID from a Medusa variant.
 *
 * Returns `null` if `metadata.nhanh_id` is missing or not a valid integer —
 * callers should treat `null` as "variant not synced yet, cannot push order".
 */
export function getNhanhProductIdFromVariant(
  variant: { metadata?: Record<string, unknown> | null }
): number | null {
  const raw = variant?.metadata?.nhanh_id
  if (raw == null) return null
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

// ─── Brand API ─────────────────────────────────────────────────────────────

export async function fetchNhanhBrands() {
  const { appId, businessId, accessToken } = getCredentials();
  try {
    const response = await fetch(`${NHANH_API_BASE}/product/brand?appId=${appId}&businessId=${businessId}`, {
      method: "POST",
      headers: { "Authorization": accessToken ?? "", "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await response.json();
    return json.code === 1 ? json.data : [];
  } catch (err) {
    console.error("[Nhanh.vn] Error fetching brands:", err);
    return [];
  }
}
