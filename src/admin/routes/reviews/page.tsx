import { defineRouteConfig } from "@medusajs/admin-sdk"
import { StarSolid } from "@medusajs/icons"
import {
  Container,
  Text,
  Badge,
  Button,
  Select,
  toast,
} from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/client"

type Review = {
  id: string
  product_id: string
  customer_id?: string
  rating: number
  title?: string
  content: string
  first_name: string
  last_name: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  images?: string[]
}

type ReviewsResponse = {
  reviews: Review[]
  count: number
}

const statusLabel: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
}

const statusColor: Record<string, "orange" | "green" | "red"> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <StarSolid
        key={s}
        className={s <= rating ? "text-yellow-400" : "text-ui-fg-muted"}
        style={{ width: 14, height: 14 }}
      />
    ))}
  </div>
)

const ReviewsPage = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      params.set("limit", "100")
      return sdk.client.fetch<ReviewsResponse>(`/admin/reviews?${params}`)
    },
  })

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      sdk.client.fetch(`/admin/reviews/${id}`, {
        method: "POST",
        body: { status },
      }),
    onSuccess: (_, { status }) => {
      toast.success(
        status === "approved" ? "Đã duyệt đánh giá!" : "Đã từ chối đánh giá."
      )
      queryClient.invalidateQueries({ queryKey: ["reviews"] })
      setSelectedReview(null)
    },
    onError: () => toast.error("Thao tác thất bại. Vui lòng thử lại."),
  })

  const { mutate: deleteReview, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/reviews/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Đã xóa đánh giá.")
      queryClient.invalidateQueries({ queryKey: ["reviews"] })
      setSelectedReview(null)
    },
    onError: () => toast.error("Xóa thất bại."),
  })

  const reviews = data?.reviews ?? []

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Text className="text-xl font-semibold">Đánh giá sản phẩm</Text>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            {data?.count ?? 0} đánh giá tổng cộng
          </Text>
        </div>
        <Select
          size="small"
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">Tất cả</Select.Item>
            <Select.Item value="pending">Chờ duyệt</Select.Item>
            <Select.Item value="approved">Đã duyệt</Select.Item>
            <Select.Item value="rejected">Từ chối</Select.Item>
          </Select.Content>
        </Select>
      </div>

      <div className="flex gap-4">
        {/* Review list */}
        <Container className="flex-1 p-0 divide-y">
          {isLoading ? (
            <div className="p-6 text-center">
              <Text className="text-ui-fg-subtle">Đang tải...</Text>
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-6 text-center">
              <Text className="text-ui-fg-subtle">Không có đánh giá nào.</Text>
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className={`px-6 py-4 cursor-pointer hover:bg-ui-bg-subtle transition-colors ${
                  selectedReview?.id === review.id ? "bg-ui-bg-subtle" : ""
                }`}
                onClick={() => setSelectedReview(review)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Text
                        size="small"
                        weight="plus"
                        className="truncate"
                      >
                        {review.first_name} {review.last_name}
                      </Text>
                      <StarRating rating={review.rating} />
                      <Badge
                        color={statusColor[review.status]}
                        size="2xsmall"
                      >
                        {statusLabel[review.status]}
                      </Badge>
                    </div>
                    {review.title && (
                      <Text
                        size="small"
                        weight="plus"
                        className="text-ui-fg-base truncate"
                      >
                        {review.title}
                      </Text>
                    )}
                    <Text
                      size="small"
                      className="text-ui-fg-subtle line-clamp-2 mt-0.5"
                    >
                      {review.content}
                    </Text>
                  </div>
                  <Text size="xsmall" className="text-ui-fg-muted shrink-0">
                    {new Date(review.created_at).toLocaleDateString("vi-VN")}
                  </Text>
                </div>
              </div>
            ))
          )}
        </Container>

        {/* Detail panel */}
        {selectedReview && (
          <Container className="w-80 shrink-0 p-0 divide-y self-start">
            <div className="px-6 py-4">
              <Text weight="plus">Chi tiết đánh giá</Text>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <Text
                  size="small"
                  weight="plus"
                  className="text-ui-fg-subtle mb-1"
                >
                  Người đánh giá
                </Text>
                <Text size="small">
                  {selectedReview.first_name} {selectedReview.last_name}
                </Text>
              </div>
              <div>
                <Text
                  size="small"
                  weight="plus"
                  className="text-ui-fg-subtle mb-1"
                >
                  Đánh giá
                </Text>
                <StarRating rating={selectedReview.rating} />
              </div>
              {selectedReview.title && (
                <div>
                  <Text
                    size="small"
                    weight="plus"
                    className="text-ui-fg-subtle mb-1"
                  >
                    Tiêu đề
                  </Text>
                  <Text size="small">{selectedReview.title}</Text>
                </div>
              )}
              <div>
                <Text
                  size="small"
                  weight="plus"
                  className="text-ui-fg-subtle mb-1"
                >
                  Nội dung
                </Text>
                <Text size="small" className="leading-relaxed">
                  {selectedReview.content}
                </Text>
              </div>
              {selectedReview.images && selectedReview.images.length > 0 && (
                <div>
                  <Text
                    size="small"
                    weight="plus"
                    className="text-ui-fg-subtle mb-1"
                  >
                    Ảnh ({selectedReview.images.length})
                  </Text>
                  <div className="flex flex-wrap gap-2">
                    {selectedReview.images.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Review image ${i + 1}`}
                        className="w-16 h-16 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Text
                  size="small"
                  weight="plus"
                  className="text-ui-fg-subtle mb-1"
                >
                  Trạng thái
                </Text>
                <Badge color={statusColor[selectedReview.status]}>
                  {statusLabel[selectedReview.status]}
                </Badge>
              </div>
            </div>
            <div className="px-6 py-4 flex flex-col gap-2">
              {selectedReview.status !== "approved" && (
                <Button
                  variant="primary"
                  size="small"
                  isLoading={isUpdating}
                  onClick={() =>
                    updateStatus({
                      id: selectedReview.id,
                      status: "approved",
                    })
                  }
                >
                  Duyệt đánh giá
                </Button>
              )}
              {selectedReview.status !== "rejected" && (
                <Button
                  variant="secondary"
                  size="small"
                  isLoading={isUpdating}
                  onClick={() =>
                    updateStatus({
                      id: selectedReview.id,
                      status: "rejected",
                    })
                  }
                >
                  Từ chối
                </Button>
              )}
              <Button
                variant="danger"
                size="small"
                isLoading={isDeleting}
                onClick={() => deleteReview(selectedReview.id)}
              >
                Xóa đánh giá
              </Button>
            </div>
          </Container>
        )}
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Đánh giá",
  icon: StarSolid,
})

export default ReviewsPage
