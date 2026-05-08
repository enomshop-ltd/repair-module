import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Badge, Text } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { useStoreCurrency } from "../lib/use-store-currency";

type RepairTicket = {
  id: string;
  ticket_number: string;
  status: string;
  technician_id?: string;
  technician_name?: string;
  issue_description: string;
  total_estimate: number;
  estimated_completion?: string;
  warranty_expiry?: string;
};

const RepairTicketWidget = () => {
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useStoreCurrency();

  useEffect(() => {
    fetch(`/admin/repairs`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setTickets(data.repair_tickets || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load repair tickets:", err);
        setLoading(false);
      });
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, "grey" | "blue" | "orange" | "green" | "red"> =
      {
        received: "grey",
        diagnosing: "blue",
        awaiting_approval: "orange",
        repairing: "blue",
        ready: "green",
        completed: "green",
        cancelled: "red",
      };
    return colors[status] || "grey";
  };

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <Text>Loading repairs...</Text>
      </Container>
    );
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Active Repair Tickets</Heading>
      </div>
      <div className="text-ui-fg-subtle px-6 py-4">
        {tickets.length === 0 ? (
          <Text>No active repair tickets</Text>
        ) : (
          <div className="space-y-3">
            {tickets.slice(0, 5).map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-start justify-between border-b pb-3 last:border-b-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Text className="font-medium">{ticket.ticket_number}</Text>
                    <Badge color={getStatusColor(ticket.status)} size="small">
                      {ticket.status.replace("_", " ")}
                    </Badge>
                    {ticket.technician_name && (
                      <Badge color="purple" size="small">
                        {ticket.technician_name}
                      </Badge>
                    )}
                  </div>
                  <Text size="small" className="text-ui-fg-subtle mt-1">
                    {ticket.issue_description.substring(0, 60)}
                    {ticket.issue_description.length > 60 ? "..." : ""}
                  </Text>
                  {ticket.estimated_completion && (
                    <Text size="xsmall" className="text-ui-fg-muted mt-1">
                      ETC:{" "}
                      {new Date(
                        ticket.estimated_completion,
                      ).toLocaleDateString()}
                    </Text>
                  )}
                </div>
                <div className="text-right">
                  <Text className="font-medium">
                    {formatCurrency(ticket.total_estimate)}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "customer.details.before",
});

export default RepairTicketWidget;
