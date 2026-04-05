import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MagnifyingGlass } from "@medusajs/icons"
import { Container, Text, Button, toast, usePrompt } from "@medusajs/ui"
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
  const prompt = usePrompt()

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
    onError: () => toast.error("Sync failed. Check MeiliSearch connection."),
  })

  const { mutate: resetIndex, isPending: isResetting } = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/meilisearch/reset", { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Index deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["meilisearch-stats"] })
    },
    onError: () => toast.error("Failed to delete index."),
  })

  const handleReset = async () => {
    const confirmed = await prompt({
      title: "Delete MeiliSearch index?",
      description: "All data in the index will be removed. You will need to sync again afterwards.",
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (confirmed) resetIndex()
  }

  const stats = data?.stats

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <Text className="text-xl font-semibold">MeiliSearch</Text>
        <Text className="text-ui-fg-subtle text-sm mt-1">
          Manage product search index
        </Text>
      </div>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Text weight="plus">Index Status</Text>
        </div>
        <div className="px-6 py-4 grid grid-cols-3 gap-6">
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Indexed products
            </Text>
            <Text className="text-2xl font-bold mt-1">
              {isLoading ? "—" : (stats?.numberOfDocuments ?? 0).toLocaleString()}
            </Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Status
            </Text>
            <Text className="mt-1 font-medium">
              {isLoading
                ? "Loading..."
                : stats
                ? stats.isIndexing
                  ? "⏳ Indexing..."
                  : "✅ Ready"
                : "❌ Disconnected"}
            </Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Last updated
            </Text>
            <Text className="mt-1">
              {stats?.lastUpdate
                ? new Date(stats.lastUpdate).toLocaleString()
                : "—"}
            </Text>
          </div>
        </div>
        <div className="px-6 py-4 flex flex-col gap-4">
          <div>
            <Button
              variant="secondary"
              size="small"
              isLoading={isSyncing}
              onClick={() => syncAll()}
            >
              Re-sync all products
            </Button>
            <Text size="xsmall" className="text-ui-fg-muted mt-2">
              New/updated products are synced automatically. Use this to force a full re-index.
            </Text>
          </div>
          <div>
            <Button
              variant="danger"
              size="small"
              isLoading={isResetting}
              onClick={handleReset}
            >
              Delete index
            </Button>
            <Text size="xsmall" className="text-ui-fg-muted mt-2">
              Removes all data from the index. Re-sync after deleting.
            </Text>
          </div>
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Search",
  icon: MagnifyingGlass,
})

export default SearchPage
