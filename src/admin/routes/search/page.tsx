import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MagnifyingGlass } from "@medusajs/icons"
import { Container, Text, Button, toast } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../lib/client"

type StatsResponse = {
  stats: {
    numberOfDocuments: number
    isIndexing: boolean
    lastUpdate?: string
  } | null
}

type SyncResponse = {
  success: boolean
  indexed_count: number
  message: string
}

const SearchPage = () => {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["meilisearch-stats"],
    queryFn: () =>
      sdk.client.fetch<StatsResponse>("/admin/meilisearch/sync"),
    refetchInterval: 10000,
  })

  const { mutate: syncAll, isPending: isSyncing } = useMutation({
    mutationFn: () =>
      sdk.client.fetch<SyncResponse>("/admin/meilisearch/sync", {
        method: "POST",
      }),
    onSuccess: (result) => {
      toast.success(result.message)
      queryClient.invalidateQueries({ queryKey: ["meilisearch-stats"] })
    },
    onError: () => toast.error("Đồng bộ thất bại. Kiểm tra kết nối MeiliSearch."),
  })

  const stats = data?.stats

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <Text className="text-xl font-semibold">MeiliSearch</Text>
        <Text className="text-ui-fg-subtle text-sm mt-1">
          Quản lý chỉ mục tìm kiếm sản phẩm
        </Text>
      </div>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Text weight="plus">Trạng thái chỉ mục</Text>
        </div>
        <div className="px-6 py-4 grid grid-cols-3 gap-6">
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Sản phẩm đã index
            </Text>
            <Text className="text-2xl font-bold mt-1">
              {isLoading ? "—" : (stats?.numberOfDocuments ?? 0).toLocaleString("vi-VN")}
            </Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Trạng thái
            </Text>
            <Text className="mt-1 font-medium">
              {isLoading
                ? "Đang tải..."
                : stats
                ? stats.isIndexing
                  ? "⏳ Đang indexing..."
                  : "✅ Sẵn sàng"
                : "❌ Không kết nối được"}
            </Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Cập nhật lần cuối
            </Text>
            <Text className="mt-1">
              {stats?.lastUpdate
                ? new Date(stats.lastUpdate).toLocaleString("vi-VN")
                : "—"}
            </Text>
          </div>
        </div>
        <div className="px-6 py-4">
          <Button
            variant="secondary"
            size="small"
            isLoading={isSyncing}
            onClick={() => syncAll()}
          >
            Đồng bộ lại toàn bộ sản phẩm
          </Button>
          <Text size="xsmall" className="text-ui-fg-muted mt-2">
            Sản phẩm mới/cập nhật được tự động sync. Dùng nút này khi cần re-index toàn bộ.
          </Text>
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Tìm kiếm",
  icon: MagnifyingGlass,
})

export default SearchPage
