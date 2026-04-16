import {
  Container,
  Text,
  Button,
  Input,
  Label,
  Textarea,
  Drawer,
  toast,
} from "@medusajs/ui"
import { PencilSquare, Spinner } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { sdk } from "../lib/client"

type SeoMetadata = {
  id: string
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string | null
  og_title: string | null
  og_description: string | null
  og_image: string | null
  canonical_url: string | null
}

type SeoFormData = {
  meta_title: string
  meta_description: string
  meta_keywords: string
  og_title: string
  og_description: string
  og_image: string
  canonical_url: string
}

const emptySeoForm: SeoFormData = {
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  og_title: "",
  og_description: "",
  og_image: "",
  canonical_url: "",
}

type SeoMetadataSectionProps = {
  entityType: "product" | "brand" | "category" | "collection"
  entityId: string
}

const SeoMetadataSection = ({ entityType, entityId }: SeoMetadataSectionProps) => {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<SeoFormData>(emptySeoForm)
  const queryClient = useQueryClient()

  const fetchUrlMap = {
    product: `/admin/products/${entityId}/seo`,
    brand: `/admin/brands/${entityId}/seo`,
    category: `/admin/categories/${entityId}/seo`,
    collection: `/admin/collections/${entityId}/seo`,
  }
  const fetchUrl = fetchUrlMap[entityType]

  const { data, isLoading } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{ seo_metadata: SeoMetadata | null }>(fetchUrl),
    queryKey: ["seo-metadata", entityType, entityId],
  })

  const seo = data?.seo_metadata

  useEffect(() => {
    if (editing && seo) {
      setFormData({
        meta_title: seo.meta_title || "",
        meta_description: seo.meta_description || "",
        meta_keywords: seo.meta_keywords || "",
        og_title: seo.og_title || "",
        og_description: seo.og_description || "",
        og_image: seo.og_image || "",
        canonical_url: seo.canonical_url || "",
      })
    } else if (editing) {
      setFormData(emptySeoForm)
    }
  }, [editing, seo])

  // Create new SEO metadata + link to entity
  const createMutation = useMutation({
    mutationFn: (payload: SeoFormData) =>
      sdk.client.fetch<{ seo_metadata: SeoMetadata }>("/admin/seo", {
        method: "POST",
        body: {
          entity_type: entityType,
          entity_id: entityId,
          ...payload,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-metadata", entityType, entityId] })
      toast.success("SEO metadata created")
      setEditing(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create SEO metadata")
    },
  })

  // Update existing SEO metadata
  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: SeoFormData & { id: string }) =>
      sdk.client.fetch<{ seo_metadata: SeoMetadata }>(`/admin/seo/${id}`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-metadata", entityType, entityId] })
      toast.success("SEO metadata updated")
      setEditing(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update SEO metadata")
    },
  })

  const handleSave = () => {
    if (seo) {
      updateMutation.mutate({ id: seo.id, ...formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const updateField = (field: keyof SeoFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-center px-6 py-4">
          <Spinner />
        </div>
      </Container>
    )
  }

  const fields: { key: keyof SeoFormData; label: string; type: "input" | "textarea" }[] = [
    { key: "meta_title", label: "Meta Title", type: "input" },
    { key: "meta_description", label: "Meta Description", type: "textarea" },
    { key: "meta_keywords", label: "Meta Keywords", type: "input" },
    { key: "canonical_url", label: "Canonical URL", type: "input" },
    { key: "og_title", label: "OG Title", type: "input" },
    { key: "og_description", label: "OG Description", type: "textarea" },
    { key: "og_image", label: "OG Image URL", type: "input" },
  ]

  const hasAnySeoData = seo && fields.some(({ key }) => seo[key])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          SEO Metadata
        </Text>
        <Button
          size="small"
          variant="secondary"
          onClick={() => setEditing(true)}
        >
          <PencilSquare />
        </Button>
      </div>

      <div className="px-6 py-4">
        {hasAnySeoData ? (
          <div className="flex flex-col gap-y-3">
            {fields.map(({ key, label }) => {
              const value = seo[key]
              if (!value) return null
              return (
                <div key={key} className="flex flex-col gap-y-1">
                  <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                    {label}
                  </Text>
                  <Text size="small" leading="compact">
                    {value}
                  </Text>
                </div>
              )
            })}
          </div>
        ) : (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            No SEO metadata configured.
          </Text>
        )}
      </div>

      <Drawer open={editing} onOpenChange={setEditing}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit SEO Metadata</Drawer.Title>
          </Drawer.Header>

          <Drawer.Body className="flex-1 overflow-auto p-4">
            <div className="flex flex-col gap-y-4">
              {fields.map(({ key, label, type }) => (
                <div key={key} className="flex flex-col gap-y-2">
                  <Label>{label}</Label>
                  {type === "textarea" ? (
                    <Textarea
                      value={formData[key]}
                      onChange={(e) => updateField(key, e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <Input
                      value={formData[key]}
                      onChange={(e) => updateField(key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </Drawer.Body>

          <Drawer.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <Drawer.Close asChild>
                <Button size="small" variant="secondary" disabled={isPending}>
                  Cancel
                </Button>
              </Drawer.Close>
              <Button
                size="small"
                onClick={handleSave}
                isLoading={isPending}
              >
                Save
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export default SeoMetadataSection
