import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Text, Badge, Button, Select, toast } from "@medusajs/ui"
import { ArrowUpTray } from "@medusajs/icons"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../lib/client"

type OrderMetadata = {
  nhanh_order_id?: number | string
  nhanh_tracking_url?: string
  nhanh_push_status?: "pending" | "success" | "failed"
  nhanh_pushed_at?: string
  nhanh_error?: string
}

type OrderData = {
  id: string
  metadata?: OrderMetadata
}

const CARRIER_OPTIONS = [
  { label: "Default (from env)", value: "" },
  { label: "SPX Express", value: "SPX" },
  { label: "GHTK", value: "GHTK" },
  { label: "Viettel Post", value: "VTP" },
  { label: "J&T Express", value: "JT" },
  { label: "Ninja Van", value: "NJV" },
]

function StatusBadge({ status }: { status?: string }) {
  if (status === "success") return <Badge color="green">Pushed</Badge>
  if (status === "failed") return <Badge color="red">Failed</Badge>
  if (status === "pending") return <Badge color="orange">Pending</Badge>
  return <Badge color="grey">Not pushed</Badge>
}

const OrderNhanhPushWidget = ({
  data: order,
}: DetailWidgetProps<{ id: string }>) => {
  const queryClient = useQueryClient()
  const [carrierOverride, setCarrierOverride] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["order-nhanh", order.id],
    queryFn: () =>
      sdk.client.fetch<{ order: OrderData }>(
        `/admin/orders/${order.id}?fields=id,metadata`
      ),
  })

  const meta = data?.order?.metadata

  const { mutate: pushToNhanh, isPending: isPushing } = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/orders/${order.id}/nhanh-push`, {
        method: "POST",
        body: {
          force: true,
          ...(carrierOverride
            ? { carrierOverride: { carrierId: carrierOverride } }
            : {}),
        },
      }),
    onSuccess: (result: any) => {
      if (result?.success === false) {
        toast.error(`Push failed: ${result.error ?? "Unknown error"}`)
      } else {
        toast.success(`Pushed to Nhanh — order ID: ${result.nhanh_order_id}`)
      }
      queryClient.invalidateQueries({ queryKey: ["order-nhanh", order.id] })
    },
    onError: () => {
      toast.error("Request failed. Check network or server logs.")
    },
  })

  if (isLoading) return null

  const nhanhOrderId = meta?.nhanh_order_id
  const trackingUrl = meta?.nhanh_tracking_url
  const pushedAt = meta?.nhanh_pushed_at
    ? new Date(meta.nhanh_pushed_at).toLocaleString()
    : null

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <ArrowUpTray className="text-ui-fg-subtle" />
          <Text className="font-medium">Nhanh.vn Push</Text>
        </div>
        <StatusBadge status={meta?.nhanh_push_status} />
      </div>

      <div className="px-6 py-4 space-y-2 text-sm">
        {nhanhOrderId && (
          <div className="flex gap-2">
            <Text className="text-ui-fg-subtle">Nhanh order ID:</Text>
            <Text className="font-mono">{String(nhanhOrderId)}</Text>
          </div>
        )}
        {trackingUrl && (
          <div className="flex gap-2">
            <Text className="text-ui-fg-subtle">Tracking:</Text>
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ui-fg-interactive hover:underline truncate max-w-xs"
            >
              {trackingUrl}
            </a>
          </div>
        )}
        {pushedAt && (
          <div className="flex gap-2">
            <Text className="text-ui-fg-subtle">Pushed at:</Text>
            <Text>{pushedAt}</Text>
          </div>
        )}
        {meta?.nhanh_error && (
          <div className="bg-ui-bg-subtle-hover rounded-md p-2 mt-1">
            <Text className="text-ui-fg-error text-xs break-words">{meta.nhanh_error}</Text>
          </div>
        )}
      </div>

      <div className="px-6 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Text className="text-ui-fg-subtle text-sm shrink-0">Carrier override:</Text>
          <Select
            size="small"
            value={carrierOverride}
            onValueChange={setCarrierOverride}
          >
            <Select.Trigger>
              <Select.Value placeholder="Default" />
            </Select.Trigger>
            <Select.Content>
              {CARRIER_OPTIONS.map((opt) => (
                <Select.Item key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <Button
          variant={meta?.nhanh_push_status === "success" ? "secondary" : "primary"}
          size="small"
          isLoading={isPushing}
          onClick={() => pushToNhanh()}
        >
          {meta?.nhanh_push_status === "success" ? "Re-push to Nhanh" : "Push to Nhanh"}
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default OrderNhanhPushWidget
