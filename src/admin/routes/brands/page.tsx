import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Text,
  FocusModal,
  Input,
  Label,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { TagSolid, Trash, PencilSquare, Spinner } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import { sdk } from "../../lib/client"
import RichTextEditor from "../../components/rich-text-editor"

type Brand = {
  id: string
  name: string
  handle: string
  description: string | null
  content: string | null
  logo_url: string | null
  products?: { id: string; title: string }[]
}

const BrandsPage = () => {
  const [createOpen, setCreateOpen] = useState(false)
  const [editBrand, setEditBrand] = useState<Brand | null>(null)
  const queryClient = useQueryClient()
  const prompt = usePrompt()

  const { data, isLoading } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{ brands: Brand[] }>("/admin/brands"),
    queryKey: ["brands"],
  })

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; handle?: string; description?: string; content?: string; logo_url?: string }) =>
      sdk.client.fetch("/admin/brands", { method: "POST", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      toast.success("Brand created successfully")
      setCreateOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create brand")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string
      name?: string
      handle?: string
      description?: string
      content?: string
      logo_url?: string
    }) =>
      sdk.client.fetch(`/admin/brands/${id}`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      toast.success("Brand updated successfully")
      setEditBrand(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update brand")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/brands/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      toast.success("Brand deleted")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete brand")
    },
  })

  const handleDelete = async (brand: Brand) => {
    const confirmed = await prompt({
      title: `Delete brand "${brand.name}"?`,
      description: "This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (confirmed) {
      deleteMutation.mutate(brand.id)
    }
  }

  const brands = data?.brands || []

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Brands</Heading>
        <Button size="small" onClick={() => setCreateOpen(true)}>
          Create Brand
        </Button>
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Spinner />
          </div>
        ) : brands.length === 0 ? (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            No brands yet. Create your first brand!
          </Text>
        ) : (
          <div className="flex flex-col gap-2">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="shadow-elevation-card-rest bg-ui-bg-component rounded-md px-4 py-3 transition-colors hover:bg-ui-bg-component-hover"
              >
                <div className="flex items-center gap-3">
                  {brand.logo_url && (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="h-10 w-10 rounded-md object-cover"
                    />
                  )}
                  <div className="flex flex-1 flex-col gap-y-1">
                    <Link to={`/brands/${brand.id}`}>
                      <Text size="small" leading="compact" weight="plus">
                        {brand.name}
                      </Text>
                    </Link>
                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-muted"
                    >
                      /{brand.handle}
                    </Text>
                    {brand.description && (
                      <Text
                        size="small"
                        leading="compact"
                        className="text-ui-fg-subtle"
                      >
                        {brand.description}
                      </Text>
                    )}
                    {brand.products && brand.products.length > 0 && (
                      <Text
                        size="small"
                        leading="compact"
                        className="text-ui-fg-muted"
                      >
                        {brand.products.length} products
                      </Text>
                    )}
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => setEditBrand(brand)}
                    >
                      <PencilSquare />
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => handleDelete(brand)}
                    >
                      <Trash />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Brand Modal */}
      <CreateBrandModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      {/* Edit Brand Modal */}
      {editBrand && (
        <EditBrandModal
          brand={editBrand}
          open={!!editBrand}
          onOpenChange={(open) => {
            if (!open) setEditBrand(null)
          }}
          onSubmit={(data) =>
            updateMutation.mutate({ id: editBrand.id, ...data })
          }
          isPending={updateMutation.isPending}
        />
      )}
    </Container>
  )
}

function CreateBrandModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; handle?: string; description?: string; content?: string; logo_url?: string }) => void
  isPending: boolean
}) {
  const [name, setName] = useState("")
  const [handle, setHandle] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "Brand name is required"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSubmit({
      name: name.trim(),
      handle: handle.trim() || undefined,
      description: description.trim() || undefined,
      content: content.trim() || undefined,
      logo_url: logoUrl.trim() || undefined,
    })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName("")
      setHandle("")
      setDescription("")
      setContent("")
      setLogoUrl("")
      setErrors({})
    }
    onOpenChange(open)
  }

  return (
    <FocusModal open={open} onOpenChange={handleOpenChange}>
      <FocusModal.Content>
        <div className="flex h-full flex-col overflow-hidden">
          <FocusModal.Header>
            <div className="flex items-center justify-end gap-x-2">
              <FocusModal.Close asChild>
                <Button size="small" variant="secondary" disabled={isPending}>
                  Cancel
                </Button>
              </FocusModal.Close>
              <Button
                size="small"
                onClick={handleSubmit}
                isLoading={isPending}
              >
                Create
              </Button>
            </div>
          </FocusModal.Header>

          <FocusModal.Body className="flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-lg flex-col gap-y-4 p-8">
              <Heading level="h2">Create New Brand</Heading>
              <div className="flex flex-col gap-y-2">
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setErrors({ ...errors, name: "" })
                  }}
                  placeholder="e.g. Tina Leather"
                />
                {errors.name && (
                  <Text size="small" className="text-ui-fg-error">
                    {errors.name}
                  </Text>
                )}
              </div>
              <div className="flex flex-col gap-y-2">
                <Label>Handle</Label>
                <Input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="Auto-generated from name if empty"
                />
                <Text size="small" leading="compact" className="text-ui-fg-muted">
                  Used as URL slug, e.g. /brands/tina-leather
                </Text>
              </div>
              <div className="flex flex-col gap-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the brand..."
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label>Content</Label>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Write brand content here..."
                />
                <Text size="small" leading="compact" className="text-ui-fg-muted">
                  Rich content displayed on the brand page for SEO and user information.
                </Text>
              </div>
              <div className="flex flex-col gap-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
          </FocusModal.Body>
        </div>
      </FocusModal.Content>
    </FocusModal>
  )
}

function EditBrandModal({
  brand,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  brand: Brand
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name?: string; handle?: string; description?: string; content?: string; logo_url?: string }) => void
  isPending: boolean
}) {
  const [name, setName] = useState(brand.name)
  const [handle, setHandle] = useState(brand.handle || "")
  const [description, setDescription] = useState(brand.description || "")
  const [content, setContent] = useState(brand.content || "")
  const [logoUrl, setLogoUrl] = useState(brand.logo_url || "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "Brand name is required"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSubmit({
      name: name.trim(),
      handle: handle.trim() || undefined,
      description: description.trim() || undefined,
      content: content.trim() || undefined,
      logo_url: logoUrl.trim() || undefined,
    })
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <div className="flex h-full flex-col overflow-hidden">
          <FocusModal.Header>
            <div className="flex items-center justify-end gap-x-2">
              <FocusModal.Close asChild>
                <Button size="small" variant="secondary" disabled={isPending}>
                  Cancel
                </Button>
              </FocusModal.Close>
              <Button
                size="small"
                onClick={handleSubmit}
                isLoading={isPending}
              >
                Save
              </Button>
            </div>
          </FocusModal.Header>

          <FocusModal.Body className="flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-lg flex-col gap-y-4 p-8">
              <Heading level="h2">Edit Brand</Heading>
              <div className="flex flex-col gap-y-2">
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setErrors({ ...errors, name: "" })
                  }}
                />
                {errors.name && (
                  <Text size="small" className="text-ui-fg-error">
                    {errors.name}
                  </Text>
                )}
              </div>
              <div className="flex flex-col gap-y-2">
                <Label>Handle</Label>
                <Input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="Auto-generated from name if empty"
                />
                <Text size="small" leading="compact" className="text-ui-fg-muted">
                  Used as URL slug, e.g. /brands/{handle || "..."}
                </Text>
              </div>
              <div className="flex flex-col gap-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <Label>Content</Label>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Write brand content here..."
                />
                <Text size="small" leading="compact" className="text-ui-fg-muted">
                  Rich content displayed on the brand page for SEO and user information.
                </Text>
              </div>
              <div className="flex flex-col gap-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-md object-cover"
                  />
                )}
              </div>
            </div>
          </FocusModal.Body>
        </div>
      </FocusModal.Content>
    </FocusModal>
  )
}

export const config = defineRouteConfig({
  label: "Brands",
  icon: TagSolid,
})

export default BrandsPage
