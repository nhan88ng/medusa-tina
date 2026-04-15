# Todo: Nhanh.vn Additional Sync Modes

## Phase 1: Inventory-Only Workflow

- [ ] Task 1: Tạo `syncNhanhInventoryOnlyWorkflow` trong `sync-nhanh-products.ts`
- [ ] Task 2: Tạo API route `src/api/admin/nhanh-sync/inventory-only/route.ts`

### Checkpoint Phase 1
- [ ] Build thành công, endpoint `/admin/nhanh-sync/inventory-only` hoạt động

## Phase 2: Create-Only Workflow

- [ ] Task 3: Tạo `syncNhanhCategoriesCreateOnlyStep` và `syncNhanhBrandsCreateOnlyStep`
- [ ] Task 4: Tạo `distributeMedusaProductsCreateOnlyStep`
- [ ] Task 5: Tạo `syncNhanhCreateOnlyWorkflow`
- [ ] Task 6: Tạo API route `src/api/admin/nhanh-sync/create-only/route.ts`

### Checkpoint Phase 2
- [ ] Build thành công, cả 2 backend workflows hoạt động độc lập

## Phase 3: Admin UI

- [ ] Task 7: Thêm "Sync New Only" và "Sync Inventory Only" buttons vào `page.tsx`

### Checkpoint Final
- [ ] Build thành công (`npm run build`)
- [ ] Ba buttons hoạt động trên admin UI
- [ ] Workflow gốc không bị ảnh hưởng
