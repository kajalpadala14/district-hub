# Governance Tasks API

Base URL:

```text
http://127.0.0.1:4000
```

## Setup

Required `.env` values:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
API_PORT
```

Apply migrations:

```powershell
supabase.cmd link --project-ref <project-ref>
supabase.cmd db push
```

Create first backend admin:

```powershell
npm run api:create-user -- admin@example.com StrongPassword123 admin "Admin User"
```

Start API:

```powershell
npm run api:dev
```

## Authentication

### POST `/auth/login`

Request:

```json
{
  "email": "admin@example.com",
  "password": "StrongPassword123"
}
```

Response:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

Use the token:

```text
Authorization: Bearer <token>
```

## RBAC

- `admin`: full access, including delete.
- `manager`: create, assign, update, bulk edit.
- `employee`: view assigned tasks and update status only.

## Tasks

### POST `/tasks`

Admin/manager only.

```json
{
  "title": "Review school health records",
  "description": "Collect and review department records.",
  "priority": "important",
  "status": "pending",
  "due_date": "2026-07-20",
  "due_time": "17:00",
  "assigned_to": "backend-user-uuid",
  "department": "Education",
  "agency": "District Administration",
  "calendar_sync_enabled": false
}
```

### GET `/tasks`

Query filters:

```text
search
status
department
agency
priority
assigned_to
```

### GET `/tasks/:id`

Returns task details.

### PUT `/tasks/:id`

Admin/manager only. Accepts the same fields as create.

### DELETE `/tasks/:id`

Admin only.

### PATCH `/tasks/:id/status`

```json
{
  "status": "completed"
}
```

### POST `/tasks/:id/comments`

```json
{
  "comment": "Follow-up completed."
}
```

### POST `/tasks/:id/attachments`

```json
{
  "file_name": "report.pdf",
  "file_url": "https://example.com/report.pdf",
  "file_type": "application/pdf",
  "file_size": 120000
}
```

### PATCH `/tasks/bulk`

Admin/manager only.

```json
{
  "task_ids": ["uuid-1", "uuid-2"],
  "updates": {
    "priority": "high",
    "department": "Health"
  }
}
```

### GET `/tasks/export`

Returns CSV with the current filters.

## Backend Features

- JWT login and protected APIs.
- RBAC middleware.
- Task number auto-generation by PostgreSQL sequence.
- Search and filters.
- Bulk edit.
- CSV export.
- Audit logs in `task_activity_logs`.
- Overdue tasks are marked automatically during list calls.
- Assignment notifications in `task_notifications`.
- Calendar fields are stored and ready for Google Calendar sync integration.

## Security

- Service role key is server-only.
- JWT secret is server-only.
- Request body size limited to 2 MB.
- Rate limiting enabled.
- Input validation via Zod.
- Security headers applied.
- Central error handling avoids leaking stack traces.
