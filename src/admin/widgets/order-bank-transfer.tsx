import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Text, Badge, Button, toast } from "@medusajs/ui"
import { CurrencyDollar, CheckCircle } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../lib/client"

type PaymentSession = {
  id: string
  provider_id: string
  status: string
}

type Payment = {
  id: string
  amount: number
  status: string
}

type PaymentCollection = {
  id: string
  status: string
  payment_sessions?: PaymentSession[]
  payments?: Payment[]
}

type OrderData = {
  id: string
  payment_collections?: PaymentCollection[]
}

const PROVIDER_ID = "pp_bank-transfer_bank-transfer"

const OrderBankTransferWidget = ({
  data: order,
}: DetailWidgetProps<{ id: string }>) => {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["order-payment", order.id],
    queryFn: () =>
      sdk.client.fetch<{ order: OrderData }>(
        `/admin/orders/${order.id}?fields=id,payment_collections.id,payment_collections.status,payment_collections.payment_sessions.id,payment_collections.payment_sessions.provider_id,payment_collections.payment_sessions.status,payment_collections.payments.id,payment_collections.payments.amount,payment_collections.payments.status`
      ),
  })

  const orderData = data?.order
  const bankTransferCollection = orderData?.payment_collections?.find((pc) =>
    pc.payment_sessions?.some((ps) => ps.provider_id === PROVIDER_ID)
  )
  const bankTransferSession = bankTransferCollection?.payment_sessions?.find(
    (ps) => ps.provider_id === PROVIDER_ID
  )
  const pendingPayment = bankTransferCollection?.payments?.find(
    (p) => p.status === "not_paid" || p.status === "awaiting"
  )

  const capturedPayment = bankTransferCollection?.payments?.find(
    (p) => p.status === "captured"
  )

  const { mutate: capturePayment, isPending: isCapturing } = useMutation({
    mutationFn: async (paymentId: string) =>
      sdk.client.fetch(`/admin/payments/${paymentId}/capture`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Payment confirmed successfully!")
      queryClient.invalidateQueries({ queryKey: ["order-payment", order.id] })
      queryClient.invalidateQueries({ queryKey: ["order", order.id] })
    },
    onError: () => {
      toast.error("Confirmation failed. Please try again.")
    },
  })

  if (isLoading || !bankTransferSession) return null

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <CurrencyDollar className="text-ui-fg-subtle" />
          <Text className="font-medium">Bank Transfer Payment</Text>
        </div>
        {capturedPayment ? (
          <Badge color="green" className="flex items-center gap-1">
            <CheckCircle />
            Confirmed
          </Badge>
        ) : (
          <Badge color="orange">Pending Confirmation</Badge>
        )}
      </div>

      {!capturedPayment && (
        <div className="px-6 py-4 space-y-3">
          <Text className="text-ui-fg-subtle text-sm">
            Customer has selected bank transfer payment. After checking your
            bank account and confirming receipt, click the button below.
          </Text>
          <div className="bg-ui-bg-subtle rounded-md p-3 text-sm">
            <p className="text-ui-fg-subtle">
              Transfer reference: <strong>TINA {order.id.slice(-8).toUpperCase()}</strong>
            </p>
          </div>
          {pendingPayment ? (
            <Button
              variant="primary"
              size="small"
              isLoading={isCapturing}
              onClick={() => capturePayment(pendingPayment.id)}
            >
              Confirm Payment Received
            </Button>
          ) : (
            <Text className="text-ui-fg-muted text-sm italic">
              No pending payment to confirm.
            </Text>
          )}
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default OrderBankTransferWidget
