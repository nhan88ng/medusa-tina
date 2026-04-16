# Debug Plan: Region Detail Page Missing Payment Providers

## Overview

Trang danh sách Regions hiển thị đúng "Bank Transfer (BANK-TRANSFER), Cod (COD)" trong cột Payment Providers, nhưng khi click vào chi tiết region "Viet Nam" thì trường Payment Providers hiển thị "-".

Medusa version: **2.13.5**. Không có custom admin widget/route nào cho regions trong project này.

---

## Root Cause Hypothesis

Trong Medusa v2, các API endpoint trả về fields theo query parameter `fields`. Admin UI có thể fetch:

- **List view** (`GET /admin/regions`): request bao gồm `payment_providers` → hiển thị đúng
- **Detail view** (`GET /admin/regions/:id`): request **không** bao gồm `payment_providers` → trả về thiếu field → UI hiển thị "-"

Đây là pattern phổ biến trong Medusa v2 — relation phải được explicitly request, không tự động expand.

**Khả năng thay thế (xác suất thấp hơn):**
- Bug trong core Medusa admin UI (không fetch `payment_providers` cho detail)
- Payment provider chưa được link đúng với region ở DB level (nhưng list view hiển thị đúng → loại bỏ)

---

## Dependency Graph

```
Browser DevTools (Network tab)
    │
    ├── GET /admin/regions/:id → response body → confirm thiếu payment_providers?
    │
    └── GET /admin/regions/:id?fields=+payment_providers → response đầy đủ?
            │
            └── Add middleware GET /admin/regions/:id (validateAndTransformQuery)
                    │
                    └── src/api/middlewares.ts (fix)
```

---

## Task List

### Phase 1: Reproduce & Confirm

#### Task 1: Kiểm tra API response từ detail endpoint

**Description:** Dùng browser DevTools hoặc curl để gọi trực tiếp `GET /admin/regions/:id` và xem response body có chứa `payment_providers` không. Đây là bước xác nhận root cause trước khi code.

**Acceptance criteria:**
- [ ] Biết chính xác `GET /admin/regions/:id` (không có `fields` param) có trả `payment_providers` không
- [ ] Biết `GET /admin/regions/:id?fields=+payment_providers` có trả đủ không

**Verification:**
- [ ] Mở DevTools → Network tab → vào trang detail region → tìm request `/admin/regions/reg_...`
- [ ] Inspect response JSON: `region.payment_providers` có phải `[]` hay không có field?
- [ ] Thử thêm `?fields=+payment_providers` vào URL request và so sánh

**Dependencies:** None

**Files likely touched:** Không có (chỉ inspect)

**Estimated scope:** XS

---

#### Task 2: Xác nhận fields được request trong admin UI

**Description:** Trong DevTools Network tab, kiểm tra URL của request detail để xem admin UI đang request `fields` gì.

**Acceptance criteria:**
- [ ] Biết admin UI đang gửi `fields` param gì trong request detail (hoặc không gửi gì)
- [ ] So sánh với request list để thấy sự khác biệt

**Verification:**
- [ ] Network tab: tìm request `GET /admin/regions/reg_...` → Copy as cURL → xem query params
- [ ] Tương tự với request list `GET /admin/regions` → so sánh `fields`

**Dependencies:** None (chạy song song với Task 1)

**Files likely touched:** Không có (chỉ inspect)

**Estimated scope:** XS

---

### Checkpoint: After Tasks 1-2
- [ ] Đã xác nhận root cause: API thiếu `payment_providers` trong response detail
- [ ] Biết fix cần làm ở tầng middleware hay tầng khác

---

### Phase 2: Fix

#### Task 3: Thêm middleware GET /admin/regions/:id để inject payment_providers

**Description:** Thêm middleware `validateAndTransformQuery` cho `GET /admin/regions/:id` trong `src/api/middlewares.ts` — đưa `payment_providers` vào `defaults` để Medusa tự động include field này trong response detail.

**Acceptance criteria:**
- [ ] `GET /admin/regions/:id` trả về `payment_providers` trong response mà không cần client phải request
- [ ] Không ảnh hưởng đến các endpoint regions khác (POST, list)
- [ ] Admin UI detail page hiển thị đúng payment providers

**Verification:**
- [ ] `npm run build` thành công
- [ ] Curl `GET /admin/regions/:id` → response body có `payment_providers` array
- [ ] Mở admin UI → Region detail → thấy "Bank Transfer" và "COD" thay vì "-"

**Dependencies:** Tasks 1–2 (cần confirm root cause trước)

**Files likely touched:**
- `src/api/middlewares.ts`

**Estimated scope:** XS

---

#### Task 4: (Nếu middleware không đủ) Custom admin route override region detail

**Description:** Nếu middleware approach không hoạt động (do admin UI không đọc field từ response mà render từ local state), tạo một custom Medusa admin route `src/admin/routes/regions/[id]/page.tsx` để override trang detail, fetch đúng fields và render payment providers.

**Acceptance criteria:**
- [ ] Trang `/app/regions/:id` trong admin UI hiển thị payment providers từ API
- [ ] UI giống style Medusa admin native (dùng `@medusajs/ui` components)

**Verification:**
- [ ] Admin UI hiển thị đúng payment providers trong detail page
- [ ] Không có JS errors trong console

**Dependencies:** Tasks 1–2; chỉ làm nếu Task 3 không đủ

**Files likely touched:**
- `src/admin/routes/regions/[id]/page.tsx` (new)

**Estimated scope:** Medium

---

### Checkpoint: Final
- [ ] `npm run build` thành công
- [ ] Admin UI: region detail hiển thị đúng payment providers
- [ ] Admin UI: region list không bị ảnh hưởng

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Middleware approach không work vì Medusa admin UI render từ cache/state, không re-fetch | Medium | Fallback sang Task 4 (custom admin route) |
| Custom route override conflict với core admin UI routing | Low | Test kỹ sau khi thêm; Medusa admin route override theo file-based priority |
| `createFindParams` schema không cho phép `payment_providers` là valid field | Low | Dùng `allowedRelations` hoặc dùng raw `additionalFields` config |

---

## Open Questions

- **Task 1/2 cần làm manual**: Cần inspect DevTools để xác nhận exact root cause trước khi code Task 3.
- Nếu `payment_providers` có trong response nhưng UI vẫn hiển thị "-" → bug nằm ở admin UI rendering, không phải API → Task 4 là con đường đúng.
