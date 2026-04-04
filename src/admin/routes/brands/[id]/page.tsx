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
import SeoMetadataSection from "../../../components/seo-metadata-section"

type Brand = {
  id: string
  name: string
  handle: string
  description: string | null
  content: string | null
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
      toast.success("Brand deleted")
      navigate("/brands")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete brand")
    },
  })

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: `Delete brand "${brand?.name}"?`,
      description: "This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
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
        <Text>Brand not found.</Text>
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
            {brand.logo_url && (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-10 w-10 rounded-md object-cover"
              />
            )}
            <div className="flex flex-col">
              <Heading level="h1">{brand.name}</Heading>
              <Text size="small" leading="compact" className="text-ui-fg-muted">
                /{brand.handle}
              </Text>
            </div>
          </div>
          <Button
            size="small"
            variant="secondary"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash />
            Delete
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

      {/* Content */}
      {brand.content && (
        <Container className="divide-y p-0">
          <div className="px-6 py-4">
            <Text size="small" leading="compact" weight="plus">
              Content
            </Text>
          </div>
          <div
            className="prose max-w-none px-6 py-4 text-sm"
            dangerouslySetInnerHTML={{ __html: brand.content }}
          />
        </Container>
      )}

      {/* Products linked to this brand */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            Products ({brand.products?.length || 0})
          </Text>
        </div>

        <div className="px-6 py-4">
          {!brand.products || brand.products.length === 0 ? (
            <Text
              size="small"
              leading="compact"
              className="text-ui-fg-subtle"
            >
              No products linked to this brand yet.
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

      {/* SEO Metadata */}
      <SeoMetadataSection entityType="brand" entityId={brand.id} />
    </div>
  )
}

export default BrandDetailPage
