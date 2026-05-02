import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Table, Badge, Button, Input, Select } from "@medusajs/ui"
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
        <Button variant="primary">Create Repair Ticket</Button>
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
                  <a href={`/app/dashboard/repairs/${ticket.id}`}>
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
