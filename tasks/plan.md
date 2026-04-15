# Implementation Plan: Nhanh.vn Additional Sync Modes

## Overview

Thêm 2 workflow đồng bộ mới từ Nhanh.vn vào admin UI:

1. **Create-only sync** — Kiểm tra categories/brands/products đã tồn tại chưa: nếu đã có thì **skip**, nếu chưa có thì **tạo mới**. Không update gì hết.
2. **Inventory-only sync** — Chỉ đồng bộ tồn kho (stocked_quantity) theo SKU từ Nhanh.vn. Không tạo mới hoặc update product/category/brand.

Workflow hiện tại (`sync-nhanh-products-workflow`) giữ nguyên: kiểm tra tồn tại → update nếu có, tạo nếu chưa có.

---

## Architecture Decisions

- **Tách riêng 2 workflow mới** thay vì dùng chung 1 workflow + mode flag, vì Medusa workflow đăng ký tên cố định và việc tách giúp step compensation rõ ràng hơn.
- **Tái sử dụng các step hiện có** (`syncInventoryLevelsStep`, `fetchAndProcessNhanhProductsStep`) trong các workflow mới.
- **Step mới `distributeMedusaProductsCreateOnlyStep`**: Biến thể của `distributeMedusaProductsStep` nhưng chỉ trả ra danh sách tạo mới, không trả update list.
- **Step mới `syncNhanhCategoriesCreateOnlyStep`**: Biến thể `syncNhanhCategoriesStep` bỏ qua `toUpdate`, chỉ chạy `toCreate`.
- **Step mới `syncNhanhBrandsCreateOnlyStep`**: Biến thể `syncNhanhBrandsStep` bỏ qua backfill external_id và không update.
- **API routes mới**: 2 endpoint POST dưới `/admin/nhanh-sync/`.
- **Admin UI**: Thêm 2 button vào trang hiện có (`src/admin/routes/nhanh-sync/page.tsx`), mỗi button có confirm dialog riêng.

---

## Dependency Graph

```
Nhanh.vn API (lib/nhanh.ts)
    │
    ├── syncNhanhCategoriesCreateOnlyStep  (new step)
    ├── syncNhanhBrandsCreateOnlyStep      (new step)
    │
    ├── fetchAndProcessNhanhProductsStep   (existing — reused)
    │       │
    │       ├── distributeMedusaProductsCreateOnlyStep (new step)
    │       │       └── createProductsWorkflow.runAsStep
    │       │               └── linkNewProductsBrandsStep (existing)
    │       │                   syncInventoryLevelsStep   (existing)
    │       │                   forceSetVariantThumbnailsStep (existing)
    │       │                   syncProductContentStep    (existing)
    │       │
    │       └── syncInventoryLevelsStep   (existing — reused in inventory-only workflow)
    │
    ├── syncNhanhCreateOnlyWorkflow         (new workflow)
    ├── syncNhanhInventoryOnlyWorkflow      (new workflow)
    │
    ├── POST /admin/nhanh-sync/create-only  (new API route)
    ├── POST /admin/nhanh-sync/inventory-only (new API route)
    │
    └── src/admin/routes/nhanh-sync/page.tsx  (updated UI)
```

---

## Task List

### Phase 1: Inventory-Only Workflow (Backend)

#### Task 1: `syncNhanhInventoryOnlyWorkflow`

**Description:** Tạo workflow chỉ sync tồn kho. Fetch danh sách sản phẩm từ Nhanh để lấy SKU→qty map, sau đó chạy `syncInventoryLevelsStep` hiện có. Không chạy bất kỳ step nào về category/brand/product.

**Acceptance criteria:**
- [ ] Workflow tên `sync-nhanh-inventory-only-workflow` được đăng ký.
- [ ] Chỉ fetch product list từ Nhanh (không cần `fetchNhanhProductDetail` per-item vì chỉ cần SKU và inventory).
- [ ] Gọi `syncInventoryLevelsStep` để cập nhật stocked_quantity.
- [ ] Không tạo/update sản phẩm, category, hay brand.

**Verification:**
- [ ] Build thành công: `npm run build`
- [ ] Gọi endpoint POST `/admin/nhanh-sync/inventory-only` trả về 200 với `success: true`.
- [ ] Kiểm tra DB: stocked_quantity được cập nhật đúng theo Nhanh, không có product/category mới.

**Dependencies:** None (reuses existing steps)

**Files likely touched:**
- `src/workflows/sync-nhanh-products.ts` — thêm workflow mới (hoặc tách sang file mới)

**Estimated scope:** Small

---

#### Task 2: API route `/admin/nhanh-sync/inventory-only`

**Description:** Thêm file route mới dưới `src/api/admin/nhanh-sync/inventory-only/route.ts` để xử lý POST request, gọi `syncNhanhInventoryOnlyWorkflow`.

**Acceptance criteria:**
- [ ] POST `/admin/nhanh-sync/inventory-only` trả về `{ success, message }`.
- [ ] Yêu cầu admin auth (kế thừa từ middleware `src/api/middlewares.ts`).
- [ ] Error được catch và trả 500 với message rõ ràng.

**Verification:**
- [ ] Build thành công.
- [ ] Curl/fetch từ admin session trả 200.

**Dependencies:** Task 1

**Files likely touched:**
- `src/api/admin/nhanh-sync/inventory-only/route.ts` (new)

**Estimated scope:** XS

---

### Checkpoint: After Tasks 1-2
- [ ] Build thành công.
- [ ] Inventory-only endpoint hoạt động.

---

### Phase 2: Create-Only Workflow (Backend)

#### Task 3: Create-only steps (categories và brands)

**Description:** Thêm 2 step mới:
- `syncNhanhCategoriesCreateOnlyStep` — giống `syncNhanhCategoriesStep` nhưng bỏ `toUpdate`, chỉ `toCreate`. Vẫn trả về `categoryMap` để các bước sau dùng.
- `syncNhanhBrandsCreateOnlyStep` — giống `syncNhanhBrandsStep` nhưng khi `matchedModel` tồn tại thì chỉ lấy id vào map, không gọi `updateBrands`.

**Acceptance criteria:**
- [ ] `syncNhanhCategoriesCreateOnlyStep`: categories đã tồn tại không bị update, category mới được tạo.
- [ ] `syncNhanhBrandsCreateOnlyStep`: brands đã tồn tại không bị gọi update, brand mới được tạo.
- [ ] Cả hai vẫn trả về đúng `categoryMap`/`brandMap` cho bước sau.

**Verification:**
- [ ] Build thành công.
- [ ] (Manual) Thêm 1 category trùng tên với Nhanh → không bị update sau sync.

**Dependencies:** None

**Files likely touched:**
- `src/workflows/sync-nhanh-products.ts`

**Estimated scope:** Small

---

#### Task 4: `distributeMedusaProductsCreateOnlyStep`

**Description:** Biến thể của `distributeMedusaProductsStep`: duyệt danh sách sản phẩm đã xử lý, **chỉ đưa vào `productsToCreate`** những sản phẩm chưa tồn tại trong Medusa (theo `external_id` hoặc SKU). Sản phẩm đã tồn tại bị bỏ qua hoàn toàn.

**Acceptance criteria:**
- [ ] Sản phẩm đã có trong DB (theo external_id hoặc SKU) → không nằm trong `productsToCreate`.
- [ ] Sản phẩm chưa có → nằm trong `productsToCreate`.
- [ ] Trả về `{ productsToCreate, brandLinks }` (không có `productsToUpdate`).

**Verification:**
- [ ] Build thành công.
- [ ] (Manual) Chạy sync sau khi đã có sản phẩm → sản phẩm đó không bị duplicate.

**Dependencies:** None

**Files likely touched:**
- `src/workflows/sync-nhanh-products.ts`

**Estimated scope:** Small

---

#### Task 5: `syncNhanhCreateOnlyWorkflow`

**Description:** Tạo workflow tên `sync-nhanh-create-only-workflow` kết hợp các step trên:
1. `syncNhanhCategoriesCreateOnlyStep`
2. `syncNhanhBrandsCreateOnlyStep`
3. `fetchAndProcessNhanhProductsStep` (existing)
4. `distributeMedusaProductsCreateOnlyStep` (Task 4)
5. `createProductsWorkflow.runAsStep` cho sản phẩm mới
6. `linkNewProductsBrandsStep` cho links của sản phẩm mới
7. `syncInventoryLevelsStep` cho tồn kho sản phẩm mới
8. `forceSetVariantThumbnailsStep` cho sản phẩm mới
9. `syncProductContentStep` cho sản phẩm mới
10. `syncCategoryContentStep` cho category mới

**Acceptance criteria:**
- [ ] Workflow được đăng ký đúng tên.
- [ ] Chỉ tạo mới, không update bất cứ product/category/brand nào đã tồn tại.
- [ ] Inventory, thumbnail, content được sync cho sản phẩm mới.

**Verification:**
- [ ] Build thành công.
- [ ] Gọi workflow → chỉ có sản phẩm mới được tạo.

**Dependencies:** Tasks 3, 4

**Files likely touched:**
- `src/workflows/sync-nhanh-products.ts`

**Estimated scope:** Small

---

#### Task 6: API route `/admin/nhanh-sync/create-only`

**Description:** Thêm file route POST `/admin/nhanh-sync/create-only` gọi `syncNhanhCreateOnlyWorkflow`.

**Acceptance criteria:**
- [ ] POST `/admin/nhanh-sync/create-only` trả về `{ success, message }`.
- [ ] Yêu cầu admin auth.
- [ ] Error được catch và trả 500.

**Verification:**
- [ ] Build thành công.
- [ ] Fetch từ admin session trả 200.

**Dependencies:** Task 5

**Files likely touched:**
- `src/api/admin/nhanh-sync/create-only/route.ts` (new)

**Estimated scope:** XS

---

### Checkpoint: After Tasks 3-6
- [ ] Build thành công.
- [ ] Cả 2 backend workflows hoạt động độc lập.
- [ ] Workflow gốc không bị thay đổi hành vi.

---

### Phase 3: Admin UI

#### Task 7: Thêm 2 nút sync vào trang Nhanh.vn Sync

**Description:** Cập nhật `src/admin/routes/nhanh-sync/page.tsx`:
- Thêm mutation `triggerCreateOnlySync` gọi POST `/admin/nhanh-sync/create-only`.
- Thêm mutation `triggerInventorySync` gọi POST `/admin/nhanh-sync/inventory-only`.
- Thêm 2 button mới với confirm dialog riêng.
- Log history hiển thị loại sync đã chạy.

**Acceptance criteria:**
- [ ] Button "Sync New Only" hiển thị với mô tả: "Chỉ tạo mới sản phẩm/danh mục/thương hiệu chưa có. Sản phẩm đã tồn tại sẽ bị bỏ qua."
- [ ] Button "Sync Inventory Only" với mô tả: "Chỉ cập nhật tồn kho. Không tạo mới hoặc cập nhật sản phẩm."
- [ ] Cả hai button có loading state khi đang chạy.
- [ ] Confirm dialog hiển thị mô tả rõ ràng trước khi chạy.
- [ ] Sync history phân biệt loại sync.

**Verification:**
- [ ] Admin UI build thành công (`npm run dev` không lỗi).
- [ ] Cả 3 button hoạt động độc lập (có thể click từng cái).
- [ ] History log hiển thị đúng loại và kết quả.

**Dependencies:** Tasks 2, 6

**Files likely touched:**
- `src/admin/routes/nhanh-sync/page.tsx`

**Estimated scope:** Small

---

### Checkpoint: Final
- [ ] `npm run build` thành công.
- [ ] Ba sync buttons hoạt động trên admin UI.
- [ ] Workflow gốc không bị ảnh hưởng.
- [ ] Inventory-only sync không tạo sản phẩm mới.
- [ ] Create-only sync không update sản phẩm đã tồn tại.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `fetchAndProcessNhanhProductsStep` gọi `fetchNhanhProductDetail` cho từng product (chậm) trong inventory-only workflow | Medium | Tạo step nhẹ hơn chỉ dùng list API (không gọi detail) để lấy SKU+inventory |
| Workflow naming conflict nếu server cache | Low | Đặt tên workflow unique, không đặt trùng tên existing |
| Create-only workflow vẫn sync content cho category mới nhưng không update content của category cũ | Low | Acceptable — đây là hành vi mong muốn |

---

## Open Questions

- ~~Với inventory-only workflow: list API có trả inventory không?~~
  **Đã xác nhận:** List API trả `inventory.available` cho variant items (children). Với standalone products (parentId=-1), workflow gốc dùng `detail.inventory?.available`. Để tránh N+1 API calls, inventory-only workflow sẽ dùng `allList` items trực tiếp (cả standalone lẫn variants) — standalone products trong list cũng được kỳ vọng có trường `inventory`. Nếu trường này thiếu, giá trị mặc định là 0 (an toàn).
