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

type Brand = {
  id: string
  name: string
  description: string | null
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
    mutationFn: (payload: { name: string; description?: string }) =>
      sdk.client.fetch("/admin/brands", { method: "POST", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      toast.success("Brand da duoc tao thanh cong")
      setCreateOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Khong the tao brand")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string
      name?: string
      description?: string
    }) =>
      sdk.client.fetch(`/admin/brands/${id}`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      toast.success("Brand da duoc cap nhat")
      setEditBrand(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Khong the cap nhat brand")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/brands/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      toast.success("Brand da duoc xoa")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Khong the xoa brand")
    },
  })

  const handleDelete = async (brand: Brand) => {
    const confirmed = await prompt({
      title: `Xoa brand "${brand.name}"?`,
      description: "Hanh dong nay khong the hoan tac.",
      confirmText: "Xoa",
      cancelText: "Huy",
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
          Tao Brand
        </Button>
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Spinner />
          </div>
        ) : brands.length === 0 ? (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Chua co brand nao. Hay tao brand dau tien!
          </Text>
        ) : (
          <div className="flex flex-col gap-2">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="shadow-elevation-card-rest bg-ui-bg-component rounded-md px-4 py-3 transition-colors hover:bg-ui-bg-component-hover"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 flex-col gap-y-1">
                    <Link to={`/brands/${brand.id}`}>
                      <Text size="small" leading="compact" weight="plus">
                        {brand.name}
                      </Text>
                    </Link>
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
                        {brand.products.length} san pham
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
  onSubmit: (data: { name: string; description?: string }) => void
  isPending: boolean
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "Ten brand la bat buoc"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSubmit({ name: name.trim(), description: description.trim() || undefined })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName("")
      setDescription("")
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
                  Huy
                </Button>
              </FocusModal.Close>
              <Button
                size="small"
                onClick={handleSubmit}
                isLoading={isPending}
              >
                Tao
              </Button>
            </div>
          </FocusModal.Header>

          <FocusModal.Body className="flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-lg flex-col gap-y-4 p-8">
              <Heading level="h2">Tao Brand Moi</Heading>
              <div className="flex flex-col gap-y-2">
                <Label>Ten *</Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setErrors({ ...errors, name: "" })
                  }}
                  placeholder="VD: Tina Leather"
                />
                {errors.name && (
                  <Text size="small" className="text-ui-fg-error">
                    {errors.name}
                  </Text>
                )}
              </div>
              <div className="flex flex-col gap-y-2">
                <Label>Mo ta</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mo ta ve brand..."
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
  onSubmit: (data: { name?: string; description?: string }) => void
  isPending: boolean
}) {
  const [name, setName] = useState(brand.name)
  const [description, setDescription] = useState(brand.description || "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "Ten brand la bat buoc"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
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
                  Huy
                </Button>
              </FocusModal.Close>
              <Button
                size="small"
                onClick={handleSubmit}
                isLoading={isPending}
              >
                Luu
              </Button>
            </div>
          </FocusModal.Header>

          <FocusModal.Body className="flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-lg flex-col gap-y-4 p-8">
              <Heading level="h2">Chinh sua Brand</Heading>
              <div className="flex flex-col gap-y-2">
                <Label>Ten *</Label>
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
                <Label>Mo ta</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
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
