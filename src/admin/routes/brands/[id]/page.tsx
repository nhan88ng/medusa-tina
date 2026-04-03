import {
  Container,
  Heading,
  Text,
  Button,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { ArrowLeft, Trash, Spinner } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, useNavigate, Link } from "react-router-dom"
import { sdk } from "../../../lib/client"

type Brand = {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  products?: { id: string; title: string; thumbnail?: string; status: string }[]
}

const BrandDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const prompt = usePrompt()

  const { data, isLoading } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{ brand: Brand }>(`/admin/brands/${id}`),
    queryKey: ["brand", id],
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/brands/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      toast.success("Brand da duoc xoa")
      navigate("/brands")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Khong the xoa brand")
    },
  })

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: `Xoa brand "${brand?.name}"?`,
      description: "Hanh dong nay khong the hoan tac.",
      confirmText: "Xoa",
      cancelText: "Huy",
    })
    if (confirmed) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center p-8">
          <Spinner />
        </div>
      </Container>
    )
  }

  const brand = data?.brand

  if (!brand) {
    return (
      <Container className="px-6 py-4">
        <Text>Khong tim thay brand.</Text>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-y-4">
      {/* Header */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-3">
            <Button
              size="small"
              variant="transparent"
              onClick={() => navigate("/brands")}
            >
              <ArrowLeft />
            </Button>
            <Heading level="h1">{brand.name}</Heading>
          </div>
          <Button
            size="small"
            variant="secondary"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash />
            Xoa
          </Button>
        </div>

        {brand.description && (
          <div className="px-6 py-4">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {brand.description}
            </Text>
          </div>
        )}
      </Container>

      {/* Products linked to this brand */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            San pham ({brand.products?.length || 0})
          </Text>
        </div>

        <div className="px-6 py-4">
          {!brand.products || brand.products.length === 0 ? (
            <Text
              size="small"
              leading="compact"
              className="text-ui-fg-subtle"
            >
              Chua co san pham nao duoc lien ket voi brand nay.
            </Text>
          ) : (
            <div className="flex flex-col gap-2">
              {brand.products.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="outline-none focus-within:shadow-borders-interactive-with-focus rounded-md [&:hover>div]:bg-ui-bg-component-hover"
                >
                  <div className="shadow-elevation-card-rest bg-ui-bg-component rounded-md px-4 py-3 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-1 flex-col gap-y-1">
                        <Text size="small" leading="compact" weight="plus">
                          {product.title}
                        </Text>
                        <Text
                          size="small"
                          leading="compact"
                          className="text-ui-fg-subtle"
                        >
                          {product.status}
                        </Text>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}

export default BrandDetailPage
