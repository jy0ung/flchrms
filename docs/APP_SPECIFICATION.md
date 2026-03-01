# FLCHRMS — Application Specification

**Document Version:** 1.0  
**Date:** March 1, 2026  
**Repository:** `jy0ung/flchrms`  
**Branch:** `development`

---

## 1. Executive Summary

FLCHRMS is a full-stack **Human Resource Management System (HRMS)** web application designed for small-to-medium organizations. It provides comprehensive workforce management capabilities including employee lifecycle management, multi-level leave approval workflows, attendance tracking, payroll processing, performance reviews, training program management, and an event-driven notification system.

The system enforces a **six-role RBAC model** (`employee`, `manager`, `general_manager`, `hr`, `director`, `admin`) with database-level Row-Level Security (RLS), ensuring data isolation and access control at every layer.

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend Runtime** | React | 18.x |
| **Language** | TypeScript | 5.8.x |
| **Build Tool** | Vite | 5.4.x |
| **UI Framework** | Tailwind CSS + shadcn/ui (Radix primitives) | 3.4.x |
| **State & Data Fetching** | TanStack React Query | 5.x |
| **Routing** | React Router DOM | 6.30.x |
| **Form Management** | React Hook Form + Zod | 7.x / 3.x |
| **Backend (BaaS)** | Supabase (PostgreSQL, Auth, Storage, RPC) | 2.91.x |
| **Theming** | next-themes | 0.3.x |
| **Charts** | Recharts | 2.15.x |
| **Icons** | Lucide React | 0.462.x |
| **Notifications (UI)** | Sonner | 1.7.x |
| **Unit Testing** | Vitest + Testing Library + jsdom | 3.2.x |
| **E2E Testing** | Playwright (Chromium) | 1.58.x |
| **Linting** | ESLint + typescript-eslint | 9.x |

---

## 3. Architecture Overview

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                 React SPA (Vite)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │  Pages   │  │  Hooks   │  │  Components   │ │
│  │ (Lazy)   │──│ (TanStack│──│ (shadcn/ui +  │ │
│  │          │  │  Query)  │  │  Radix)       │ │
│  └────┬─────┘  └────┬─────┘  └───────────────┘ │
│       │              │                           │
│  ┌────┴──────────────┴──────────────────────┐   │
│  │         AuthContext (RBAC Provider)       │   │
│  └────────────────────┬─────────────────────┘   │
└───────────────────────┼─────────────────────────┘
                        │ HTTPS / REST
┌───────────────────────┼─────────────────────────┐
│              Supabase Platform                  │
│  ┌────────────────────┴─────────────────────┐   │
│  │            PostgREST API                 │   │
│  ├──────────────────────────────────────────┤   │
│  │     PostgreSQL 15+ (26 tables, RLS)      │   │
│  │  ┌──────────┐ ┌───────────┐ ┌─────────┐ │   │
│  │  │ Triggers │ │   RPCs    │ │pg_cron  │ │   │
│  │  │(17 funcs)│ │(50 funcs) │ │(retention│ │   │
│  │  └──────────┘ └───────────┘ │ jobs)   │ │   │
│  │                             └─────────┘ │   │
│  ├──────────────────────────────────────────┤   │
│  │  Auth (email/password) │ Storage (2 buckets)││
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 3.2 Client-Side Architecture

- **Code Splitting:** All page components are `React.lazy()` loaded with a `<Suspense>` fallback.
- **Error Handling:** A location-aware `<RouteErrorBoundary>` wraps all routes, automatically resetting on navigation.
- **Auth Flow:** `<AuthProvider>` manages session lifecycle via Supabase Auth; `<AppLayout>` enforces authentication; `<ProtectedRoute>` enforces role-based access.
- **Data Layer:** All server data flows through TanStack React Query hooks with 60-second stale time, 5-minute GC, and manual invalidation on mutations.
- **Interaction Modes:** Admin and Dashboard surfaces support `view | edit | bulk | manage | customize` modes via a shared `InteractionModeProvider`.

---

## 4. Data Model

### 4.1 Entity-Relationship Summary

The database consists of **26 tables** organized into the following domains:

#### Identity & Access (4 tables)

| Table | Purpose | Key Relationships |
|---|---|---|
| `profiles` | Employee master data | PK = `auth.users.id`, FK → `departments`, self-ref → `manager_id` |
| `user_roles` | Role assignments (1:1 user→role) | FK → `profiles` |
| `departments` | Organizational units | FK `manager_id` → `profiles` |
| `user_notification_preferences` | Per-user notification settings | PK = `user_id` FK → `profiles` |

#### Leave Management (5 tables)

| Table | Purpose | Key Relationships |
|---|---|---|
| `leave_types` | Leave category definitions (annual, sick, etc.) | — |
| `leave_requests` | Leave applications with full approval state | FK → `profiles`, FK → `leave_types` |
| `leave_request_events` | Immutable audit trail per request | FK → `leave_requests` |
| `leave_approval_workflows` | Configurable approval stage chains | FK → `departments` |
| `leave_cancellation_workflows` | Configurable cancellation approval chains | FK → `departments` |

#### Attendance (1 table)

| Table | Purpose |
|---|---|
| `attendance` | Daily clock-in/out records with status |

#### Payroll (4 tables)

| Table | Purpose |
|---|---|
| `salary_structures` | Per-employee salary configuration |
| `deduction_types` | Deduction category definitions |
| `employee_deductions` | Per-employee deduction assignments |
| `payroll_periods` | Pay period lifecycle (draft → processing → completed) |
| `payslips` | Generated pay calculations per period per employee |

#### Training & Performance (3 tables)

| Table | Purpose |
|---|---|
| `training_programs` | Training course definitions |
| `training_enrollments` | Employee enrollment tracking |
| `performance_reviews` | Review lifecycle (draft → submitted → acknowledged) |

#### Content & Events (3 tables)

| Table | Purpose |
|---|---|
| `announcements` | Company-wide announcements with priority |
| `documents` | Employee document storage metadata |
| `holidays` | Company holiday calendar |
| `department_events` | Department-scoped events |

#### Notification Pipeline (4 tables)

| Table | Purpose |
|---|---|
| `user_notifications` | In-app notification inbox |
| `notification_delivery_queue` | Email delivery queue with retry logic |
| `notification_email_worker_runs` | Worker execution audit log |
| `workflow_config_events` | Workflow configuration change log |

### 4.2 Custom PostgreSQL Types

| Type | Values |
|---|---|
| `app_role` | `admin`, `hr`, `manager`, `employee`, `general_manager`, `director` |
| `deduction_type` | `fixed`, `percentage` |
| `document_category` | `contract`, `certificate`, `official`, `other` |
| `payroll_status` | `draft`, `processing`, `completed`, `cancelled` |
| `payslip_status` | `pending`, `paid`, `cancelled` |

### 4.3 Storage Buckets

| Bucket | Purpose | Access |
|---|---|---|
| `employee-documents` | Employment contracts, certificates, official documents | Owner read; HR/Director full access |
| `leave-documents` | Supporting documents for leave requests | Owner CRUD; HR/Director/Manager read |

---

## 5. Role-Based Access Control (RBAC)

### 5.1 Role Hierarchy

```
director ─────────────────────────────────────── Full business access
    │
general_manager ─────────────────────────────── Operations scope
    │
hr ──────────────────────────────────────────── People operations
    │
manager ─────────────────────────────────────── Department scope
    │
employee ────────────────────────────────────── Self-service only

admin ───────────────────────────────────────── System administration
                                                (restricted from sensitive data)
```

### 5.2 Page Access Matrix

| Page | employee | manager | general_manager | hr | director | admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Leave | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Attendance | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Training | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Announcements | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Payroll | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Performance | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Team Calendar | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Documents | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| Employee Directory | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |

### 5.3 Capability Restrictions

| Capability | Allowed Roles | Denied Roles |
|---|---|---|
| Manage payroll & salary data | hr, director | admin, manager, employee, GM |
| Manage employee documents | hr, director | All others |
| View sensitive identifiers (employee_id, phone) | hr, director, manager, GM, employee | admin |
| View sensitive contact info | hr, director, manager, GM, employee | admin |
| View calendar leave type labels | All except employee | employee |
| Manage holidays | hr, director, admin | manager, GM, employee |
| Manage department events | manager, GM, hr, director, admin | employee |
| Conduct performance reviews | manager, GM, hr, director, admin | employee |
| Approve leave requests | manager, GM, director | admin, hr, employee |
| Assign/change user roles | admin, director | hr, manager, GM, employee |
| Reset user passwords | admin, hr | director, manager, GM, employee |

### 5.4 Database-Level Enforcement

- **Row-Level Security (RLS):** Enabled on all 26 tables with role-aware policies.
- **SECURITY DEFINER functions:** Sensitive RPCs (`admin_reset_user_password`, `approve_leave_request`, etc.) execute with elevated privileges while validating caller identity internally.
- **Trigger-based enforcement:** `enforce_profiles_admin_update_scope` and `enforce_username_admin_hr_only` restrict field-level mutations.

---

## 6. Feature Specifications

### 6.1 Authentication

| Feature | Specification |
|---|---|
| **Login methods** | Email/password, username, employee ID |
| **Identifier resolution** | Non-email identifiers resolved via `resolve_login_email` RPC |
| **Account blocking** | Profiles with `status = inactive | terminated` are denied login |
| **Session management** | Supabase Auth JWT with automatic refresh |
| **Idle timeout** | 30-minute inactivity auto-signout |
| **Signup** | Email/password with `first_name` and `last_name` metadata; auto-creates profile + assigns `employee` role |

### 6.2 Dashboard

| Feature | Specification |
|---|---|
| **Personalization** | Greeting with user's first name, date, role label, and scope label |
| **Widget system** | 9 widget types across 3 tiers (primary, secondary, supporting) |
| **Role-based widgets** | Each role sees a curated default widget set |
| **Customize mode** | Drag, resize, hide/show widgets; lane-based layout with 12-column grid |
| **Admin template** | Manager/GM/HR can apply a preset widget template |
| **Quick Stats** | KPI cards for manager roles and above |

**Widget Catalog:**

| Widget ID | Tier | Available Roles |
|---|---|---|
| `criticalInsights` | Primary | GM, HR, Director, Admin |
| `executiveMetrics` | Primary | GM, HR, Director, Admin |
| `teamSnapshot` | Secondary | Manager, GM, HR, Director, Admin |
| `onLeaveToday` | Secondary | Manager, GM, HR, Director, Admin |
| `announcements` | Secondary | All |
| `attendanceToday` | Supporting | All |
| `leaveBalance` | Supporting | (Disabled) |
| `trainingSummary` | Supporting | All |
| `performanceSummary` | Supporting | All except Admin |

### 6.3 Leave Management

#### 6.3.1 Leave Request Lifecycle

```
                     ┌─────────┐
                     │ pending │◄──── Employee creates request
                     └────┬────┘
                          │
              ┌───────────┼────────────┐
              ▼           ▼            ▼
     ┌────────────┐ ┌──────────┐ ┌──────────────┐
     │  rejected  │ │ document │ │   approved   │
     │            │ │ requested│ │  (stage N)   │
     └─────┬──────┘ └────┬─────┘ └──────┬───────┘
           │              │              │
           ▼              ▼              ▼
     ┌──────────┐  ┌──────────┐  ┌─────────────┐
     │  amend   │  │ document │  │   final     │
     │(→pending)│  │ attached │  │  approved   │
     └──────────┘  │(→pending)│  └──────┬──────┘
                   └──────────┘         │
                                        ▼
                                 ┌─────────────┐
                                 │cancellation  │
                                 │  requested   │
                                 └──────┬──────┘
                                        │
                               ┌────────┼────────┐
                               ▼        ▼        ▼
                        ┌──────────┐ ┌──────┐ ┌───────────┐
                        │cancel    │ │cancel│ │cancellation│
                        │stage N   │ │reject│ │ approved  │
                        │approved  │ │      │ │(→cancelled)│
                        └──────────┘ └──────┘ └───────────┘
```

#### 6.3.2 Approval Workflow Configuration

- Workflows are **configurable per department and requester role**.
- Each workflow defines an ordered array of `approval_stages` (e.g., `['manager', 'general_manager', 'director']`).
- The system **snapshots** the resolved route onto each leave request at creation time.
- Approval is processed atomically via the `approve_leave_request` RPC with PostgreSQL row-level locking.
- Workflow resolution automatically adapts for self-approval scenarios (e.g., a manager skips the `manager` stage).

**Default Approval Routes:**

| Requester Role | Default Route |
|---|---|
| Employee | `manager → general_manager → director` |
| Manager | `general_manager → director` |
| General Manager | `director` |
| Director / HR / Admin | `director` |

#### 6.3.3 Cancellation Workflow

- Separately configurable from approval workflows.
- Only available on **final-approved** leave requests.
- Pending (not-yet-approved) leave can be directly cancelled by the employee.
- Rejected cancellations can be re-requested.

#### 6.3.4 Database-Enforced Invariants

The `enforce_leave_request_state_consistency` trigger (~400 lines) validates:
- Approval stamp completeness (every approved stage must have `actor`, `timestamp`, and `role` triplet)
- Route compatibility (approval stages match the snapshotted route)
- Final stage matching (the `final_approved_by_role` matches the last stage in the route)
- Cross-field coherence (rejected requests must have `rejection_reason`; approved stages must be sequential)
- Cancellation state consistency

#### 6.3.5 Event & Audit System

Every leave state transition generates an immutable `leave_request_events` record:

| Event Type | Trigger |
|---|---|
| `leave_created` | New request submitted |
| `leave_resubmitted` | Amended/resubmitted after rejection |
| `leave_status_changed` | Any approval stage transition |
| `leave_rejected` | Request rejected at any stage |
| `leave_final_approved` | All approval stages passed |
| `leave_document_requested` | Approver requests supporting document |
| `leave_document_attached` | Employee uploads document |
| `leave_cancellation_requested` | Cancellation initiated |
| `leave_cancellation_stage_approved` | Cancellation approval stage passed |
| `leave_cancellation_approved` | All cancellation stages passed |
| `leave_cancellation_rejected` | Cancellation denied |
| `leave_cancellation_re_requested` | Previously rejected cancellation re-initiated |

### 6.4 Attendance

| Feature | Specification |
|---|---|
| **Clock In** | Records timestamp; marks `late` if after 09:00 |
| **Clock Out** | Updates existing attendance record for the day |
| **Optimistic Updates** | UI updates immediately with rollback on failure |
| **History** | Filterable attendance history with status badges |
| **Statuses** | `present`, `absent`, `late`, `half_day`, `on_leave` |

### 6.5 Payroll

| Feature | Specification |
|---|---|
| **Salary Structures** | Per-employee: basic salary + housing/transport/meal/other allowances |
| **Deduction Types** | Fixed or percentage-based; mandatory or optional |
| **Payroll Periods** | Lifecycle: `draft → processing → completed → cancelled` |
| **Payslip Generation** | Batch calculation: gross = basic + allowances; net = gross − deductions; adjusts for leave/absent days |
| **Employee View** | Self-service payslip viewing with toggle to hide/show amounts |
| **Access Control** | Full payroll management restricted to HR and Director |

### 6.6 Training

| Feature | Specification |
|---|---|
| **Programs** | Title, description, category, duration, mandatory flag |
| **Enrollments** | Lifecycle: `enrolled → in_progress → completed | dropped` |
| **Score Tracking** | Optional score recorded on completion |
| **Dashboard Widget** | Summarizes enrollment counts and completion rates |

### 6.7 Performance Reviews

| Feature | Specification |
|---|---|
| **Review Creation** | Conductors (manager+) create reviews for their scope |
| **Review Lifecycle** | `draft → submitted → acknowledged` |
| **Content** | Overall rating, strengths, improvement areas, goals, comments |
| **Employee View** | View own reviews, acknowledge submitted reviews |
| **Dashboard Widget** | Summarizes pending and completed reviews |

### 6.8 Notifications

#### 6.8.1 Pipeline Architecture

```
┌──────────────┐     ┌───────────────────────┐     ┌──────────────────┐
│ Leave/Workflow│     │ log_leave_request_    │     │ user_            │
│ State Change  │────▶│ events (trigger)      │────▶│ notifications    │
└──────────────┘     └───────────────────────┘     └────────┬─────────┘
                                                            │
                     ┌───────────────────────┐              │
                     │suppress_muted_user_   │◄─────────────┤
                     │notifications (trigger)│              │
                     └───────────────────────┘              ▼
                                                   ┌───────────────────┐
                                                   │enqueue_notification│
                                                   │_email_delivery    │
                                                   └────────┬──────────┘
                                                            ▼
                                                   ┌───────────────────┐
                                                   │notification_      │
                                                   │delivery_queue     │
                                                   └────────┬──────────┘
                                                            ▼
                                                   ┌───────────────────┐
                                                   │Email Worker (RPC) │
                                                   │claim → send →     │
                                                   │finalize           │
                                                   └───────────────────┘
```

#### 6.8.2 Notification Categories

| Category | Events | Recipients |
|---|---|---|
| `leave` | All leave workflow events | Next approver, requester, HR/Admin observers |
| `admin` | Workflow config changes | HR, Admin, Director |
| `system` | System-level events | Targeted users |

#### 6.8.3 User Preferences

Per-user toggles for both in-app and email delivery across all categories. Muted notifications are suppressed at the database trigger level.

#### 6.8.4 Retention Policy

Automated daily cleanup via `pg_cron`:
- Read notifications: deleted after 180 days
- Sent email queue items: deleted after 30 days
- Failed email queue items: deleted after 90 days

#### 6.8.5 Frontend Behavior

- 30-second polling interval
- Bell icon with unread badge count
- Category and read/unread filtering
- Mark read/unread, mark all read, bulk cleanup
- Deep-link navigation to related resource (leave request, admin page)

### 6.9 Employee Directory

| Feature | Specification |
|---|---|
| **Views** | Grid layout and list layout |
| **Search** | Search by name, employee ID |
| **Detail Dialog** | Full employee information with role badge |
| **Field Redaction** | Admin role cannot see `employee_id`, `phone`, and other sensitive identifiers |
| **Data Source** | `get_employee_directory_profiles` RPC with built-in redaction |

### 6.10 Team Calendar

| Feature | Specification |
|---|---|
| **Calendar View** | Monthly grid with day-level event markers |
| **Mobile View** | Agenda-style list |
| **Event Types** | Approved leaves, holidays, department events |
| **Holiday Management** | HR/Director/Admin can add/delete holidays |
| **Department Events** | Manager+ for own department; HR/Director/Admin for any |
| **Privacy** | Leave type labels hidden from employees |

### 6.11 Documents

| Feature | Specification |
|---|---|
| **Upload** | HR/Director upload documents for any employee |
| **Categories** | Contract, certificate, official, other |
| **Download** | Via Supabase Storage signed URLs |
| **Delete** | HR/Director can remove documents |

### 6.12 Announcements

| Feature | Specification |
|---|---|
| **Priority Levels** | Low, normal, high, urgent |
| **Visibility** | Active announcements with optional expiration |
| **Publishing** | Admin-created with timestamp |

### 6.13 Admin Dashboard

| Feature | Specification |
|---|---|
| **Tabs** | Employees, Departments, Roles, Leave Policies |
| **Employee Management** | Search, filter, edit profile, reset password, archive/restore |
| **Department Management** | Full CRUD with manager assignment |
| **Role Management** | Assign, change, or revoke user roles |
| **Leave Policy Config** | CRUD leave types + approval/cancellation workflow configuration |
| **Interaction Modes** | View, Manage, Bulk, Customize for flexible workspace |
| **Notification Queue** | Email queue monitoring, dead letter analytics, requeue/discard |

### 6.14 Profile (Self-Service)

| Feature | Specification |
|---|---|
| **Overview Tab** | Read-only display of personal and employment info |
| **Edit Tab** | Update first name, last name, phone |
| **Notifications Tab** | Configure per-category in-app and email preferences |

---

## 7. Routing Specification

| Path | Component | Auth | Role Gate | Lazy |
|---|---|:---:|:---:|:---:|
| `/` | → Redirect `/dashboard` | — | — | — |
| `/auth` | Auth | ✗ | — | ✗ |
| `/dashboard` | Dashboard | ✓ | All | ✓ |
| `/leave` | Leave | ✓ | All | ✓ |
| `/notifications` | Notifications | ✓ | All | ✓ |
| `/attendance` | Attendance | ✓ | All | ✓ |
| `/training` | Training | ✓ | All | ✓ |
| `/announcements` | Announcements | ✓ | All | ✓ |
| `/profile` | Profile | ✓ | All | ✓ |
| `/payroll` | Payroll | ✓ | All | ✓ |
| `/performance` | Performance | ✓ | Manager+ | ✓ |
| `/calendar` | TeamCalendar | ✓ | Manager+ | ✓ |
| `/documents` | Documents | ✓ | HR, Director | ✓ |
| `/employees` | Employees | ✓ | Manager+, Admin | ✓ |
| `/admin` | Admin | ✓ | Admin, HR, Director | ✓ |
| `*` | NotFound | — | — | ✗ |

---

## 8. Database Functions (RPC) Catalog

### 8.1 Business Logic RPCs

| Function | Description | Auth |
|---|---|---|
| `approve_leave_request` | Atomic leave approval with row lock + workflow stage resolution | SECURITY DEFINER |
| `request_leave_cancellation` | Initiates or directly cancels leave based on current status | SECURITY DEFINER |
| `amend_leave_request` | Resubmits rejected/document-pending request | SECURITY DEFINER |
| `resolve_leave_request_workflow_snapshot` | Resolves approval route for a new request | SECURITY DEFINER |
| `admin_reset_user_password` | Admin/HR resets any user's password | SECURITY DEFINER |
| `resolve_login_email` | Resolves username/employee_id to email for login | SECURITY DEFINER |
| `get_employee_directory_profiles` | Employee directory with admin-scoped field redaction | SECURITY DEFINER |
| `get_calendar_visible_leaves` | Approved leaves in date range for calendar | SECURITY DEFINER |
| `get_dashboard_stats` | Single-call dashboard aggregate metrics | SECURITY DEFINER |
| `get_executive_stats` | Executive-level KPIs (optional department scope) | SECURITY DEFINER |

### 8.2 Notification RPCs

| Function | Description |
|---|---|
| `mark_user_notifications_read` | Batch mark as read |
| `mark_user_notifications_unread` | Batch mark as unread |
| `delete_user_notifications` | Delete old read notifications |
| `notification_worker_claim_email_queue` | Claim batch for processing (advisory lock) |
| `notification_worker_finalize_email_queue_item` | Mark queue item sent/failed |
| `notification_admin_email_queue_summary` | Queue analytics |
| `notification_admin_list_email_queue` | List queue items |
| `notification_admin_requeue_email_queue_item` | Re-enqueue failed item |
| `run_notification_retention_job` | Scheduled cleanup |

### 8.3 Database Triggers (17)

| Trigger | Table | Event | Purpose |
|---|---|---|---|
| `handle_new_user` | `auth.users` | INSERT | Create profile + assign employee role |
| `set_profile_username` | `profiles` | INSERT | Auto-generate unique username |
| `enforce_profiles_admin_update_scope` | `profiles` | UPDATE | Restrict admin to username-only updates |
| `enforce_username_admin_hr_only` | `profiles` | UPDATE | Only HR/Admin can change usernames |
| `set_leave_request_workflow_snapshot` | `leave_requests` | INSERT | Snapshot approval route |
| `enforce_leave_request_state_consistency` | `leave_requests` | INSERT/UPDATE | ~400-line state machine validator |
| `enforce_leave_request_transition_sequencing` | `leave_requests` | UPDATE | Prevent illegal state transitions |
| `normalize_leave_request_state` | `leave_requests` | INSERT | Clear previous stage data |
| `normalize_leave_request_resubmission` | `leave_requests` | UPDATE | Clear stamps on resubmission |
| `log_leave_request_events` | `leave_requests` | INSERT/UPDATE | Create audit trail |
| `create_leave_event_notifications` | `leave_request_events` | INSERT | Generate user notifications |
| `suppress_muted_user_notifications` | `user_notifications` | INSERT | Delete muted notifications |
| `enqueue_notification_email_delivery` | `user_notifications` | INSERT | Queue email if enabled |
| `log_workflow_config_events` | `leave_*_workflows` | INSERT/UPDATE/DELETE | Log workflow changes |
| `create_workflow_config_event_notifications` | `workflow_config_events` | INSERT | Notify HR/Admin/Director |
| `validate_leave_approval_workflow_stages` | `leave_*_workflows` | INSERT/UPDATE | Validate stage arrays |
| `update_updated_at_column` | Multiple | UPDATE | Timestamp maintenance |

---

## 9. Security Specifications

### 9.1 Authentication

- Email/password authentication via Supabase Auth.
- Non-email identifiers (username, employee_id) resolved server-side via SECURITY DEFINER function — email is never exposed to the client.
- Blocked accounts (`inactive`, `terminated`) are rejected at both login-time and session-restore-time.
- 30-minute inactivity auto-signout.

### 9.2 Authorization

- **Application layer:** React Router `<ProtectedRoute>` component enforces page-level access.
- **Database layer:** Row-Level Security (RLS) on all 26 tables ensures data isolation.
- **Function layer:** SECURITY DEFINER RPCs validate caller identity internally before performing privileged operations.
- **Field-level:** Admin role is explicitly restricted from viewing sensitive employee identifiers.

### 9.3 Data Integrity

- Leave request state machine enforced by BEFORE INSERT/UPDATE triggers with comprehensive invariant checking.
- Immutable audit trail via `leave_request_events` (INSERT-only, no UPDATE/DELETE allowed).
- Atomic approval processing with `SELECT ... FOR UPDATE` row locking.
- Workflow configuration changes logged to `workflow_config_events`.

---

## 10. Testing Strategy

### 10.1 Unit Tests (Vitest)

- **36 test files, 106 tests** covering:
  - Leave workflow state machine logic
  - Permission/RBAC function correctness
  - Payroll calculation accuracy
  - Dashboard layout engine
  - Editable grid layout algorithms
  - UI component rendering (React Testing Library)
  - Page-level integration tests (Dashboard, Admin, Leave, etc.)
  - Admin page structural composition
  - Auth form behavior (login, error states, caps lock detection)

### 10.2 E2E Tests (Playwright)

- RBAC access control matrix verification
- Leave cancellation workflow flows
- Calendar visibility rules
- Admin/Director access patterns
- Notification system flows
- UI visual regression smoke tests

### 10.3 SQL Tests

- RBAC policy verification via `test-rbac-sql.sh`
- State machine invariant testing via `test-state-machine-sql.sh`

---

## 11. Build & Deployment

### 11.1 Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run test` | Run Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run test:rbac:e2e` | Playwright RBAC E2E tests |
| `npm run test:rbac:sql` | SQL-level RBAC tests |
| `npm run test:state:sql` | SQL state machine tests |

### 11.2 Build Output

- Vite production build with code splitting
- Lazy-loaded page chunks (~15–260 KB gzipped per chunk)
- Total estimated bundle: ~300 KB gzipped (excluding vendor)

### 11.3 Environment Requirements

- **Node.js:** v24.x
- **npm:** 11.x
- **Supabase CLI:** For local development, migrations, and type generation
- **PostgreSQL:** 15+ (via Supabase)

---

## 12. Non-Functional Requirements

| Requirement | Specification |
|---|---|
| **Browser Support** | Chromium-based browsers (primary), Firefox, Safari |
| **Responsive Design** | Mobile-first with Tailwind CSS breakpoints |
| **Theme Support** | Light/dark mode via `next-themes` |
| **Performance** | 60s query stale time, lazy loading, optimistic updates |
| **Accessibility** | Radix UI primitives provide ARIA compliance; keyboard navigation |
| **Error Recovery** | Location-aware error boundary with retry and reload options |
| **Data Freshness** | `refetchOnWindowFocus` for time-sensitive data (attendance, stats) |
| **Notification Latency** | 30-second frontend polling; near-instant database trigger pipeline |

---

## Appendix A: Hooks Inventory

| Hook | Module | Purpose |
|---|---|---|
| `useAuth` | AuthContext | Session, profile, role, sign in/out |
| `useLeaveRequests` | useLeaveRequests | Leave request CRUD + approval actions |
| `useLeaveBalance` | useLeaveBalance | Leave balance per type per fiscal year |
| `useLeaveTypes` | useLeaveTypes | Leave type definitions |
| `useLeaveApprovalWorkflows` | useLeaveApprovalWorkflows | Approval workflow CRUD |
| `useLeaveCancellationWorkflows` | useLeaveCancellationWorkflows | Cancellation workflow CRUD |
| `useLeaveRequestDetailsDialog` | useLeaveRequestDetailsDialog | Detail dialog state + events |
| `useEmployees` | useEmployees | Employee directory |
| `useDepartments` | useEmployees | Department list |
| `useUserRoles` | useEmployees | Role assignments |
| `useTodayAttendance` | useAttendance | Today's attendance record |
| `useAttendanceHistory` | useAttendance | Attendance history |
| `useClockIn` / `useClockOut` | useAttendance | Clock mutations |
| `useTrainingPrograms` | useTraining | Training program list |
| `useMyEnrollments` | useTraining | Own enrollments |
| `useEnrollInTraining` | useTraining | Enrollment mutation |
| `useMyReviews` | usePerformance | Own performance reviews |
| `useNotifications` | useNotifications | Notification inbox + actions |
| `useNotificationQueueOps` | useNotificationQueueOps | Email queue admin |
| `useDocuments` | useDocuments | Document CRUD |
| `useCalendar` | useCalendar | Calendar events |
| `useAnnouncements` | useAnnouncements | Active announcements |
| `useExecutiveStats` | useExecutiveStats | Executive KPIs |
| `useDashboardStats` | useDashboardStats | Dashboard metrics |
| `usePayroll` | usePayroll | Payroll period + payslip management |
| `useProfileSettings` | useProfileSettings | Self-service profile update |
| `usePageTitle` | usePageTitle | Document title |
| `useIdleTimeout` | useIdleTimeout | Inactivity auto-signout |
| `useIsMobile` | use-mobile | Mobile breakpoint |

---

*End of specification.*
