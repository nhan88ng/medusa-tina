# Plan: Nhanh.vn Order Push

> Feature #1 trong SPEC.md Future Scope. Push Medusa orders sang Nhanh.vn POS sau khi đặt hàng.

---

## Overview

Khi khách đặt hàng trên storefront, Medusa fire `order.placed` → subscriber gọi workflow push sang Nhanh qua `POST /v3.0/order/add`. Medusa **không sync status ngược** — sau khi push, Nhanh là source-of-truth cho lifecycle đơn hàng.

## Architecture Decisions

1. **Idempotency:** Medusa order ID = Nhanh `appOrderId` (Nhanh dedupe theo `appId + appOrderId`).
2. **Metadata persistence:** lưu kết quả trên `order.metadata.nhanh_*`:
   - `nhanh_order_id` (int)
   - `nhanh_tracking_url` (string)
   - `nhanh_push_status` (`pending` | `success` | `failed`)
   - `nhanh_pushed_at` (ISO)
   - `nhanh_error` (string, nếu failed)
   - `nhanh_carrier_override` (object, optional — admin đổi carrier khi retry)
3. **Tách subscriber riêng** — không trộn với `order-placed.ts` (email). Email fail không ảnh hưởng Nhanh push, và ngược lại.
4. **Workflow-based:** `push-nhanh-order` — idempotent, skip nếu `nhanh_order_id` đã có.
5. **Address:** migrate `/store/vn-address/*` sang Nhanh's `/v3.0/shipping/location` endpoint, dùng **v1 (3-tier)**. Storefront phải collect `nhanh_city_id`, `nhanh_district_id`, `nhanh_ward_id` và lưu vào `shipping_address.metadata`.
6. **Variant → Nhanh product ID:** extend `sync-nhanh-products.ts` để lưu `nhanh_id` lên mỗi variant metadata.
7. **Carrier:** default từ env (NHANH_DEFAULT_CARRIER_ID, NHANH_DEFAULT_SERVICE_ID, NHANH_SEND_CARRIER_TYPE). Admin có thể override per-order khi retry.
8. **Payment object:** gửi rỗng (theo Q5). Mọi thứ payment do Nhanh + nhân viên xử lý sau khi push.
9. **No sync back:** scope **không bao gồm** edit/cancel/status update. Nếu cần sau này, add feature riêng.

---

## Phase 1: Address migration (Nhanh location API)

### Task 1: Add Nhanh location fetcher to lib

**Description:** Thêm `fetchNhanhLocations(type, parentId?, version)` vào `src/lib/nhanh.ts`. Wrap `POST /v3.0/shipping/location`.

**Acceptance:**
- [x] Function signature: `fetchNhanhLocations(type: "CITY"|"DISTRICT"|"WARD", parentId?: number, version?: "v1"|"v2"): Promise<Array<{id, name, otherName?}>>`
- [x] Default version = `v1`
- [x] Throws on `code !== 1`, logs raw response

**Verification:** Unit test với mocked fetch
**Files:** `src/lib/nhanh.ts`, `src/lib/__tests__/nhanh.test.ts`
**Scope:** S

---

### Task 2: Rewrite `/store/vn-address/*` routes

**Description:** Rewrite 2 routes hiện có + thêm 1 route mới cho v1 3-tier. Cache response in-memory 24h (Nhanh data gần như tĩnh).

**Acceptance:**
- [x] `GET /store/vn-address/provinces` → `[{id, name}]` từ Nhanh CITY
- [x] `GET /store/vn-address/districts?provinceId={id}` → Nhanh DISTRICT — **route MỚI**
- [x] `GET /store/vn-address/wards?districtId={id}` → Nhanh WARD (v1)
- [x] In-memory cache với TTL 24h (không cần Redis)
- [x] Return 400 nếu thiếu param bắt buộc

**Verification:** HTTP integration test — cache hit không gọi lại Nhanh API

**Files:** `src/api/store/vn-address/{provinces,districts,wards}/route.ts`, `src/api/store/vn-address/cache.ts`
**Scope:** M
**Deps:** Task 1

---

### Task 3: Update STOREFRONT_INTEGRATION.md

**Description:** Document 3 vn-address routes mới (schema, params). Note breaking change: cũ 2-tier, giờ 3-tier.

**AC:** Docs mô tả đủ request/response, có ví dụ
**Files:** `STOREFRONT_INTEGRATION.md`
**Scope:** XS
**Deps:** Task 2

---

### Checkpoint: Phase 1
- [x] Storefront có thể render province → district → ward dropdown
- [x] Cache hoạt động (log confirm)

---

## Phase 2: Variant ↔ Nhanh product ID mapping

### Task 4: Store `nhanh_id` on variants during product sync

**Description:** Sửa `sync-nhanh-products.ts` để khi tạo/update variants, lưu `nhanh_id` = Nhanh child's `id` (hoặc standalone product id) vào variant metadata.

**AC:**
- [x] Standalone product: single variant có `metadata.nhanh_id` = product.id
- [x] Product có variants: mỗi variant có `metadata.nhanh_id` = child's id
- [x] Backfill: re-run `npm run seed:vn` hoặc admin re-sync điền nhanh_id cho variants hiện có
- [x] Helper `getNhanhProductIdFromVariant(variant): number | null` dùng bởi Phase 3

**Verification:** Integration test — sync rồi assert mọi variant có metadata.nhanh_id
**Files:** `src/workflows/sync-nhanh-products.ts`, `src/lib/nhanh.ts`
**Scope:** M
**Deps:** none

---

### Checkpoint: Phase 2
- [x] Chạy sync → 100% variants có `nhanh_id` trong metadata
- [x] Helper trả đúng ID cho mọi variant

---

## Phase 3: Order push flow

### Task 5: Lib function `pushNhanhOrder`

**Description:** Wrap `POST /v3.0/order/add`. Return `{id, trackingUrl}`.

**AC:**
- [x] Function signature: `pushNhanhOrder(payload): Promise<{id: number, trackingUrl: string}>`
- [x] Throw `NhanhApiError` (custom class) với raw response khi `code !== 1`
- [x] Timeout 30s

**Verification:** Unit test với mocked fetch (happy + error paths)
**Files:** `src/lib/nhanh.ts`, `src/lib/__tests__/nhanh-push-order.test.ts`
**Scope:** S

---

### Task 6: Payload builder

**Description:** Pure function map Medusa order → Nhanh order payload. Extract sang helper riêng để unit test dễ.

**AC:**
- [x] Function `buildNhanhOrderPayload(order, opts?: { carrierOverride? }): NhanhOrderPayload`
- [x] Required fields: `info`, `channel.appOrderId = order.id`, `shippingAddress.{name, mobile, cityId, districtId, wardId}`, `carrier.*` từ env, `products[]`
- [x] Mỗi line item: `{id: variant.metadata.nhanh_id, price, quantity}`; throw nếu thiếu nhanh_id
- [x] Address lấy từ `shipping_address.metadata.nhanh_{city,district,ward}_id` (storefront phải set)
- [x] `payment` = `{}` (empty per Q5)
- [x] `locationVersion = "v1"`

**Verification:** Unit test — build từ fixture order, assert payload structure
**Files:** `src/lib/nhanh-order-builder.ts`, `src/lib/__tests__/nhanh-order-builder.test.ts`
**Scope:** M
**Deps:** Task 4 (nhanh_id on variants)

---

### Task 7: Workflow `push-nhanh-order`

**Description:** 4 steps:
1. `loadOrderStep` — query order với full relations (items, variants, shipping_address)
2. `checkIdempotencyStep` — nếu `order.metadata.nhanh_order_id` đã có → skip
3. `buildAndPushStep` — gọi `buildNhanhOrderPayload` + `pushNhanhOrder`
4. `persistResultStep` — update `order.metadata.nhanh_*`

**AC:**
- [x] Workflow ở `src/workflows/push-nhanh-order.ts`
- [x] Idempotent (skip nếu đã push)
- [x] On failure: persist `nhanh_push_status = failed`, `nhanh_error = message`, KHÔNG throw (để subscriber không crash)
- [x] Accept optional `carrierOverride` input để retry với carrier khác

**Verification:** Module integration test — mock lib, verify metadata được set đúng
**Files:** `src/workflows/push-nhanh-order.ts`, `integration-tests/modules/push-nhanh-order.spec.ts`
**Scope:** M
**Deps:** Tasks 5, 6

---

### Task 8: Subscriber `order-placed-nhanh-push.ts`

**Description:** Listen `order.placed`, gọi workflow `push-nhanh-order`. Try/catch toàn bộ.

**AC:**
- [x] File `src/subscribers/order-placed-nhanh-push.ts`
- [x] Không throw (độc lập với `order-placed.ts` email subscriber)
- [x] Log success/fail với order ID

**Verification:** HTTP integration test — POST /store/... tạo order, assert `order.metadata.nhanh_order_id` được set (mock Nhanh)
**Files:** `src/subscribers/order-placed-nhanh-push.ts`, `integration-tests/http/order-placed-nhanh.spec.ts`
**Scope:** S
**Deps:** Task 7

---

### Checkpoint: Phase 3
- [ ] Test end-to-end với Nhanh staging/sandbox (nếu có) hoặc real với 1 order test
- [ ] Verify: order tạo → metadata.nhanh_order_id có giá trị → trackingUrl mở được

---

## Phase 4: Admin UI (retry + override)

### Task 9: Admin API `POST /admin/orders/:id/nhanh-push`

**Description:** Endpoint manual push/retry. Body optional: `{ carrierOverride: {...} }`.

**AC:**
- [x] Admin auth required
- [x] Validate body với Zod
- [x] Gọi workflow `push-nhanh-order` với `carrierOverride`
- [x] Return `{success, nhanh_order_id?, error?}`

**Files:** `src/api/admin/orders/[id]/nhanh-push/route.ts`, `src/api/admin/orders/[id]/nhanh-push/validators.ts`
**Scope:** S
**Deps:** Task 7

---

### Task 10: Order detail widget

**Description:** React widget injected vào admin order detail. Hiển thị Nhanh push state, nút retry.

**AC:**
- [x] Widget ở `src/admin/widgets/order-nhanh-push.tsx`
- [x] Hiện trạng: push_status, nhanh_order_id, trackingUrl (link ngoài), pushed_at, error (nếu có)
- [x] Nút "Retry push" gọi API Task 9
- [x] Dropdown carrier optional (list carriers từ env config hoặc hard-coded common: SPX, GHTK, Viettel, ...)
- [x] Tiếng Anh (admin UI English only)

**Verification:** Manual browser test — tạo order fail → widget hiện error → click retry → success
**Files:** `src/admin/widgets/order-nhanh-push.tsx`
**Scope:** M
**Deps:** Task 9

---

### Checkpoint: Phase 4
- [ ] Admin flow: order placed fail → widget hiện red status → retry → success
- [ ] Admin flow: retry với carrier khác hoạt động

---

## Phase 5: Configuration & docs

### Task 11: Env vars + `.env.example`

**Description:** Thêm vars cần thiết.

**AC:**
- [x] `.env.example` có:
  - `NHANH_DEFAULT_CARRIER_ID` (vd: SPX)
  - `NHANH_DEFAULT_SERVICE_ID`
  - (sendCarrierType và autoSend hard-coded = 1 trong code; không cần env)
- [ ] README section giải thích cách lấy carrier ID + service ID từ Nhanh admin

**Files:** `.env.example`, `README.md`
**Scope:** XS

---

### Task 12: Update CLAUDE.md

**Description:** Update mục Nhanh.vn Integration: đã có order push (1 chiều).

**AC:** ✅ Mô tả flow + metadata keys
**Files:** `CLAUDE.md`
**Scope:** XS

---

### Checkpoint: Done
- [ ] Tất cả tests pass
- [ ] Build clean
- [ ] 1 real order từ storefront test → Nhanh admin thấy order

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Address data Nhanh thay đổi sau cache → push fail với "invalid wardId" | Med | TTL 24h, admin có thể invalidate cache qua endpoint |
| Variant không có nhanh_id (chưa re-sync) → build payload throw | High | Task 4 include backfill; subscriber catch error, persist `nhanh_push_status=failed` |
| Nhanh API down / timeout → order lost | High | Metadata flag `failed`; admin retry UI (Task 10) |
| Default carrier không cover địa chỉ → Nhanh reject | Med | Admin override khi retry (Task 9, 10) |
| Duplicate push (subscriber chạy 2 lần) | Low | Nhanh dedupe `appId + appOrderId` + Task 7 idempotency check |
| Storefront không set `shipping_address.metadata.nhanh_*_id` | High | Payload builder throw rõ ràng; document trong STOREFRONT_INTEGRATION.md |

---

## Confirmed Decisions

- **`sendCarrierType = 1`** — dùng bảng giá có sẵn của Nhanh.vn. Env chỉ cần `NHANH_DEFAULT_CARRIER_ID` + `NHANH_DEFAULT_SERVICE_ID` (không cần serviceCode/accountId).
- **`autoSend = 1`** — auto gửi sang carrier ngay khi push.
- **Order status khi push = "Mới" (`info.status = 54`)** — nhân viên sẽ kiểm tra và gọi xác nhận/đối soát chuyển khoản sau.

---

## Out of Scope (feature khác nếu cần sau)

- Sync status từ Nhanh về Medusa
- Push order edit khi Medusa order thay đổi
- Push order cancel khi Medusa order cancelled
- Cancel carrier shipment qua `/order/cancelcarrier`
- Payment sync (depositAmount/transferAmount)
- Webhook nhận từ Nhanh
