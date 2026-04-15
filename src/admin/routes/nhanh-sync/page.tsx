import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowPathMini } from "@medusajs/icons"
import { Container, Text, Button, toast, usePrompt } from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/client"

type SyncLog = {
  timestamp: string
  success: boolean
  message: string
  type: "full" | "create-only" | "inventory-only"
}

const SYNC_TYPE_LABEL: Record<SyncLog["type"], string> = {
  "full": "Full Sync",
  "create-only": "Create Only",
  "inventory-only": "Inventory Only",
}

const NhanhSyncPage = () => {
  const prompt = usePrompt()
  const [logs, setLogs] = useState<SyncLog[]>([])

  const addLog = (type: SyncLog["type"], success: boolean, message: string) =>
    setLogs((prev) => [
      { timestamp: new Date().toLocaleString(), success, message, type },
      ...prev,
    ])

  const { mutate: triggerSync, isPending } = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ success: boolean; message: string }>(
        "/admin/nhanh-sync",
        { method: "POST" }
      ),
    onSuccess: (result) => {
      toast.success(result.message || "Sync completed")
      addLog("full", true, result.message || "Sync completed successfully")
    },
    onError: (error: any) => {
      const msg = error?.message || "Sync failed"
      toast.error(msg)
      addLog("full", false, msg)
    },
  })

  const { mutate: triggerCreateOnly, isPending: isCreateOnlyPending } = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ success: boolean; message: string }>(
        "/admin/nhanh-sync/create-only",
        { method: "POST" }
      ),
    onSuccess: (result) => {
      toast.success(result.message || "Create-only sync completed")
      addLog("create-only", true, result.message || "Create-only sync completed successfully")
    },
    onError: (error: any) => {
      const msg = error?.message || "Create-only sync failed"
      toast.error(msg)
      addLog("create-only", false, msg)
    },
  })

  const { mutate: triggerInventoryOnly, isPending: isInventoryOnlyPending } = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ success: boolean; message: string }>(
        "/admin/nhanh-sync/inventory-only",
        { method: "POST" }
      ),
    onSuccess: (result) => {
      toast.success(result.message || "Inventory sync completed")
      addLog("inventory-only", true, result.message || "Inventory sync completed successfully")
    },
    onError: (error: any) => {
      const msg = error?.message || "Inventory sync failed"
      toast.error(msg)
      addLog("inventory-only", false, msg)
    },
  })

  const handleSync = async () => {
    const confirmed = await prompt({
      title: "Sync products from Nhanh.vn?",
      description:
        "This will fetch all products from Nhanh.vn and sync them with your store. Existing products will be updated, new products will be created.",
      confirmText: "Start Sync",
      cancelText: "Cancel",
    })
    if (confirmed) triggerSync()
  }

  const handleCreateOnly = async () => {
    const confirmed = await prompt({
      title: "Sync new products only?",
      description:
        "Only new products, categories, and brands will be created. Existing ones will be skipped — nothing will be updated.",
      confirmText: "Sync New Only",
      cancelText: "Cancel",
    })
    if (confirmed) triggerCreateOnly()
  }

  const handleInventoryOnly = async () => {
    const confirmed = await prompt({
      title: "Sync inventory only?",
      description:
        "Only stock quantities will be updated from Nhanh.vn. No products, categories, or brands will be created or modified.",
      confirmText: "Sync Inventory",
      cancelText: "Cancel",
    })
    if (confirmed) triggerInventoryOnly()
  }

  const anyPending = isPending || isCreateOnlyPending || isInventoryOnlyPending

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <Text className="text-xl font-semibold">Nhanh.vn Sync</Text>
        <Text className="text-ui-fg-subtle text-sm mt-1">
          Sync products, categories, and brands from Nhanh.vn
        </Text>
      </div>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Text weight="plus">Sync Actions</Text>
        </div>
        <div className="px-6 py-4 flex flex-col gap-4">
          <div>
            <Button
              variant="secondary"
              size="small"
              isLoading={isPending}
              disabled={anyPending && !isPending}
              onClick={handleSync}
            >
              {isPending ? "Syncing..." : "Sync Now"}
            </Button>
            <Text size="xsmall" className="text-ui-fg-muted mt-2">
              Fetches products from Nhanh.vn and syncs categories, brands,
              products, variants, images, and inventory.
            </Text>
          </div>
          <div>
            <Button
              variant="secondary"
              size="small"
              isLoading={isCreateOnlyPending}
              disabled={anyPending && !isCreateOnlyPending}
              onClick={handleCreateOnly}
            >
              {isCreateOnlyPending ? "Syncing..." : "Sync New Only"}
            </Button>
            <Text size="xsmall" className="text-ui-fg-muted mt-2">
              Creates new products, categories, and brands from Nhanh.vn.
              Existing ones are skipped — nothing is updated.
            </Text>
          </div>
          <div>
            <Button
              variant="secondary"
              size="small"
              isLoading={isInventoryOnlyPending}
              disabled={anyPending && !isInventoryOnlyPending}
              onClick={handleInventoryOnly}
            >
              {isInventoryOnlyPending ? "Syncing..." : "Sync Inventory Only"}
            </Button>
            <Text size="xsmall" className="text-ui-fg-muted mt-2">
              Updates stock quantities only. No products, categories, or brands
              are created or modified.
            </Text>
          </div>
        </div>
      </Container>

      {logs.length > 0 && (
        <Container className="divide-y p-0">
          <div className="px-6 py-4">
            <Text weight="plus">Sync History (this session)</Text>
          </div>
          <div className="px-6 py-4 flex flex-col gap-3">
            {logs.map((log, i) => (
              <div
                key={i}
                className="flex items-start gap-3 text-sm"
              >
                <Text
                  size="small"
                  className={
                    log.success ? "text-ui-fg-positive" : "text-ui-fg-error"
                  }
                >
                  {log.success ? "OK" : "FAIL"}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {log.timestamp}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  [{SYNC_TYPE_LABEL[log.type]}]
                </Text>
                <Text size="small">{log.message}</Text>
              </div>
            ))}
          </div>
        </Container>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Nhanh.vn Sync",
  icon: ArrowPathMini,
})

export default NhanhSyncPage
