import { Head } from "$fresh/runtime.ts";
import TrackRepairIsland from "./(_islands)/TrackRepairIsland.tsx";

export default function TrackRepairRoute() {
  // Pass the backend URL from the Fresh server environment (Deno.env) safely to the island.
  const backendUrl = Deno.env.get("MEDUSA_BACKEND_URL") || "http://localhost:9000";

  console.debug(`[TrackRepairRoute] Rendered with backendUrl: ${backendUrl}`);

  return (
    <>
      <Head>
        <title>Track Your Repair | My Repair Shop</title>
        <meta name="description" content="Track your device repair ticket status by entering your serial number." />
        <meta property="og:title" content="Track Your Repair" />
        <meta property="og:description" content="Track your device repair ticket status." />
      </Head>
      <div class="route-container">
        {/* Fresh 2.3+ partial injection placeholder if needed */}
        <div f-client-nav>
          <TrackRepairIsland backendUrl={backendUrl} />
        </div>
      </div>
    </>
  );
}
