# FLCHRMS Product and Functional Specification

## 1. Product Scope
FLCHRMS is a web-based HR management system covering:
- Identity and role-based access
- Employee directory and profile management
- Leave request workflows (approval and cancellation)
- Attendance tracking
- Payroll periods, salary structures, deductions, and payslips
- Training enrollment tracking
- Performance review lifecycle
- Team calendar (leaves, holidays, department events)
- Document management
- Announcements
- In-app notifications and notification queue operations
- Administration surface for HR governance and policy configuration

The product is a React SPA backed by Supabase (Postgres, Auth, Storage, RPC).

## 2. Roles and Authority Model

### 2.1 Supported roles
- `employee`
- `manager`
- `general_manager`
- `hr`
- `director`
- `admin`

### 2.2 Authority tiers (UI governance model)
- Tier 1: `employee`
- Tier 2: `manager`
- Tier 3: `general_manager`
- Tier 4: `hr`
- Tier 5: `admin`
- Tier 6: `director`

Role assignment changes in Admin are guarded by tier comparison (`actor tier > target tier`).

### 2.3 Key capability rules
- Admin page access: `admin`, `hr`, `director`
- Employee directory access: `admin`, `hr`, `manager`, `general_manager`, `director`
- Payroll management: `hr`, `director`
- Document management: `hr`, `director`
- Holiday management: `hr`, `director`, `admin`
- Department event management: `manager`, `general_manager`, `hr`, `director`, `admin`
- Performance review conductor actions: all except `employee`
- Team leave visibility: all except `employee`
- Sensitive employee identifiers/contact fields are masked for `admin`

## 3. Route and Access Specification

| Route | Auth Required | Role Gate |
|---|---|---|
| `/auth` | No | None |
| `/dashboard` | Yes | Any authenticated role |
| `/leave` | Yes | Any authenticated role |
| `/notifications` | Yes | Any authenticated role |
| `/attendance` | Yes | Any authenticated role |
| `/training` | Yes | Any authenticated role |
| `/announcements` | Yes | Any authenticated role |
| `/profile` | Yes | Any authenticated role |
| `/payroll` | Yes | Any authenticated role (management actions gated in-page) |
| `/performance` | Yes | `manager`, `general_manager`, `hr`, `admin`, `director` |
| `/calendar` | Yes | `manager`, `general_manager`, `hr`, `admin`, `director` |
| `/documents` | Yes | `hr`, `director` |
| `/employees` | Yes | `admin`, `hr`, `manager`, `general_manager`, `director` |
| `/admin` | Yes | `admin`, `hr`, `director` |

Unknown routes resolve to NotFound.

## 4. Functional Modules

### 4.1 Authentication and Session
Implemented behavior:
- Sign in supports email, username, or employee ID as identifier.
- Non-email identifiers are resolved through `resolve_login_email` RPC.
- Accounts with profile status `inactive` or `terminated` are blocked during sign-in and during restored session checks.
- Sign up creates account with first/last name metadata.
- Password reset request flow and recovery mode are implemented in `/auth`.
- Idle timeout auto-signs out after 30 minutes of inactivity.

### 4.2 Dashboard
Implemented behavior:
- Role-aware dashboard widgets with default widget sets by role.
- Widget categories/tiers: `primary`, `secondary`, `supporting`.
- Managers and above see Quick Stats cards linked to detail pages.
- `customize` interaction mode is available (layout shell supports drag/resize/hide flows).
- Admin template action is exposed for `manager`, `general_manager`, and `hr`.
- Widget set includes: attendance, leave balance/pending approvals, announcements, training summary/overview, performance summary, team snapshot, on-leave roster, critical insights, executive metrics.

### 4.3 Leave Management
Implemented behavior:
- Users can submit leave requests with validation (type, date range, day count, optional reason/document).
- Leave request list is split into:
  - My current
  - My history
  - Team current (role-gated)
  - Team history (role-gated)
- Approvers can approve, reject, or request supporting document.
- Employees can amend rejected/document-requested requests via `amend_leave_request` RPC.
- Supporting documents are stored in `leave-documents` bucket using user-scoped paths.
- Cancellation flow supports:
  - Direct cancel for pending self-request (if eligible)
  - Cancellation request for final-approved leave
  - Multi-stage cancellation review by approvers
- Request detail dialog shows approval and cancellation timelines from `leave_request_events`.

Workflow behavior notes:
- Department-specific approval/cancellation workflow builders are available in Admin.
- Default route patterns exist in client workflow utilities and DB configuration.
- Server-side RPCs enforce authoritative stage transitions for approval/cancellation actions.

### 4.4 Attendance
Implemented behavior:
- Clock in creates daily attendance row; status becomes `late` if clock-in is after 9:00.
- Clock out updates same-day attendance row.
- Optimistic UI updates with rollback on mutation failure.
- Attendance history is available with status tagging.

### 4.5 Payroll
Implemented behavior:
- Management tabs (`payroll`, `salaries`, `deductions`) are available only to `hr` and `director`.
- All users can access `My Payslips` tab.
- Hide/show amounts preference is persisted in localStorage.
- Salary structures support allowances and active/effective lifecycle.
- Deduction model supports fixed and percentage deductions.
- Payroll period lifecycle is tracked.
- Payslip generation computes:
  - working days
  - days worked/absent/leave
  - prorated basic salary
  - allowance and deduction breakdowns
  - net salary
- Generation includes progress phases and duplicate-guard checks.

### 4.6 Training
Implemented behavior:
- List available programs.
- Enroll current user in a program.
- Track enrollment states (`enrolled`, `in_progress`, `completed`, `dropped`).
- Show enrolled program cards and available catalog.

### 4.7 Performance
Implemented behavior:
- Review conductors can create/submit reviews.
- Employees can view and acknowledge submitted reviews.
- Review content includes rating, strengths, improvement areas, and goals.
- Lifecycle statuses: `draft`, `submitted`, `acknowledged`.

### 4.8 Team Calendar
Implemented behavior:
- Calendar aggregates approved leave, holidays, and department events.
- Mobile agenda and desktop month grid views are implemented.
- Role-based management actions:
  - Add/delete holidays (HR/Director/Admin)
  - Add/delete department events (Manager and above)
- Employees cannot view leave type labels in calendar details.

### 4.9 Documents
Implemented behavior:
- HR/Director can upload employee documents into `employee-documents` bucket.
- Document metadata includes category, title, description, size, uploader, employee.
- Signed URL download flow is used.
- Deletion removes both storage object and metadata row.
- Non-managers only see their own documents by role/RLS scope.

### 4.10 Announcements
Implemented behavior:
- Active announcements are listed with priority and publish date.
- Announcement creation mutation exists in hooks for privileged flows.

### 4.11 Notifications
Implemented behavior:
- In-app notifications support:
  - unread badge
  - mark read/unread
  - mark all read
  - category/read-status filtering
  - paginated history
  - cleanup of old read notifications
- Notification preferences support per-category toggles for:
  - in-app notifications
  - email queueing preferences
- Notifications bell popover includes quick preference toggles.
- Notification queue admin operations (in Admin > Leave Policies > Notification Queue):
  - queue summary
  - worker run summary
  - dead-letter analytics
  - requeue/discard item actions
  - local threshold-driven queue health alerts

### 4.12 Employee Directory
Implemented behavior:
- Grid/list view with search and detail dialog.
- Role badges and status indicators.
- Sensitive fields are redacted for admin viewers.
- Data source is `get_employee_directory_profiles` RPC.

### 4.13 Admin Surface
Implemented behavior:
- Top-level tabs:
  - Employees
  - Departments
  - Roles
  - Leave Policies
- Leave Policies sub-tabs:
  - Leave Types
  - Workflow Builders
  - Workflow Audit
  - Notification Queue
- Employees tab supports:
  - filter/search
  - create employee
  - edit profile/alias
  - reset password
  - archive/restore
  - CSV export
  - batch update dialog
- Departments tab supports CRUD with safety checks.
- Roles tab supports role assignment changes with authority-tier restrictions.
- Leave policies support leave type CRUD.
- Workflow builders support department-scoped approval/cancellation routes for requester profile `employee`.
- Admin stats cards are customizable and persisted by user/role.

### 4.14 Profile
Implemented behavior:
- Tabs:
  - Overview
  - Update Profile
  - Notification Settings
- Update profile edits first name, last name, phone.
- Admin users are restricted in personal profile editing path (username alias governance is expected through Admin controls).

## 5. Cross-Cutting Functional Characteristics
- Theme switching is supported.
- Command palette navigation is available globally.
- Notification and workflow audit polling intervals are 30 seconds.
- Route-level auth and role checks are enforced by layout + protected route wrappers.
- Local UI preference persistence is implemented for:
  - sidebar collapse
  - dashboard layout/config
  - admin stats layout/config
  - leave display preferences
  - payroll amount visibility
  - floating notification widget visibility

## 6. In-Flight and Drift Notes
- An existing migration (`20260302100000_leave_display_config.sql`) introduces `leave_type_display_config` and `get_dashboard_leave_types`, but current UI leave display customization is localStorage-backed and does not yet consume this DB configuration.
- Frontend currently calls RPCs that are not present in generated `src/integrations/supabase/types.ts` (`approve_leave_request`, `get_dashboard_stats`, `get_executive_stats`, `notification_admin_combined_dashboard`). This indicates Supabase type generation drift and should be resolved in schema/type regeneration workflow.
