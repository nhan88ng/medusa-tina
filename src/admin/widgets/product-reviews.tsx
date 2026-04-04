import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Text, Badge } from "@medusajs/ui"
import { StarSolid } from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { sdk } from "../lib/client"

type Review = {
  id: string
  rating: number
  first_name: string
  last_name: string
  status: "pending" | "approved" | "rejected"
  content: string
  created_at: string
}

type ReviewsResponse = {
  reviews: Review[]
  count: number
  average_rating: number
  total_count: number
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
        className={s <= Math.round(rating) ? "text-yellow-400" : "text-ui-fg-muted"}
        style={{ width: 12, height: 12 }}
      />
    ))}
  </div>
)

const ProductReviewsWidget = ({
  data: product,
}: DetailWidgetProps<{ id: string }>) => {
  const { data, isLoading } = useQuery({
    queryKey: ["product-reviews", product.id],
    queryFn: () =>
      sdk.client.fetch<ReviewsResponse>(
        `/store/products/${product.id}/reviews?limit=5`
      ),
  })

  const { data: pendingData } = useQuery({
    queryKey: ["product-reviews-pending", product.id],
    queryFn: () =>
      sdk.client.fetch<{ reviews: Review[]; count: number }>(
        `/admin/reviews?product_id=${product.id}&status=pending&limit=5`
      ),
  })

  const reviews = data?.reviews ?? []
  const pendingCount = pendingData?.count ?? 0

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <StarSolid className="text-ui-fg-subtle" />
          <Text className="font-medium">Đánh giá sản phẩm</Text>
        </div>
        <Link
          to={`/reviews?product_id=${product.id}`}
          className="text-ui-fg-interactive text-sm hover:underline"
        >
          Xem tất cả
        </Link>
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <Text className="text-ui-fg-subtle text-sm">Đang tải...</Text>
        ) : (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <Text className="text-3xl font-bold text-ui-fg-base">
                {data?.average_rating?.toFixed(1) ?? "0.0"}
              </Text>
              <StarRating rating={data?.average_rating ?? 0} />
              <Text className="text-ui-fg-subtle text-xs mt-1">
                {data?.total_count ?? 0} đánh giá
              </Text>
            </div>
            {pendingCount > 0 && (
              <Badge color="orange">
                {pendingCount} chờ duyệt
              </Badge>
            )}
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="divide-y">
          {reviews.map((review) => (
            <div key={review.id} className="px-6 py-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Text size="small" weight="plus">
                    {review.first_name} {review.last_name}
                  </Text>
                  <StarRating rating={review.rating} />
                </div>
                <Badge color={statusColor[review.status]} size="2xsmall">
                  {review.status === "pending"
                    ? "Chờ duyệt"
                    : review.status === "approved"
                    ? "Đã duyệt"
                    : "Từ chối"}
                </Badge>
              </div>
              <Text size="small" className="text-ui-fg-subtle line-clamp-2">
                {review.content}
              </Text>
            </div>
          ))}
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductReviewsWidget
