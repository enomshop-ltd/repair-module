import { defineRouteConfig } from "@medusajs/admin-sdk"
import { 
  Container, 
  Heading, 
  Badge, 
  Button, 
  Text, 
  Label,
  Textarea,
  Input,
  Select,
  Toaster,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { ArrowUpRightOnBox, ChatBubbleLeftRight } from "@medusajs/icons"

// Get id from URL path
const useParams = () => {
  const path = window.location.pathname
  const parts = path.split('/')
  const id = parts[parts.length - 1]
  return { id }
}

type RepairTicket = {
  id: string
  ticket_number: string
  status: string
  technician_id?: string
  technician_name?: string
  issue_description: string
  accessories?: string
  parts_estimate: number
  labor_estimate: number
  total_estimate: number
  parts_actual: number
  labor_actual: number
  total_actual: number
  is_approved: boolean
  approved_at?: string
  warranty_months: number
  warranty_expiry?: string
  estimated_completion?: string
  completed_at?: string
  collected_at?: string
  created_at: string
  device?: {
    serial_number: string
    model_name: string
    brand: string
  }
  media?: Array<{
    id: string
    file_url: string
    file_type: string
    created_at: string
  }>
  notes?: Array<{
    id: string
    content: string
    is_internal: boolean
    created_at: string
  }>
  updates?: Array<{
    id: string
    message: string
    sender_type: string
    sender_id?: string
    created_at: string
  }>
}

const RepairDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<RepairTicket | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Form states
  const [newStatus, setNewStatus] = useState("")
  const [newNote, setNewNote] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [technicianName, setTechnicianName] = useState("")
  const [laborCost, setLaborCost] = useState("")
  const [etc, setEtc] = useState("")

  const loadTicket = () => {
    setLoading(true)
    fetch(`/admin/repairs/${id}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setTicket(data.repair_ticket)
        setNewStatus(data.repair_ticket.status)
        setTechnicianName(data.repair_ticket.technician_name || "")
        setLaborCost((data.repair_ticket.labor_estimate / 100).toFixed(2))
        setEtc(data.repair_ticket.estimated_completion?.split("T")[0] || "")
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load repair ticket:", err)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (id) {
      loadTicket()
    }
  }, [id])

  const handleUpdateStatus = async () => {
    try {
      await fetch(`/admin/repairs/${id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      toast.success("Status updated")
      loadTicket()
    } catch (err) {
      toast.error("Failed to update status")
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    try {
      await fetch(`/admin/repairs/${id}/notes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote, is_internal: isInternal }),
      })
      toast.success("Note added")
      setNewNote("")
      loadTicket()
    } catch (err) {
      toast.error("Failed to add note")
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    try {
      await fetch(`/admin/repairs/${id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage, sender_type: "technician" }),
      })
      toast.success("Message sent")
      setNewMessage("")
      loadTicket()
    } catch (err) {
      toast.error("Failed to send message")
    }
  }

  const handleUpdateCosts = async () => {
    try {
      const laborAmount = Math.round(parseFloat(laborCost) * 100)
      await fetch(`/admin/repairs/${id}/costs`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          labor_estimate: laborAmount,
          estimated_completion: etc ? new Date(etc).toISOString() : null,
          technician_name: technicianName || null,
        }),
      })
      toast.success("Details updated")
      loadTicket()
    } catch (err) {
      toast.error("Failed to update details")
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, "grey" | "blue" | "orange" | "green" | "red"> = {
      received: "grey",
      diagnosing: "blue",
      awaiting_approval: "orange",
      repairing: "blue",
      ready: "green",
      completed: "green",
      cancelled: "red",
    }
    return colors[status] || "grey"
  }

  if (loading) {
    return <Container><Text>Loading repair ticket...</Text></Container>
  }

  if (!ticket) {
    return <Container><Text>Repair ticket not found</Text></Container>
  }

  return (
    <div className="space-y-6">
      <Toaster />
      
      {/* Header */}
      <Container>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Heading level="h1">{ticket.ticket_number}</Heading>
              <Badge color={getStatusColor(ticket.status)}>
                {ticket.status.replace("_", " ")}
              </Badge>
              {ticket.technician_name && (
                <Badge color="purple">
                  {ticket.technician_name}
                </Badge>
              )}
            </div>
            {ticket.device && (
              <Text className="text-ui-fg-subtle mt-2">
                {ticket.device.brand} {ticket.device.model_name} - S/N: {ticket.device.serial_number}
              </Text>
            )}
          </div>
          <a href="/app/repairs">
            <Button variant="secondary">Back to List</Button>
          </a>
        </div>
      </Container>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Issue Details */}
          <Container>
            <Heading level="h2" className="mb-4">Issue Details</Heading>
            <div className="space-y-3">
              <div>
                <Label>Description</Label>
                <Text>{ticket.issue_description}</Text>
              </div>
              {ticket.accessories && (
                <div>
                  <Label>Accessories</Label>
                  <Text>{ticket.accessories}</Text>
                </div>
              )}
              <div>
                <Label>Created</Label>
                <Text>{new Date(ticket.created_at).toLocaleString()}</Text>
              </div>
            </div>
          </Container>

          {/* Cost Breakdown */}
          <Container>
            <Heading level="h2" className="mb-4">Cost Breakdown</Heading>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Text>Parts Estimate:</Text>
                <Text className="font-medium">${(ticket.parts_estimate / 100).toFixed(2)}</Text>
              </div>
              <div className="flex justify-between">
                <Text>Labor Estimate:</Text>
                <Text className="font-medium">${(ticket.labor_estimate / 100).toFixed(2)}</Text>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <Text>Total Estimate:</Text>
                <Text>${(ticket.total_estimate / 100).toFixed(2)}</Text>
              </div>
              {ticket.is_approved && (
                <Badge color="green" size="small" className="mt-2">
                  Approved on {new Date(ticket.approved_at!).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </Container>

          {/* Media */}
          {ticket.media && ticket.media.length > 0 && (
            <Container>
              <Heading level="h2" className="mb-4">Media</Heading>
              <div className="grid grid-cols-2 gap-3">
                {ticket.media.map((media) => (
                  <a
                    key={media.id}
                    href={media.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square rounded border overflow-hidden hover:opacity-80"
                  >
                    <img
                      src={media.file_url}
                      alt="Repair media"
                      className="w-full h-full object-cover"
                    />
                    <ArrowUpRightOnBox className="absolute top-2 right-2 text-white" size={16} />
                  </a>
                ))}
              </div>
            </Container>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Update Status */}
          <Container>
            <Heading level="h2" className="mb-4">Update Details</Heading>
            <div className="space-y-4">
              <div>
                <Label>Technician</Label>
                <Input
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  placeholder="Assign technician"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="received">Received</Select.Item>
                    <Select.Item value="diagnosing">Diagnosing</Select.Item>
                    <Select.Item value="awaiting_approval">Awaiting Approval</Select.Item>
                    <Select.Item value="repairing">Repairing</Select.Item>
                    <Select.Item value="ready">Ready</Select.Item>
                    <Select.Item value="completed">Completed</Select.Item>
                    <Select.Item value="cancelled">Cancelled</Select.Item>
                  </Select.Content>
                </Select>
              </div>
              <div>
                <Label>Labor Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Estimated Completion</Label>
                <Input
                  type="date"
                  value={etc}
                  onChange={(e) => setEtc(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateStatus} variant="secondary" className="flex-1">
                  Update Status
                </Button>
                <Button onClick={handleUpdateCosts} variant="primary" className="flex-1">
                  Save Details
                </Button>
              </div>
            </div>
          </Container>

          {/* Notes */}
          <Container>
            <Heading level="h2" className="mb-4">Internal Notes</Heading>
            <div className="space-y-3">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows={3}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="internal"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                />
                <Label htmlFor="internal">Internal only (not visible to customer)</Label>
              </div>
              <Button onClick={handleAddNote} variant="secondary" className="w-full">
                Add Note
              </Button>
              
              {ticket.notes && ticket.notes.length > 0 && (
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                  {ticket.notes.map((note) => (
                    <div key={note.id} className="p-3 bg-ui-bg-subtle rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <Badge color={note.is_internal ? "orange" : "blue"} size="small">
                          {note.is_internal ? "Internal" : "Customer Visible"}
                        </Badge>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          {new Date(note.created_at).toLocaleString()}
                        </Text>
                      </div>
                      <Text size="small">{note.content}</Text>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Container>

          {/* Chat */}
          <Container>
            <div className="flex items-center gap-2 mb-4">
              <ChatBubbleLeftRight size={20} />
              <Heading level="h2">Customer Chat</Heading>
            </div>
            <div className="space-y-3">
              {ticket.updates && ticket.updates.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                  {ticket.updates.map((update) => (
                    <div
                      key={update.id}
                      className={`p-3 rounded ${
                        update.sender_type === "customer"
                          ? "bg-ui-bg-subtle"
                          : "bg-blue-50 ml-8"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge size="small">
                          {update.sender_type === "customer" ? "Customer" : "Technician"}
                        </Badge>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          {new Date(update.created_at).toLocaleString()}
                        </Text>
                      </div>
                      <Text size="small">{update.message}</Text>
                    </div>
                  ))}
                </div>
              )}
              
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message to customer..."
                rows={2}
              />
              <Button onClick={handleSendMessage} variant="primary" className="w-full">
                Send Message
              </Button>
            </div>
          </Container>
        </div>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Repair Detail",
})

export default RepairDetailPage
