import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Badge,
  Switch,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { ArrowLeft, Spinner } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { sdk } from "../../../lib/client"

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

const EmailTemplateDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const previewRef = useRef<HTMLIFrameElement>(null)

  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [isEnabled, setIsEnabled] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [isDirty, setIsDirty] = useState(false)

  const { data, isLoading } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{ email_template: EmailTemplate }>(
        `/admin/email-templates/${id}`
      ),
    queryKey: ["email-template", id],
  })

  const template = data?.email_template

  useEffect(() => {
    if (template) {
      setSubject(template.subject)
      setBody(template.body)
      setIsEnabled(template.is_enabled)
      setIsDirty(false)
    }
  }, [template])

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      sdk.client.fetch(`/admin/email-templates/${id}`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-template", id] })
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
      toast.success("Template saved")
      setIsDirty(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save template")
    },
  })

  const testMutation = useMutation({
    mutationFn: (to: string) =>
      sdk.client.fetch(`/admin/email-templates/${id}/test`, {
        method: "POST",
        body: { to },
      }),
    onSuccess: () => {
      toast.success(`Test email sent to ${testEmail}`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send test email")
    },
  })

  const resetMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ email_template: EmailTemplate }>(
        `/admin/email-templates/${id}/reset`,
        { method: "POST" }
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["email-template", id] })
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
      const t = (data as { email_template: EmailTemplate }).email_template
      if (t) {
        setSubject(t.subject)
        setBody(t.body)
      }
      toast.success("Template reset to default")
      setIsDirty(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reset template")
    },
  })

  const handleSave = () => {
    updateMutation.mutate({ subject, body, is_enabled: isEnabled })
  }

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked)
    updateMutation.mutate({ is_enabled: checked })
  }

  const handleReset = async () => {
    const confirmed = await prompt({
      title: "Reset to default template?",
      description:
        "Subject and body will be overwritten by the default template. This action cannot be undone.",
      confirmText: "Reset",
      cancelText: "Cancel",
    })
    if (confirmed) {
      resetMutation.mutate()
    }
  }

  const handleSendTest = () => {
    if (!testEmail) {
      toast.error("Please enter an email address")
      return
    }
    if (isDirty) {
      toast.error("Please save the template before sending a test")
      return
    }
    testMutation.mutate(testEmail)
  }

  const updatePreview = () => {
    if (previewRef.current) {
      const doc = previewRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(body)
        doc.close()
      }
    }
  }

  useEffect(() => {
    if (showPreview) {
      updatePreview()
    }
  }, [showPreview, body])

  let variables: Record<string, string> = {}
  if (template?.available_variables) {
    try {
      variables = JSON.parse(template.available_variables)
    } catch {
      // ignore
    }
  }

  if (isLoading) {
    return (
      <Container className="flex items-center justify-center p-8">
        <Spinner className="animate-spin" />
      </Container>
    )
  }

  if (!template) {
    return (
      <Container className="p-6">
        <Text>Template not found</Text>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="transparent"
              size="small"
              onClick={() => navigate("/email-templates")}
            >
              <ArrowLeft />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Heading level="h1">{template.name}</Heading>
                <Badge
                  color={categoryColors[template.category]}
                  size="small"
                >
                  {categoryLabels[template.category]}
                </Badge>
              </div>
              <Text size="small" className="text-ui-fg-muted font-mono">
                {template.template_key}
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Text size="small" className="text-ui-fg-subtle">
                {isEnabled ? "Enabled" : "Disabled"}
              </Text>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle}
              />
            </div>
            <Button
              size="small"
              variant="secondary"
              onClick={handleReset}
              disabled={resetMutation.isPending}
            >
              Reset
            </Button>
            <Button
              size="small"
              onClick={handleSave}
              disabled={!isDirty}
              isLoading={updateMutation.isPending}
            >
              Save
            </Button>
          </div>
        </div>
        {template.description && (
          <div className="px-6 py-3">
            <Text size="small" className="text-ui-fg-subtle">
              {template.description}
            </Text>
          </div>
        )}
      </Container>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Editor */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Container className="divide-y p-0">
            <div className="px-6 py-4">
              <Heading level="h2">Email Content</Heading>
            </div>
            <div className="flex flex-col gap-4 px-6 py-4">
              <div className="flex flex-col gap-y-2">
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value)
                    setIsDirty(true)
                  }}
                  placeholder="Email subject..."
                />
              </div>
              <div className="flex flex-col gap-y-2">
                <div className="flex items-center justify-between">
                  <Label>Body (HTML)</Label>
                  <Button
                    size="small"
                    variant="transparent"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? "Editor" : "Preview"}
                  </Button>
                </div>
                {showPreview ? (
                  <div className="rounded-md border border-ui-border-base overflow-hidden">
                    <iframe
                      ref={previewRef}
                      title="Email Preview"
                      className="w-full"
                      style={{ height: "600px", border: "none" }}
                    />
                  </div>
                ) : (
                  <textarea
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value)
                      setIsDirty(true)
                    }}
                    className="w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 font-mono text-sm text-ui-fg-base focus:outline-none focus:ring-2 focus:ring-ui-fg-interactive"
                    rows={24}
                    spellCheck={false}
                  />
                )}
              </div>
            </div>
          </Container>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Test Email */}
          <Container className="divide-y p-0">
            <div className="px-6 py-4">
              <Heading level="h2">Send Test</Heading>
            </div>
            <div className="flex flex-col gap-3 px-6 py-4">
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
              />
              <Button
                size="small"
                variant="secondary"
                onClick={handleSendTest}
                isLoading={testMutation.isPending}
                className="w-full"
              >
                Send test email
              </Button>
            </div>
          </Container>

          {/* Available Variables */}
          {Object.keys(variables).length > 0 && (
            <Container className="divide-y p-0">
              <div className="px-6 py-4">
                <Heading level="h2">Available Variables</Heading>
              </div>
              <div className="px-6 py-4">
                <div className="flex flex-col gap-2">
                  {Object.entries(variables).map(([key, desc]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <code className="text-xs font-mono text-ui-fg-interactive bg-ui-bg-field px-1.5 py-0.5 rounded w-fit">
                        {"{{"}
                        {key}
                        {"}}"}
                      </code>
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {desc}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            </Container>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmailTemplateDetailPage
