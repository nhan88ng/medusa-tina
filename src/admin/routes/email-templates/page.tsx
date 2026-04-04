import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Button,
  Badge,
  toast,
  Switch,
  Select,
} from "@medusajs/ui"
import { EnvelopeSolid, Spinner } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import { sdk } from "../../lib/client"

type EmailTemplate = {
  id: string
  template_key: string
  name: string
  description: string | null
  subject: string
  body: string
  is_enabled: boolean
  category: string
  available_variables: string | null
  created_at: string
  updated_at: string
}

const categoryLabels: Record<string, string> = {
  transaction: "Transaction",
  growth: "Growth",
  care: "Care",
  engagement: "Engagement",
}

const categoryColors: Record<string, "green" | "blue" | "orange" | "purple"> = {
  transaction: "green",
  growth: "blue",
  care: "orange",
  engagement: "purple",
}

const EmailTemplatesPage = () => {
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{ email_templates: EmailTemplate[]; count: number }>(
        "/admin/email-templates"
      ),
    queryKey: ["email-templates"],
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_enabled }: { id: string; is_enabled: boolean }) =>
      sdk.client.fetch(`/admin/email-templates/${id}`, {
        method: "POST",
        body: { is_enabled },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update status")
    },
  })

  const templates = data?.email_templates || []
  const filtered =
    categoryFilter === "all"
      ? templates
      : templates.filter((t) => t.category === categoryFilter)

  const groupedByCategory = filtered.reduce(
    (acc, t) => {
      if (!acc[t.category]) acc[t.category] = []
      acc[t.category].push(t)
      return acc
    },
    {} as Record<string, EmailTemplate[]>
  )

  const categoryOrder = ["transaction", "growth", "care", "engagement"]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Email Templates</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Manage automated email templates
          </Text>
        </div>
        <div className="flex items-center gap-x-3">
          <Select
            size="small"
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <Select.Trigger>
              <Select.Value placeholder="All" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All</Select.Item>
              <Select.Item value="transaction">Transaction</Select.Item>
              <Select.Item value="growth">Growth</Select.Item>
              <Select.Item value="care">Care</Select.Item>
              <Select.Item value="engagement">Engagement</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Spinner className="animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Text className="text-ui-fg-subtle">
              No templates found. Run seed to create default templates.
            </Text>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {categoryOrder
              .filter((cat) => groupedByCategory[cat])
              .map((category) => (
                <div key={category}>
                  <div className="mb-3 flex items-center gap-2">
                    <Badge color={categoryColors[category]} size="small">
                      {categoryLabels[category]}
                    </Badge>
                    <Text size="small" className="text-ui-fg-muted">
                      {groupedByCategory[category].length} templates
                    </Text>
                  </div>
                  <div className="flex flex-col gap-2">
                    {groupedByCategory[category].map((template) => (
                      <Link
                        key={template.id}
                        to={`/email-templates/${template.id}`}
                        className="block"
                      >
                        <div className="shadow-elevation-card-rest bg-ui-bg-component rounded-md px-4 py-3 transition-colors hover:bg-ui-bg-component-hover">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-1 flex-col gap-y-1">
                              <div className="flex items-center gap-2">
                                <Text
                                  size="small"
                                  leading="compact"
                                  weight="plus"
                                >
                                  {template.name}
                                </Text>
                                <Text
                                  size="xsmall"
                                  className="text-ui-fg-muted font-mono"
                                >
                                  {template.template_key}
                                </Text>
                              </div>
                              {template.description && (
                                <Text
                                  size="small"
                                  leading="compact"
                                  className="text-ui-fg-subtle"
                                >
                                  {template.description}
                                </Text>
                              )}
                            </div>
                            <div
                              className="flex items-center"
                              onClick={(e) => e.preventDefault()}
                            >
                              <Switch
                                checked={template.is_enabled}
                                onCheckedChange={(checked) =>
                                  toggleMutation.mutate({
                                    id: template.id,
                                    is_enabled: checked,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Email Templates",
  icon: EnvelopeSolid,
})

export default EmailTemplatesPage
