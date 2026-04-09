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
        "Authorization": accessToken,
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
