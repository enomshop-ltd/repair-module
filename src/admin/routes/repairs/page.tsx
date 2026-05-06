import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Table, Badge, Button, Input, Select, FocusModal, Label, Textarea } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Wrench } from "@medusajs/icons"

type RepairTicket = {
  id: string
  ticket_number: string
  status: string
  technician_name?: string
  issue_description: string
  total_estimate: number
  created_at: string
  estimated_completion?: string
}

const RepairsPage = () => {
  const [tickets, setTickets] = useState<RepairTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Create Ticket Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newDevice, setNewDevice] = useState({ serial_number: "", model_name: "", brand: "", customer_id: "", imei: "", condition: "" })
  const [newTicket, setNewTicket] = useState({ customer_id: "", issue_description: "", accessories: "" })

  const loadTickets = () => {
    setLoading(true)
    fetch(`/admin/repairs`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setTickets(data.repair_tickets || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load repair tickets:", err)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadTickets()
  }, [])

  const handleCreateTicket = async () => {
    try {
      setIsCreating(true)
      const res = await fetch(`/admin/repairs`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device: {
            serial_number: newDevice.serial_number,
            model_name: newDevice.model_name,
            brand: newDevice.brand,
            customer_id: newDevice.customer_id || undefined,
            imei: newDevice.imei || undefined,
            condition: newDevice.condition || undefined,
          },
          ticket: {
            customer_id: newTicket.customer_id || undefined,
            issue_description: newTicket.issue_description,
            accessories: newTicket.accessories || undefined,
          }
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to create repair ticket")
      }
      
      setCreateModalOpen(false)
      setNewDevice({ serial_number: "", model_name: "", brand: "", customer_id: "", imei: "", condition: "" })
      setNewTicket({ customer_id: "", issue_description: "", accessories: "" })
      loadTickets()
    } catch (err) {
      console.error(err)
      alert("Error: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsCreating(false)
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

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.issue_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.technician_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <Heading level="h1">Repair Tickets</Heading>
        <FocusModal open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <FocusModal.Trigger asChild>
            <Button variant="primary">Create Repair Ticket</Button>
          </FocusModal.Trigger>
          <FocusModal.Content>
            <FocusModal.Header>
              <Button variant="primary" onClick={handleCreateTicket} isLoading={isCreating}>
                Save Ticket
              </Button>
            </FocusModal.Header>
            <FocusModal.Body className="flex flex-col items-center py-16 overflow-y-auto">
              <div className="flex w-full max-w-lg flex-col gap-y-8">
                <div className="flex flex-col gap-y-2">
                  <Heading>Create Repair Ticket</Heading>
                  <p className="text-ui-fg-subtle text-sm">Add a new device and repair ticket.</p>
                </div>
                
                <div className="flex flex-col gap-y-4">
                  <Heading level="h2" className="text-lg">Device Details</Heading>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="brand">Brand *</Label>
                      <Input id="brand" value={newDevice.brand} onChange={(e) => setNewDevice({...newDevice, brand: e.target.value})} placeholder="Apple" />
                    </div>
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="model_name">Model Name *</Label>
                      <Input id="model_name" value={newDevice.model_name} onChange={(e) => setNewDevice({...newDevice, model_name: e.target.value})} placeholder="iPhone 13 Pro" />
                    </div>
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="serial_number">Serial Number *</Label>
                      <Input id="serial_number" value={newDevice.serial_number} onChange={(e) => setNewDevice({...newDevice, serial_number: e.target.value})} placeholder="SN12345678" />
                    </div>
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="imei">IMEI</Label>
                      <Input id="imei" value={newDevice.imei} onChange={(e) => setNewDevice({...newDevice, imei: e.target.value})} placeholder="Optional" />
                    </div>
                    <div className="flex flex-col gap-y-2 col-span-2">
                      <Label htmlFor="condition">Device Condition</Label>
                      <Input id="condition" value={newDevice.condition} onChange={(e) => setNewDevice({...newDevice, condition: e.target.value})} placeholder="Scratches on screen, etc." />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-y-4">
                  <Heading level="h2" className="text-lg">Ticket Details</Heading>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="customer_id">Customer ID</Label>
                      <Input id="customer_id" value={newTicket.customer_id} onChange={(e) => {
                        setNewTicket({...newTicket, customer_id: e.target.value});
                        setNewDevice({...newDevice, customer_id: e.target.value});
                      }} placeholder="cus_..." />
                    </div>
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="issue_description">Issue Description *</Label>
                      <Textarea id="issue_description" value={newTicket.issue_description} onChange={(e) => setNewTicket({...newTicket, issue_description: e.target.value})} placeholder="Screen is cracked and battery draining fast." />
                    </div>
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="accessories">Accessories Included</Label>
                      <Input id="accessories" value={newTicket.accessories} onChange={(e) => setNewTicket({...newTicket, accessories: e.target.value})} placeholder="Black case, charging cable" />
                    </div>
                  </div>
                </div>
              </div>
            </FocusModal.Body>
          </FocusModal.Content>
        </FocusModal>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <Select.Trigger>
            <Select.Value placeholder="Filter by status" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">All Statuses</Select.Item>
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

      {loading ? (
        <div className="text-center py-12">Loading repair tickets...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-12 text-ui-fg-subtle">
          <Wrench className="mx-auto mb-4" size={48} />
          <p>No repair tickets found</p>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Ticket #</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Technician</Table.HeaderCell>
              <Table.HeaderCell>Issue</Table.HeaderCell>
              <Table.HeaderCell>Estimate</Table.HeaderCell>
              <Table.HeaderCell>ETC</Table.HeaderCell>
              <Table.HeaderCell>Created</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filteredTickets.map((ticket) => (
              <Table.Row key={ticket.id}>
                <Table.Cell className="font-medium">{ticket.ticket_number}</Table.Cell>
                <Table.Cell>
                  <Badge color={getStatusColor(ticket.status)} size="small">
                    {ticket.status.replace("_", " ")}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {ticket.technician_name ? (
                    <Badge color="purple" size="small">
                      {ticket.technician_name}
                    </Badge>
                  ) : (
                    <span className="text-ui-fg-muted">Unassigned</span>
                  )}
                </Table.Cell>
                <Table.Cell className="max-w-xs truncate">
                  {ticket.issue_description}
                </Table.Cell>
                <Table.Cell>${(ticket.total_estimate / 100).toFixed(2)}</Table.Cell>
                <Table.Cell>
                  {ticket.estimated_completion
                    ? new Date(ticket.estimated_completion).toLocaleDateString()
                    : "-"}
                </Table.Cell>
                <Table.Cell>
                  {new Date(ticket.created_at).toLocaleDateString()}
                </Table.Cell>
                <Table.Cell>
                  <a href={`/app/repairs/${ticket.id}`}>
                    <Button variant="secondary" size="small">View</Button>
                  </a>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Repairs",
  icon: Wrench,
})

export default RepairsPage
