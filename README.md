# Repair Module API Documentation

## Overview
Complete Repair Management System for device repair shops with customer tracking, parts management, chat functionality, cost approval flow, and warranty tracking.

## Data Models

### Device
- `id`: Primary key
- `serial_number`: Unique device identifier
- `model_name`: Device model (e.g., "iPhone 14 Pro")
- `brand`: Device brand (e.g., "Apple")
- `customer_id`: Optional customer reference
- `imei`: Optional IMEI number
- `condition`: Device condition notes
- `metadata`: Extensible JSON field

### RepairTicket
- `id`: Primary key
- `ticket_number`: Unique ticket identifier (auto-generated: RT-{timestamp}-{random})
- `device`: Related device
- `customer_id`: Optional customer reference
- `technician_id`: Assigned technician ID
- `technician_name`: Assigned technician name (displayed in badge)
- **Status**: `received` | `diagnosing` | `awaiting_approval` | `repairing` | `ready` | `completed` | `cancelled`
- `issue_description`: Reported issue
- `accessories`: Included accessories
- **Cost Breakdown**:
  - `parts_estimate` / `labor_estimate` / `total_estimate`
  - `parts_actual` / `labor_actual` / `total_actual`
- **Approval**:
  - `is_approved`: Boolean
  - `approved_at`: Timestamp
- **Warranty**:
  - `warranty_months`: Default 3 months
  - `warranty_expiry`: Auto-calculated on completion
- `estimated_completion`: ETC for customer
- `completed_at` / `collected_at`: Timestamps

### RepairMedia
- `id`: Primary key
- `repair_ticket`: Related ticket
- `file_url`: S3 URL
- `file_name`: Original filename
- `file_type`: `image` | `video`
- `mime_type`: File MIME type
- `file_size`: Size in bytes
- `description`: Optional description

### RepairNote
- `id`: Primary key
- `repair_ticket`: Related ticket
- `content`: Note text
- `is_internal`: Boolean (hidden from customers if true)
- `author_id`: User/Customer ID
- `author_type`: `user` | `customer`

### RepairUpdate (Chat Messages)
- `id`: Primary key
- `repair_ticket`: Related ticket
- `message`: Message text
- `author_id`: User/Customer ID
- `author_type`: `user` | `customer`
- `is_read`: Boolean

## Admin API Endpoints

### Repair Tickets

#### GET /admin/repairs
List all repair tickets with pagination, filtering, and search.

**Query Parameters:**
- Standard pagination: `offset`, `limit`
- Fields selection: `fields`
- Filters: Any RepairTicket field

**Response:**
```json
{
  "repair_tickets": [...],
  "count": 10,
  "offset": 0,
  "limit": 20
}
```

#### POST /admin/repairs
Create a new repair ticket (device check-in).

**Request Body:**
```json
{
  "device": {
    "serial_number": "ABC123XYZ",
    "model_name": "iPhone 14 Pro",
    "brand": "Apple",
    "customer_id": "cus_123",
    "imei": "123456789012345",
    "condition": "Minor scratches on back"
  },
  "ticket": {
    "customer_id": "cus_123",
    "issue_description": "Screen cracked, not responding to touch",
    "accessories": "Charger, case"
  }
}
```

**Response:**
```json
{
  "repair_ticket": {...},
  "device": {...}
}
```

#### GET /admin/repairs/:id
Get single repair ticket with all related data (device, media, notes, updates, linked parts).

**Response:**
```json
{
  "repair_ticket": {
    "id": "rt_123",
    "ticket_number": "RT-1234567890-ABC123",
    "status": "diagnosing",
    "device": {...},
    "media": [...],
    "notes": [...],
    "updates": [...],
    "parts": [...]  // Linked ProductVariants
  }
}
```

#### POST /admin/repairs/:id/status
Update repair status.

**Request Body:**
```json
{
  "status": "repairing",
  "estimated_completion": "2026-05-01T10:00:00Z",
  "previous_status": "awaiting_approval"
}
```

**Triggers:** `repair.status_changed` event for notifications

#### POST /admin/repairs/:id/parts
Add parts to repair (links ProductVariants to RepairTicket). Supports customer-specific pricing through price groups.

**Request Body:**
```json
{
  "variant_ids": ["pv_123", "pv_456"],
  "customer_id": "cus_123",
  "region_id": "reg_123"
}
```

**Notes:**
- If `customer_id` and `region_id` are provided, the system will fetch customer-specific prices from price lists/groups
- Price metadata is returned including price list information
- This ensures B2B customers with special pricing get accurate repair cost estimates

#### POST /admin/repairs/:id/costs
Update repair cost estimates or actuals.

**Request Body:**
```json
{
  "parts_estimate": 150.00,
  "labor_estimate": 75.00,
  "parts_actual": 145.00,
  "labor_actual": 75.00
}
```

**Notes:**
- `total_estimate` and `total_actual` are auto-calculated
- Amounts are in base currency units (e.g., $150.00 = 150)

#### POST /admin/repairs/:id/media
Upload media (defect photos/videos).

**Request Body:**
```json
{
  "file_url": "https://s3.amazonaws.com/.../image.jpg",
  "file_name": "cracked_screen.jpg",
  "file_type": "image",
  "mime_type": "image/jpeg",
  "file_size": 2048000,
  "description": "Front screen crack"
}
```

**Notes:**
- File must be uploaded to S3 first
- Use Medusa's FileService for uploads

#### POST /admin/repairs/:id/notes
Add internal or client-visible notes.

**Request Body:**
```json
{
  "content": "Replaced screen assembly. Tested touch response - working perfectly.",
  "is_internal": false
}
```

**Notes:**
- `author_id` and `author_type` are auto-set from authenticated user
- Internal notes (`is_internal: true`) are hidden from customers

#### POST /admin/repairs/:id/messages
Send message in repair chat.

**Request Body:**
```json
{
  "message": "Hi, we've completed the diagnosis. The screen needs replacement."
}
```

## Storefront API Endpoints

### Repair Tracking

#### GET /store/repairs/:serial_number
Track repair by device serial number.

**Path Parameter:**
- `serial_number`: Device serial number (e.g., "ABC123XYZ")

**Response:**
```json
{
  "device": {...},
  "repair_tickets": [
    {
      "id": "rt_123",
      "ticket_number": "RT-1234567890-ABC123",
      "status": "repairing",
      "issue_description": "...",
      "total_estimate": 225.00,
      "estimated_completion": "2026-05-01T10:00:00Z",
      "notes": [...],  // Only non-internal notes
      "updates": [...],
      "media": [...]
    }
  ]
}
```

**Notes:**
- Internal notes are filtered out
- Useful for QR code or SMS link: `/track?sn=ABC123XYZ`

#### POST /store/repairs/:id/approve
Customer approves repair cost.

**Response:**
```json
{
  "repair_ticket": {...},
  "message": "Repair cost approved successfully. Work will begin shortly."
}
```

**Side Effects:**
- Sets `is_approved: true` and `approved_at`
- Automatically updates status to `"repairing"`

#### GET /store/repairs/:id/messages
Get chat messages for repair.

**Response:**
```json
{
  "messages": [
    {
      "id": "upd_123",
      "message": "Hi, how long will the repair take?",
      "author_type": "customer",
      "created_at": "..."
    }
  ]
}
```

#### POST /store/repairs/:id/messages
Send message in repair chat (customer side).

**Request Body:**
```json
{
  "message": "Can you also check the battery health while you have it open?"
}
```

**Notes:**
- Requires customer authentication
- `author_id` and `author_type` are auto-set from authenticated customer

## Workflows

### createRepairTicketWorkflow
Creates device + repair ticket atomically.

**Input:**
```typescript
{
  device: {
    serial_number: string
    model_name: string
    brand: string
    customer_id?: string
    imei?: string
    condition?: string
  },
  ticket: {
    customer_id?: string
    issue_description: string
    accessories?: string
  }
}
```

**Rollback:** Deletes both device and ticket if any step fails.

### updateRepairStatusWorkflow
Updates status and emits event.

**Input:**
```typescript
{
  repair_ticket_id: string
  status: "received" | "diagnosing" | "awaiting_approval" | "repairing" | "ready" | "completed" | "cancelled"
  estimated_completion?: Date
  previous_status?: string
}
```

**Side Effects:**
- If status is `"completed"`:
  - Sets `completed_at` to now
  - Calculates `warranty_expiry` (now + `warranty_months`)
- Emits `repair.status_changed` event

### approveRepairCostWorkflow
Approves cost and starts repair.

**Input:**
```typescript
{
  repair_ticket_id: string
}
```

**Side Effects:**
- Sets `is_approved: true` and `approved_at`
- Changes status to `"repairing"`

### addRepairPartsWorkflow
Links ProductVariants to RepairTicket.

**Input:**
```typescript
{
  repair_ticket_id: string
  variant_ids: string[]
}
```

**Use Case:** Technician selects parts from Medusa inventory for repair.

## Events

### repair.status_changed
Emitted when repair status changes.

**Payload:**
```typescript
{
  repair_ticket_id: string
  status: string
  previous_status?: string
}
```

**Use Case:** Send SMS/WhatsApp/Email notifications to customer.

**Example Subscriber:**
```typescript
// src/subscribers/repair-status-changed.ts
// Already implemented - add your notification service logic
```

## Suggested Features to Add

### 1. Automated Status Notifications
Integrate SMS/WhatsApp API in the existing subscriber (`repair-status-changed.ts`).

**Example message:**
> "Hi John, your iPhone 14 Pro (Serial: ABC123) is now under diagnosis. View progress: https://yourstore.com/track?sn=ABC123"

### 2. Digital Intake Form & PDF Receipts
Generate PDF job card with QR code when device is checked in.

### 3. Warranty Tracking
- Already implemented: `warranty_months`, `warranty_expiry`
- Add check in check-in flow: if device returns within warranty window, flag as "re-repair"

### 4. Labor vs Parts Breakdown
- Already implemented: separate `parts_*` and `labor_*` fields
- Use for tax compliance and reporting

### 5. ETC Progress Bar
- Already implemented: `estimated_completion`
- Display progress bar on storefront: "60% complete - Ready by Wednesday"

## Module Links

### RepairTicket <> ProductVariant
Tracks parts used in repairs.

**Link Table:** `repair_repair_ticket_product_product_variant`

**Query with linked parts:**
```typescript
const { data } = await query.graph({
  entity: "repair_ticket",
  fields: ["*", "product_variant.*"],
  filters: { id: "rt_123" }
})
```

## File Uploads

Use Medusa's FileService with pre-configured S3 storage:

```typescript
// In API route
import multer from "multer"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const upload = multer({ storage: multer.memoryStorage() })

export async function POST(req: any, res: any) {
  const fileService = req.scope.resolve(ContainerRegistrationKeys.FILE)
  
  const uploadResult = await fileService.upload({
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
  })
  
  // Then create RepairMedia with uploadResult.url
}
```

## Storefront Integration

The Repair Module includes a complete storefront interface for customer repair tracking. The storefront pages have been converted from Next.js to Freshjs v2.3 to easily drop into existing Freshjs storefronts.

### Storefront Route

**Location:** `routes/repairs/track.tsx`
**Client Island:** `routes/repairs/(_islands)/TrackRepairIsland.tsx`

**Features:**
- Serial number search to find repair tickets
- Real-time status display with progress bar
- Cost breakdown with approval flow
- Media gallery (device photos)
- Timeline with ETC and warranty info
- Customer-visible notes and updates
- Inline cost approval button
- Built-in Freshjs partial support for SPA-like navigation
- Seamless Github-style loading bar via `islands/TopProgressBarIsland.tsx`

### Adding to Navigation

Add a link to your Freshjs storefront navigation using `f-client-nav` for partial SPA navigation:

```tsx
<a href="/repairs/track" f-client-nav>Track Repair</a>
```

### QR Code Integration

Generate QR codes linking to tracking page with serial number:

```
https://yourstore.com/us/repairs/track?sn=ABC123XYZ
```

Then pre-fill the search field on page load by reading the `sn` query parameter.

### SMS/WhatsApp Links

Send customers direct links to track their repairs:

```
Hi John, track your repair here: https://yourstore.com/us/repairs/track?sn=ABC123
```

## Admin UI Extensions

The Repair Module includes complete admin dashboard integration.

### Admin Pages

1. **Repair List Page** (`/app/repairs`)
   - View all repair tickets
   - Search and filter by status, technician, serial number
   - Quick status overview with badges
   - Links to detail pages

2. **Repair Detail Page** (`/app/repairs/:id`)
   - Full ticket information with device details
   - Technician assignment with badge display
   - Status management
   - Cost breakdown and labor cost input
   - ETC scheduling
   - Internal notes management
   - Customer chat interface
   - Media gallery

### Admin Widgets

**Repair Ticket Widget** (displays on order details pages)
- Shows active repair tickets
- Status badges with color coding
- Technician badges
- Quick cost overview

### Accessing Admin UI

Navigate to **Repairs** in your admin dashboard sidebar. The icon is a wrench.

## Price Groups Integration

When adding parts to a repair ticket, the system automatically respects customer price groups:

1. Admin adds parts via `/admin/repairs/:id/parts` with `customer_id` and `region_id`
2. System queries Medusa's pricing engine with customer context
3. Customer-specific prices from price lists/groups are fetched
4. Price metadata is stored for accurate estimates
5. Works seamlessly with B2B pricing, volume discounts, and special customer rates

This ensures repair cost estimates reflect the actual prices the customer would pay for parts.

## Technician Management

Repair tickets include technician assignment fields:
- `technician_id`: Link to your user/employee system
- `technician_name`: Display name shown in badges throughout UI

Technician badges appear:
- In repair list table
- On repair detail page header
- In the active repairs widget
- In customer-facing status updates (optional)

## Recent Updates / Changelog (April 2026)

1. **Storefront Optimization (Fresh.js):** Converted the Next.js storefront implementation to Fresh.js v2.3+ to ensure seamless drop-in compatibility with Deno/Fresh environments.
2. **Co-located Islands:** Centralized routing and island components within `storefront/routes/repairs/` (e.g. `(_islands)/TrackRepairIsland.tsx`), allowing isolated drag-and-drop capability into existing applications without muddying the global islands folder.
3. **Partial Navigation UI:** Implemented a GitHub-style `TopProgressBarIsland` to handle client-side routing events and partial loading transitions.
4. **Backend API Types Fixes:** Corrected strict TypeScript validation typings in all Medusa `/admin` and `/store` routes (`req.validatedBody` handling) for media uploads, cost breakdowns, status update, parts, notes, and messages endpoints.
5. **Workflow Dependencies Fix:** Resolved filename path issues for `update-repair-status-workflow` and cleaned up input props for `AddRepairPartsWorkflowInput` to match workflow requirements precisely.
6. **Middleware Configuration:** Consolidated and fixed middleware import paths into `src/api/middlewares.ts`.
7. **Package Cleanup:** Removed unused Next.js-centric and Tanstack dependencies (`@tanstack/react-query`, `@tanstack/react-router`) from `package.json` to keep the plugin lean.
8. **Build Tooling:** Updated `tsconfig.json` to explicitly handle `.tsx` component parsing correctly by including the new `storefront` folder.

## Next Steps

1. **Notification Integration:** Add SMS/WhatsApp/Email in subscriber (`src/subscribers/repair-status-changed.ts`)
2. **File Upload Routes:** Add multer-based upload endpoints for media
3. **PDF Generation:** Job cards and receipts with QR codes
4. **Reporting:** Analytics on repair times, costs, warranty claims
5. **Customer Accounts:** Link repairs to customer dashboard
6. **Inventory Integration:** Auto-deduct parts when repair is completed

---

**Built with Medusa 2.13.5**
