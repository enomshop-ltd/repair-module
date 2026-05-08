import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Text } from "@medusajs/ui";
import { ChartBar } from "@medusajs/icons";
import { useEffect, useState } from "react";
import { useStoreCurrency } from "../../../lib/use-store-currency";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ReportsPage = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useStoreCurrency();

  useEffect(() => {
    fetch(`/admin/repairs/analytics`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((resData) => {
        setData(resData.analytics);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load analytics:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Loading reports...</Text>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container className="p-8">
        <Text>No analytics data available.</Text>
      </Container>
    );
  }

  const chartData = Object.keys(data.status_counts).map((key) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1).replace("_", " "),
    count: data.status_counts[key],
  }));

  return (
    <Container className="p-8">
      <div className="flex items-center gap-2 mb-8">
        <ChartBar className="text-ui-fg-subtle" />
        <Heading level="h1">Repair Analytics & Reports</Heading>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="p-6 border rounded-lg bg-ui-bg-base border-ui-border-base shadow-sm">
          <Text className="text-ui-fg-subtle mb-1">Total Repairs</Text>
          <Heading level="h2" className="text-3xl">
            {data.total_repairs}
          </Heading>
        </div>
        <div className="p-6 border rounded-lg bg-ui-bg-base border-ui-border-base shadow-sm">
          <Text className="text-ui-fg-subtle mb-1">
            Total Revenue (Estimated)
          </Text>
          <Heading level="h2" className="text-3xl">
            {formatCurrency(data.total_expected_revenue)}
          </Heading>
        </div>
        <div className="p-6 border rounded-lg bg-ui-bg-base border-ui-border-base shadow-sm">
          <Text className="text-ui-fg-subtle mb-1">Completed Repairs</Text>
          <Heading level="h2" className="text-3xl">
            {data.completed_count}
          </Heading>
        </div>
        <div className="p-6 border rounded-lg bg-ui-bg-base border-ui-border-base shadow-sm">
          <Text className="text-ui-fg-subtle mb-1">Avg Repair Time (Days)</Text>
          <Heading level="h2" className="text-3xl">
            {data.avg_repair_time_days.toFixed(1)}
          </Heading>
        </div>
      </div>

      <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6 shadow-sm h-96">
        <Heading level="h2" className="mb-6">
          Repairs by Status
        </Heading>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" name="Tickets" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Repair Reports",
  icon: ChartBar,
});

export default ReportsPage;
