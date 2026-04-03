import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import {
  Container,
  Text,
  Select,
  Button,
  toast,
} from "@medusajs/ui"
import { PencilSquare, Spinner } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../lib/client"

type Brand = {
  id: string
  name: string
}

const ProductBrandWidget = ({ data: product }: DetailWidgetProps<{ id: string }>) => {
  const [editing, setEditing] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const queryClient = useQueryClient()

  // Display query: fetch current product's brand (loads on mount)
  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{ brand: Brand | null }>(`/admin/products/${product.id}/brand`),
    queryKey: ["product-brand", product.id],
  })

  // All brands for selection (loads on mount since it's a small dataset)
  const { data: brandsData, isLoading: isLoadingBrands } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{ brands: Brand[] }>("/admin/brands"),
    queryKey: ["brands"],
  })

  const currentBrand = productData?.brand
  const brands = brandsData?.brands || []

  const linkMutation = useMutation({
    mutationFn: (brandId: string) =>
      sdk.client.fetch(`/admin/brands/${brandId}/products`, {
        method: "POST",
        body: { product_id: product.id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-brand", product.id] })
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      toast.success("Brand updated")
      setEditing(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update brand")
    },
  })

  const unlinkMutation = useMutation({
    mutationFn: (brandId: string) =>
      sdk.client.fetch(`/admin/brands/${brandId}/products`, {
        method: "DELETE",
        body: { product_id: product.id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-brand", product.id] })
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      toast.success("Brand removed")
      setEditing(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove brand")
    },
  })

  const handleSave = async () => {
    if (selectedBrandId === "") {
      // Remove brand
      if (currentBrand) {
        unlinkMutation.mutate(currentBrand.id)
      } else {
        setEditing(false)
      }
      return
    }

    // If changing brand, unlink old first then link new
    if (currentBrand && currentBrand.id !== selectedBrandId) {
      await unlinkMutation.mutateAsync(currentBrand.id)
    }

    if (currentBrand?.id !== selectedBrandId) {
      linkMutation.mutate(selectedBrandId)
    } else {
      setEditing(false)
    }
  }

  const handleEdit = () => {
    setSelectedBrandId(currentBrand?.id || "")
    setEditing(true)
  }

  const isPending = linkMutation.isPending || unlinkMutation.isPending

  if (isLoadingProduct) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-center px-6 py-4">
          <Spinner />
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Brand
        </Text>
        {!editing && (
          <Button
            size="small"
            variant="secondary"
            onClick={handleEdit}
          >
            <PencilSquare />
          </Button>
        )}
      </div>

      <div className="px-6 py-4">
        {editing ? (
          <div className="flex flex-col gap-y-3">
            {isLoadingBrands ? (
              <Spinner />
            ) : (
              <Select
                value={selectedBrandId}
                onValueChange={setSelectedBrandId}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select a brand..." />
                </Select.Trigger>
                <Select.Content>
                  {brands.map((brand) => (
                    <Select.Item key={brand.id} value={brand.id}>
                      {brand.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            )}
            <div className="flex items-center justify-end gap-x-2">
              <Button
                size="small"
                variant="secondary"
                onClick={() => setEditing(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              {currentBrand && (
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => {
                    setSelectedBrandId("")
                    if (currentBrand) {
                      unlinkMutation.mutate(currentBrand.id)
                    }
                  }}
                  disabled={isPending}
                >
                  Remove
                </Button>
              )}
              <Button
                size="small"
                onClick={handleSave}
                isLoading={isPending}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <Text
            size="small"
            leading="compact"
            className={currentBrand ? "" : "text-ui-fg-subtle"}
          >
            {currentBrand?.name || "No brand assigned"}
          </Text>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductBrandWidget
