import {
  Container,
  Text,
  Button,
  Drawer,
  toast,
} from "@medusajs/ui"
import { PencilSquare, Spinner } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { sdk } from "../lib/client"
import RichTextEditor from "./rich-text-editor"

type EntityContent = {
  id: string
  content: string | null
}

type EntityContentSectionProps = {
  entityType: "product" | "category" | "collection"
  entityId: string
}

const EntityContentSection = ({ entityType, entityId }: EntityContentSectionProps) => {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState("")
  const queryClient = useQueryClient()

  const fetchUrlMap = {
    product: `/admin/products/${entityId}/content`,
    category: `/admin/categories/${entityId}/content`,
    collection: `/admin/collections/${entityId}/content`,
  }
  const fetchUrl = fetchUrlMap[entityType]

  const { data, isLoading } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{ entity_content: EntityContent | null }>(fetchUrl),
    queryKey: ["entity-content", entityType, entityId],
  })

  const entityContent = data?.entity_content

  useEffect(() => {
    if (editing) {
      setContent(entityContent?.content || "")
    }
  }, [editing, entityContent])

  const createMutation = useMutation({
    mutationFn: (payload: { content: string }) =>
      sdk.client.fetch<{ entity_content: EntityContent }>("/admin/entity-content", {
        method: "POST",
        body: {
          entity_type: entityType,
          entity_id: entityId,
          ...payload,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-content", entityType, entityId] })
      toast.success("Content saved")
      setEditing(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save content")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      sdk.client.fetch<{ entity_content: EntityContent }>(`/admin/entity-content/${id}`, {
        method: "POST",
        body: { content },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-content", entityType, entityId] })
      toast.success("Content updated")
      setEditing(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update content")
    },
  })

  const handleSave = () => {
    if (entityContent) {
      updateMutation.mutate({ id: entityContent.id, content })
    } else {
      createMutation.mutate({ content })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-center px-6 py-4">
          <Spinner />
        </div>
      </Container>
    )
  }

  const hasContent = entityContent?.content && entityContent.content !== "<p></p>"

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Content
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
        {hasContent ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: entityContent!.content! }}
          />
        ) : (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            No content configured.
          </Text>
        )}
      </div>

      <Drawer open={editing} onOpenChange={setEditing}>
        <Drawer.Content className="!max-w-[720px]">
          <Drawer.Header>
            <Drawer.Title>Edit Content</Drawer.Title>
          </Drawer.Header>

          <Drawer.Body className="flex-1 overflow-auto p-4">
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write content here..."
            />
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

export default EntityContentSection
