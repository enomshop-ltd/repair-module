import { defineRouteConfig } from "@medusajs/admin-sdk";
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
} from "@medusajs/ui";
import { useEffect, useState } from "react";
import { ArrowUpRightOnBox, ChatBubbleLeftRight, Trash, Bell } from "@medusajs/icons";

// Get id from URL path
const useParams = () => {
  const path = window.location.pathname;
  const parts = path.split("/");
  const id = parts[parts.length - 1];
  return { id };
};

type RepairTicket = {
  id: string;
  ticket_number: string;
  status: string;
  technician_id?: string;
  technician_name?: string;
  issue_description: string;
  accessories?: string;
  parts_estimate: number;
  labor_estimate: number;
  total_estimate: number;
  parts_actual: number;
  labor_actual: number;
  total_actual: number;
  is_approved: boolean;
  approved_at?: string;
  warranty_months: number;
  warranty_expiry?: string;
  estimated_completion?: string;
  completed_at?: string;
  collected_at?: string;
  created_at: string;
  terms_accepted?: boolean;
  data_wiped_consent?: boolean;
  device?: {
    serial_number: string;
    model_name: string;
    brand: string;
  };
  parts?: Array<{
    id: string;
    title: string;
    sku?: string;
  }>;
  custom_parts?: Array<{
    name: string;
    price: number;
  }>;
  media?: Array<{
    id: string;
    file_url: string;
    file_type: string;
    created_at: string;
  }>;
  notes?: Array<{
    id: string;
    content: string;
    is_internal: boolean;
    created_at: string;
  }>;
  updates?: Array<{
    id: string;
    message: string;
    author_type: string;
    author_id?: string;
    created_at: string;
  }>;
};

const RepairDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newStatus, setNewStatus] = useState("");
  const [unifiedMessage, setUnifiedMessage] = useState("");
  const [messageType, setMessageType] = useState<"chat" | "internal_note" | "public_note">("chat");
  const [technicianName, setTechnicianName] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [etc, setEtc] = useState("");

  // Parts states
  const [inventoryParts, setInventoryParts] = useState<any[]>([]);
  const [selectedInventoryPart, setSelectedInventoryPart] =
    useState<string>("");
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [customPartName, setCustomPartName] = useState("");
  const [customPartPrice, setCustomPartPrice] = useState("");

  const [users, setUsers] = useState<any[]>([]);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  useEffect(() => {
    // load technicians/users immediately
    fetch("/admin/users", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          setUsers(data.users);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/admin/repairs/${id}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch ticket");
      }

      const t = data.repair_ticket;

      // Handle BigNumber serialization correctly which can be an object or string
      const parseNum = (val: any) => {
        if (typeof val === "object" && val !== null && "value" in val)
          return Number(val.value);
        if (val !== undefined) return Number(val);
        return 0;
      };

      t.labor_estimate = parseNum(t.labor_estimate);
      t.parts_estimate = parseNum(t.parts_estimate);
      t.total_estimate = parseNum(t.total_estimate);
      t.labor_actual = parseNum(t.labor_actual);
      t.parts_actual = parseNum(t.parts_actual);
      t.total_actual = parseNum(t.total_actual);
      t.custom_parts = t.custom_parts || [];

      setTicket(t);
      setNewStatus(t.status);
      setTechnicianName(t.technician_name || "");

      setLaborCost((t.labor_estimate / 100).toFixed(2));

      setEtc(
        t.estimated_completion ? t.estimated_completion.split("T")[0] : "",
      );

      // load inventory parts for selection
      loadInventoryParts();
    } catch (err) {
      console.error("Failed to load repair ticket:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryParts = async () => {
    try {
      const res = await fetch(`/admin/parts`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setInventoryParts(data.parts || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (id) {
      loadTicket();
    }
  }, [id]);

  const handleUpdateStatus = async () => {
    try {
      await fetch(`/admin/repairs/${id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success("Status updated");
      loadTicket();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleAddInventoryPart = async () => {
    if (!selectedInventoryPart) return;
    try {
      setIsAddingPart(true);
      await fetch(`/admin/repairs/${id}/parts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_ids: [selectedInventoryPart] }),
      });
      toast.success("Inventory part added");
      setSelectedInventoryPart("");
      loadTicket();
    } catch (err) {
      toast.error("Failed to add part");
    } finally {
      setIsAddingPart(false);
    }
  };

  const handleRemoveInventoryPart = async (variantId: string) => {
    try {
      setIsAddingPart(true);
      await fetch(`/admin/repairs/${id}/parts/${variantId}`, {
        method: "DELETE",
        credentials: "include",
      });
      toast.success("Inventory part removed");
      loadTicket();
    } catch (err) {
      toast.error("Failed to remove part");
    } finally {
      setIsAddingPart(false);
    }
  };

  const handleAddCustomPart = async () => {
    if (!customPartName || customPartPrice === "") return;
    try {
      setIsAddingPart(true);
      await fetch(`/admin/repairs/${id}/custom-parts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customPartName,
          price: Number(customPartPrice),
        }),
      });
      toast.success("Custom part added");
      setCustomPartName("");
      setCustomPartPrice("");
      loadTicket();
    } catch (err) {
      toast.error("Failed to add custom part");
    } finally {
      setIsAddingPart(false);
    }
  };

  const handleSendUnified = async () => {
    if (!unifiedMessage.trim()) return;
    try {
      if (messageType === "chat") {
        await fetch(`/admin/repairs/${id}/messages`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: unifiedMessage }),
        });
        toast.success("Message sent");
      } else {
        await fetch(`/admin/repairs/${id}/notes`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: unifiedMessage,
            is_internal: messageType === "internal_note",
          }),
        });
        toast.success("Note added");
      }
      setUnifiedMessage("");
      loadTicket();
    } catch (err) {
      toast.error("Failed to add entry");
    }
  };

  const handleSendReminder = async () => {
    try {
      setIsSendingReminder(true);
      await fetch(`/admin/repairs/${id}/remind`, {
        method: "POST",
        credentials: "include",
      });
      toast.success("Reminder sent successfully");
    } catch (err) {
      toast.error("Failed to send reminder");
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleUpdateCosts = async () => {
    try {
      const promises = [];
      if (laborCost !== "") {
        const laborAmount = Math.round(parseFloat(laborCost) * 100);
        if (!isNaN(laborAmount)) {
          promises.push(
            fetch(`/admin/repairs/${id}/costs`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                labor_estimate: laborAmount,
              }),
            }),
          );
        }
      }
      promises.push(
        fetch(`/admin/repairs/${id}/details`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estimated_completion: etc ? new Date(etc).toISOString() : null,
            technician_name: technicianName || null,
          }),
        }),
      );
      if (ticket && newStatus !== ticket.status) {
        promises.push(
          fetch(`/admin/repairs/${id}/status`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          }),
        );
      }
      await Promise.all(promises);
      toast.success("Details updated");
      loadTicket();
    } catch (err) {
      toast.error("Failed to update details");
    }
  };

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
      <Container>
        <Text>Loading repair ticket...</Text>
      </Container>
    );
  }

  if (!ticket) {
    return (
      <Container>
        <Text>Repair ticket not found</Text>
      </Container>
    );
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
                <Badge color="purple">{ticket.technician_name}</Badge>
              )}
            </div>
            {ticket.device && (
              <Text className="text-ui-fg-subtle mt-2">
                {ticket.device.brand} {ticket.device.model_name} - S/N:{" "}
                {ticket.device.serial_number}
              </Text>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleSendReminder}
              disabled={isSendingReminder}
            >
              <Bell className="mr-1" /> Send Reminder
            </Button>
            <a href="/app/repairs">
              <Button variant="secondary">Back to List</Button>
            </a>
          </div>
        </div>
      </Container>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Issue Details */}
          <Container>
            <Heading level="h2" className="mb-4">
              Issue Details
            </Heading>
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
              <div className="pt-3 border-t">
                <Label>Legal & Compliance</Label>
                <div className="flex flex-col gap-2 mt-2">
                  <Badge
                    color={ticket.terms_accepted ? "green" : "red"}
                    size="small"
                  >
                    Terms {ticket.terms_accepted ? "Accepted" : "Not Accepted"}
                  </Badge>
                  <Badge
                    color={ticket.data_wiped_consent ? "green" : "grey"}
                    size="small"
                  >
                    Data Wipe{" "}
                    {ticket.data_wiped_consent ? "Consented" : "Not Consented"}
                  </Badge>
                </div>
              </div>
            </div>
          </Container>

          {/* Cost Breakdown */}
          <Container>
            <Heading level="h2" className="mb-4">
              Cost Breakdown
            </Heading>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Text>Parts Estimate:</Text>
                <Text className="font-medium">
                  ${(ticket.parts_estimate / 100).toFixed(2)}
                </Text>
              </div>
              <div className="flex justify-between">
                <Text>Labor Estimate:</Text>
                <Text className="font-medium">
                  ${(ticket.labor_estimate / 100).toFixed(2)}
                </Text>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <Text>Total Estimate:</Text>
                <Text>${(ticket.total_estimate / 100).toFixed(2)}</Text>
              </div>
              {ticket.is_approved && (
                <Badge color="green" size="small" className="mt-2">
                  Approved on{" "}
                  {new Date(ticket.approved_at!).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </Container>

          {/* Parts */}
          <Container>
            <Heading level="h2" className="mb-4">
              Parts & Inventory
            </Heading>

            <div className="space-y-4 mb-6">
              {ticket.parts && ticket.parts.length > 0 && (
                <div className="space-y-2">
                  <Label>Inventory Parts Used</Label>
                  {ticket.parts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 bg-ui-bg-subtle rounded border text-sm"
                    >
                      <div className="flex flex-col">
                        <Text>{p.title}</Text>
                        <Text className="text-ui-fg-subtle text-xs">
                          {p.sku || "-"}
                        </Text>
                      </div>
                      <Button
                        variant="transparent"
                        className="text-ui-fg-muted hover:text-ui-fg-base"
                        onClick={() => handleRemoveInventoryPart(p.id)}
                        disabled={isAddingPart}
                      >
                        <Trash />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {ticket.custom_parts && ticket.custom_parts.length > 0 && (
                <div className="space-y-2">
                  <Label>Custom Parts</Label>
                  {ticket.custom_parts.map((cp, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between p-2 bg-ui-bg-subtle rounded border text-sm"
                    >
                      <Text>{cp.name}</Text>
                      <Text className="font-medium">
                        ${(cp.price / 100).toFixed(2)}
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t">
              <Heading level="h3" className="text-sm">
                Add Inventory Part
              </Heading>
              <div className="flex gap-2">
                <Select
                  value={selectedInventoryPart}
                  onValueChange={setSelectedInventoryPart}
                >
                  <Select.Trigger className="flex-1">
                    <Select.Value placeholder="Select variant..." />
                  </Select.Trigger>
                  <Select.Content>
                    {inventoryParts.map((p) => (
                      <Select.Item key={p.id} value={p.id}>
                        {p.title} {p.sku ? `(${p.sku})` : ""}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                <Button
                  variant="secondary"
                  onClick={handleAddInventoryPart}
                  disabled={isAddingPart || !selectedInventoryPart}
                >
                  Add
                </Button>
              </div>

              <Heading level="h3" className="text-sm mt-4">
                Add Custom Part
              </Heading>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="Part description"
                  value={customPartName}
                  onChange={(e) => setCustomPartName(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  className="w-24"
                  placeholder="Cost"
                  value={customPartPrice}
                  onChange={(e) => setCustomPartPrice(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={handleAddCustomPart}
                  disabled={isAddingPart || !customPartName || !customPartPrice}
                >
                  Add
                </Button>
              </div>
            </div>
          </Container>

          {/* Media */}
          {ticket.media && ticket.media.length > 0 && (
            <Container>
              <Heading level="h2" className="mb-4">
                Media
              </Heading>
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
                    <ArrowUpRightOnBox
                      className="absolute top-2 right-2 text-white"
                      size={16}
                    />
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
            <Heading level="h2" className="mb-4">
              Update Details
            </Heading>
            <div className="space-y-4">
              <div>
                <Label>Technician</Label>
                <Select
                  value={technicianName}
                  onValueChange={setTechnicianName}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Assign technician" />
                  </Select.Trigger>
                  <Select.Content>
                    {users.map((user) => (
                      <Select.Item
                        key={user.id}
                        value={`${user.first_name} ${user.last_name}`}
                      >
                        {user.first_name} {user.last_name} ({user.email})
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
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
                    <Select.Item value="awaiting_approval">
                      Awaiting Approval
                    </Select.Item>
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
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleUpdateCosts}
                  variant="primary"
                  className="w-full"
                >
                  Save Details
                </Button>
              </div>
            </div>
          </Container>

          {/* Timeline & Communication */}
          <Container>
            <div className="flex items-center gap-2 mb-4">
              <ChatBubbleLeftRight size={20} />
              <Heading level="h2">Timeline & Communication</Heading>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2 max-h-80 overflow-y-auto mb-4 border rounded bg-ui-bg-subtle/50 p-2">
                {(() => {
                  const items = [
                    ...((ticket.notes || []) as any[]).map((n) => ({ ...n, entryType: "note" })),
                    ...((ticket.updates || []) as any[]).map((u) => ({ ...u, entryType: "update" })),
                  ].sort(
                    (a, b) =>
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime(),
                  );
                  
                  if (items.length === 0) {
                    return <Text className="text-ui-fg-muted p-2 text-center text-sm">No activity yet.</Text>;
                  }

                  return items.map((item) => (
                    <div
                      key={`${item.entryType}_${item.id}`}
                      className={`p-3 rounded border bg-ui-bg-base ${
                        item.entryType === "update" && item.author_type !== "customer" ? "ml-8" : 
                        item.entryType === "update" && item.author_type === "customer" ? "mr-8" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {item.entryType === "note" ? (
                          <Badge color={item.is_internal ? "orange" : "blue"} size="small">
                            {item.is_internal ? "Internal Note" : "Public Note"}
                          </Badge>
                        ) : (
                          <Badge color={item.author_type === "customer" ? "green" : "purple"} size="small">
                            {item.author_type === "customer" ? "Customer Msg" : "Technician Msg"}
                          </Badge>
                        )}
                        <Text size="xsmall" className="text-ui-fg-muted">
                          {new Date(item.created_at).toLocaleString()}
                        </Text>
                      </div>
                      <Text size="small" className="whitespace-pre-wrap">
                        {item.entryType === "note" ? item.content : item.message}
                      </Text>
                    </div>
                  ));
                })()}
              </div>

              <div className="flex flex-col gap-2 p-3 bg-ui-bg-subtle rounded border">
                <Textarea
                  value={unifiedMessage}
                  onChange={(e) => setUnifiedMessage(e.target.value)}
                  placeholder="Type a message or note..."
                  rows={3}
                  className="bg-ui-bg-base"
                />
                <div className="flex items-center gap-2 mt-2">
                  <Select value={messageType} onValueChange={(val: any) => setMessageType(val)}>
                    <Select.Trigger className="w-[180px] bg-ui-bg-base">
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="chat">Message Customer</Select.Item>
                      <Select.Item value="internal_note">Internal Note</Select.Item>
                      <Select.Item value="public_note">Public Note</Select.Item>
                    </Select.Content>
                  </Select>
                  <Button
                    onClick={handleSendUnified}
                    variant="primary"
                    className="flex-1"
                  >
                    Send / Add
                  </Button>
                </div>
              </div>
            </div>
          </Container>
        </div>
      </div>
    </div>
  );
};

export const config = defineRouteConfig({
  label: "Repair Detail",
});

export default RepairDetailPage;
