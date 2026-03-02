# FLCHRMS Data and Security Specification

## 1. Data Platform Overview
- Backend: Supabase Postgres with RLS enabled across business tables
- Auth source: `auth.users` + profile projection in `public.profiles`
- Domain logic: SQL functions (RPC), triggers, and RLS policies
- File layer: Supabase Storage buckets with RLS-backed object access

## 2. Public Schema Inventory

### 2.1 Tables (27)

#### Identity and organization
- `profiles`
- `user_roles`
- `departments`
- `profile_change_log`

#### Leave domain
- `leave_types`
- `leave_requests`
- `leave_request_events`
- `leave_approval_workflows`
- `leave_cancellation_workflows`

#### Attendance
- `attendance`

#### Payroll
- `salary_structures`
- `deduction_types`
- `employee_deductions`
- `payroll_periods`
- `payslips`

#### Learning and performance
- `training_programs`
- `training_enrollments`
- `performance_reviews`

#### Calendar/content/documents
- `holidays`
- `department_events`
- `announcements`
- `documents`

#### Notifications and governance
- `user_notifications`
- `user_notification_preferences`
- `notification_delivery_queue`
- `notification_email_worker_runs`
- `workflow_config_events`

### 2.2 Enums
- `app_role`: `admin`, `hr`, `manager`, `employee`, `general_manager`, `director`
- `deduction_type`: `fixed`, `percentage`
- `document_category`: `contract`, `certificate`, `official`, `other`
- `payroll_status`: `draft`, `processing`, `completed`, `cancelled`
- `payslip_status`: `pending`, `paid`, `cancelled`

### 2.3 Storage buckets
- `employee-documents`
- `leave-documents`

## 3. RPC and Database Function Contract

## 3.1 RPCs consumed by frontend code
- `resolve_login_email`
- `get_employee_directory_profiles`
- `admin_create_employee`
- `admin_reset_user_password`
- `get_calendar_visible_leaves`
- `get_dashboard_stats`
- `get_executive_stats`
- `approve_leave_request`
- `amend_leave_request`
- `request_leave_cancellation`
- `get_user_role`
- `mark_user_notifications_read`
- `mark_user_notifications_unread`
- `delete_user_notifications`
- `notification_admin_combined_dashboard`
- `notification_admin_requeue_email_queue_item`
- `notification_admin_discard_email_queue_item`

### 3.2 Additional typed functions available in generated schema
Examples include:
- role helper functions (`has_role`, `is_manager_of`, `is_department_manager`)
- leave routing helpers (`resolve_leave_request_workflow_snapshot`, `next_leave_stage_from_route`, `leave_stage_recipients`)
- worker lifecycle functions (`notification_worker_claim_email_queue`, `notification_worker_start_email_run`, `notification_worker_finish_email_run`, `notification_worker_finalize_email_queue_item_v2`)
- retention and analytics functions (`run_notification_retention_job`, dead-letter analytics and worker summaries)

## 4. Security Model

### 4.1 Authentication and identity
- Authenticated session required for app routes except `/auth`.
- Profile status (`inactive`, `terminated`) blocks active session usage.

### 4.2 Authorization layers
1. UI route and capability checks
- `ProtectedRoute` and `lib/permissions.ts`

2. RLS policies
- SQL regression suite validates authenticated-only policy targeting on key tables
- Role-specific policy behavior validated for leave, documents, notifications, and workflow tables

3. Definer function boundaries
- Sensitive operations run through SECURITY DEFINER RPCs with constrained grants

### 4.3 Sensitive data handling
- Employee directory masking is enforced for admin role (`employee_id`, `phone` masked)
- SQL regression tests explicitly verify admin-masked vs director-visible behavior

### 4.4 Storage access model
From SQL policy tests:
- Storage object policies are authenticated-only
- Document bucket access is role-scoped
- Admin is intentionally excluded from certain sensitive document policies
- Director/HR maintain document access capability per policy set

## 5. Leave State and Workflow Integrity

### 5.1 Data model fields
`leave_requests` stores:
- staged approval fields (manager, GM, director, final stamps)
- cancellation staged fields and final cancellation stamps
- route snapshots for both approval and cancellation
- amendment/document/rejection metadata

### 5.2 Event sourcing
`leave_request_events` stores immutable workflow events used for:
- timeline rendering in UI
- downstream notification fan-out

### 5.3 Trigger-validated invariants
SQL state-machine regression validates presence/hardening of:
- normalization trigger chain
- transition sequencing trigger
- consistency enforcement trigger
- leave event logging trigger

## 6. Notification Data Pipeline

### 6.1 Core entities
- `user_notifications`: in-app inbox rows
- `user_notification_preferences`: category and email toggles
- `notification_delivery_queue`: async email delivery queue
- `notification_email_worker_runs`: worker execution telemetry

### 6.2 Event flow
1. Leave/workflow changes produce events
2. Events generate in-app notifications
3. Muted categories are suppressed by trigger logic
4. Email-enabled categories enqueue queue items
5. Worker RPC claims/finalizes queue items
6. Admin analytics aggregate queue and dead-letter state

### 6.3 Retention
`run_notification_retention_job` governs cleanup of:
- old read notifications
- old sent queue rows
- old failed queue rows

## 7. Auditing and Governance
- Profile changes captured in `profile_change_log`
- Workflow configuration changes captured in `workflow_config_events`
- Leave transitions captured in `leave_request_events`
- Queue worker telemetry captured in `notification_email_worker_runs`

These tables support governance views in Admin UI.

## 8. Data Contracts and Drift Notes

### 8.1 Supabase type generation drift
Generated `src/integrations/supabase/types.ts` currently does not include several RPCs used by the frontend (`approve_leave_request`, `get_dashboard_stats`, `get_executive_stats`, `notification_admin_combined_dashboard`).

### 8.2 In-flight migration not reflected in generated types
Migration `20260302100000_leave_display_config.sql` introduces:
- `leave_type_display_config`
- `get_dashboard_leave_types`

This table/function set is not present in generated types and is not yet consumed by current frontend leave display logic.

## 9. Security Regression Coverage (SQL)
Two SQL suites in `supabase/tests` enforce policy and state invariants:
- `rbac_regression.sql`
- `state_machine_regression.sql`

They validate:
- policy scope and grants
- function hardening and execute grants
- trigger existence and security settings
- queue/worker analytics permissions
- state-machine normalization and transition behavior
