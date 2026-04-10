import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Heading, Text, Button, toast } from "@medusajs/ui"
import { Photo } from "@medusajs/icons"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"
import { sdk } from "../lib/client"

type ProductCategory = {
  id: string
  metadata?: Record<string, any> | null
}

const CategoryMediaWidget = ({ data: category }: DetailWidgetProps<ProductCategory>) => {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageUrl = category.metadata?.image_url as string | undefined

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("files", file)
      const result = await sdk.client.fetch<{ files: { url: string }[] }>("/admin/uploads", {
        method: "POST",
        body: formData,
      })
      const url = result.files?.[0]?.url
      if (!url) throw new Error("Upload failed")
      await sdk.client.fetch(`/admin/product-categories/${category.id}`, {
        method: "POST",
        body: {
          metadata: { ...category.metadata, image_url: url },
        },
      })
      return url
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_category", category.id] })
      toast.success("Category image updated")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Upload failed")
    },
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2" className="text-ui-fg-base">Media</Heading>
        <Button
          size="small"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          <Photo />
          {imageUrl ? "Replace Image" : "Upload Image"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadMutation.mutate(file)
            e.target.value = ""
          }}
        />
      </div>
      <div className="px-6 py-4">
        {imageUrl ? (
          <div className="flex items-center gap-4">
            <img
              src={imageUrl}
              alt="Category image"
              className="h-24 w-24 rounded-md object-contain border border-ui-border-base"
            />
            <div className="flex flex-col gap-1">
              <Text size="small" leading="compact" weight="plus">Category Image</Text>
              <Text size="small" leading="compact" className="text-ui-fg-muted break-all">
                {imageUrl}
              </Text>
            </div>
          </div>
        ) : (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            No image uploaded. Click "Upload Image" to add one.
          </Text>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after",
})

export default CategoryMediaWidget
