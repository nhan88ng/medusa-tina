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
}

const NhanhSyncPage = () => {
  const prompt = usePrompt()
  const [logs, setLogs] = useState<SyncLog[]>([])

  const { mutate: triggerSync, isPending } = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ success: boolean; message: string }>(
        "/admin/nhanh-sync",
        { method: "POST" }
      ),
    onSuccess: (result) => {
      toast.success(result.message || "Sync completed")
      setLogs((prev) => [
        {
          timestamp: new Date().toLocaleString(),
          success: true,
          message: result.message || "Sync completed successfully",
        },
        ...prev,
      ])
    },
    onError: (error: any) => {
      const msg = error?.message || "Sync failed"
      toast.error(msg)
      setLogs((prev) => [
        {
          timestamp: new Date().toLocaleString(),
          success: false,
          message: msg,
        },
        ...prev,
      ])
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
              onClick={handleSync}
            >
              {isPending ? "Syncing..." : "Sync Now"}
            </Button>
            <Text size="xsmall" className="text-ui-fg-muted mt-2">
              Fetches products from Nhanh.vn and syncs categories, brands,
              products, variants, images, and inventory.
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
