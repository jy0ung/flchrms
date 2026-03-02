export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: string | null
          published_at: string | null
          published_by: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          published_at?: string | null
          published_by?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          published_at?: string | null
          published_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deduction_types: {
        Row: {
          created_at: string
          deduction_type: Database["public"]["Enums"]["deduction_type"]
          default_value: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deduction_type?: Database["public"]["Enums"]["deduction_type"]
          default_value?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deduction_type?: Database["public"]["Enums"]["deduction_type"]
          default_value?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      department_events: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          description: string | null
          employee_id: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          description?: string | null
          employee_id: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          description?: string | null
          employee_id?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_deductions: {
        Row: {
          amount: number
          created_at: string
          deduction_type_id: string
          employee_id: string
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deduction_type_id: string
          employee_id: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deduction_type_id?: string
          employee_id?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_deductions_deduction_type_id_fkey"
            columns: ["deduction_type_id"]
            isOneToOne: false
            referencedRelation: "deduction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_lifecycle_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string
          event_date: string
          event_type: string
          id: string
          metadata: Json | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id: string
          event_date?: string
          event_type: string
          id?: string
          metadata?: Json | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string
          event_date?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_lifecycle_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          is_recurring: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_approval_workflows: {
        Row: {
          approval_stages: string[]
          created_at: string
          department_id: string | null
          id: string
          is_active: boolean
          notes: string | null
          requester_role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          approval_stages: string[]
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          requester_role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          approval_stages?: string[]
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          requester_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_approval_workflows_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_cancellation_workflows: {
        Row: {
          approval_stages: string[]
          created_at: string
          department_id: string | null
          id: string
          is_active: boolean
          notes: string | null
          requester_role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          approval_stages: string[]
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          requester_role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          approval_stages?: string[]
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          requester_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_cancellation_workflows_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_request_events: {
        Row: {
          actor_role: Database["public"]["Enums"]["app_role"] | null
          actor_user_id: string | null
          created_at: string
          event_type: string
          from_cancellation_status: string | null
          from_status: string | null
          id: string
          leave_request_id: string
          metadata: Json
          occurred_at: string
          to_cancellation_status: string | null
          to_status: string | null
        }
        Insert: {
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          from_cancellation_status?: string | null
          from_status?: string | null
          id?: string
          leave_request_id: string
          metadata?: Json
          occurred_at?: string
          to_cancellation_status?: string | null
          to_status?: string | null
        }
        Update: {
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          from_cancellation_status?: string | null
          from_status?: string | null
          id?: string
          leave_request_id?: string
          metadata?: Json
          occurred_at?: string
          to_cancellation_status?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_request_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_request_events_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          amended_at: string | null
          amendment_notes: string | null
          approval_route_snapshot: string[] | null
          cancellation_comments: string | null
          cancellation_director_approved_at: string | null
          cancellation_director_approved_by: string | null
          cancellation_final_approved_at: string | null
          cancellation_final_approved_by: string | null
          cancellation_final_approved_by_role:
            | Database["public"]["Enums"]["app_role"]
            | null
          cancellation_gm_approved_at: string | null
          cancellation_gm_approved_by: string | null
          cancellation_manager_approved_at: string | null
          cancellation_manager_approved_by: string | null
          cancellation_reason: string | null
          cancellation_rejected_at: string | null
          cancellation_rejected_by: string | null
          cancellation_rejection_reason: string | null
          cancellation_requested_at: string | null
          cancellation_requested_by: string | null
          cancellation_route_snapshot: string[] | null
          cancellation_status: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_by_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          days_count: number
          director_approved_at: string | null
          director_approved_by: string | null
          document_required: boolean
          document_url: string | null
          employee_id: string
          end_date: string
          final_approved_at: string | null
          final_approved_by: string | null
          final_approved_by_role: Database["public"]["Enums"]["app_role"] | null
          gm_approved_at: string | null
          gm_approved_by: string | null
          hr_approved_at: string | null
          hr_approved_by: string | null
          hr_notified_at: string | null
          id: string
          leave_type_id: string
          manager_approved_at: string | null
          manager_approved_by: string | null
          manager_comments: string | null
          reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amended_at?: string | null
          amendment_notes?: string | null
          approval_route_snapshot?: string[] | null
          cancellation_comments?: string | null
          cancellation_director_approved_at?: string | null
          cancellation_director_approved_by?: string | null
          cancellation_final_approved_at?: string | null
          cancellation_final_approved_by?: string | null
          cancellation_final_approved_by_role?:
            | Database["public"]["Enums"]["app_role"]
            | null
          cancellation_gm_approved_at?: string | null
          cancellation_gm_approved_by?: string | null
          cancellation_manager_approved_at?: string | null
          cancellation_manager_approved_by?: string | null
          cancellation_reason?: string | null
          cancellation_rejected_at?: string | null
          cancellation_rejected_by?: string | null
          cancellation_rejection_reason?: string | null
          cancellation_requested_at?: string | null
          cancellation_requested_by?: string | null
          cancellation_route_snapshot?: string[] | null
          cancellation_status?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_by_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          days_count: number
          director_approved_at?: string | null
          director_approved_by?: string | null
          document_required?: boolean
          document_url?: string | null
          employee_id: string
          end_date: string
          final_approved_at?: string | null
          final_approved_by?: string | null
          final_approved_by_role?:
            | Database["public"]["Enums"]["app_role"]
            | null
          gm_approved_at?: string | null
          gm_approved_by?: string | null
          hr_approved_at?: string | null
          hr_approved_by?: string | null
          hr_notified_at?: string | null
          id?: string
          leave_type_id: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          manager_comments?: string | null
          reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          amended_at?: string | null
          amendment_notes?: string | null
          approval_route_snapshot?: string[] | null
          cancellation_comments?: string | null
          cancellation_director_approved_at?: string | null
          cancellation_director_approved_by?: string | null
          cancellation_final_approved_at?: string | null
          cancellation_final_approved_by?: string | null
          cancellation_final_approved_by_role?:
            | Database["public"]["Enums"]["app_role"]
            | null
          cancellation_gm_approved_at?: string | null
          cancellation_gm_approved_by?: string | null
          cancellation_manager_approved_at?: string | null
          cancellation_manager_approved_by?: string | null
          cancellation_reason?: string | null
          cancellation_rejected_at?: string | null
          cancellation_rejected_by?: string | null
          cancellation_rejection_reason?: string | null
          cancellation_requested_at?: string | null
          cancellation_requested_by?: string | null
          cancellation_route_snapshot?: string[] | null
          cancellation_status?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_by_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          days_count?: number
          director_approved_at?: string | null
          director_approved_by?: string | null
          document_required?: boolean
          document_url?: string | null
          employee_id?: string
          end_date?: string
          final_approved_at?: string | null
          final_approved_by?: string | null
          final_approved_by_role?:
            | Database["public"]["Enums"]["app_role"]
            | null
          gm_approved_at?: string | null
          gm_approved_by?: string | null
          hr_approved_at?: string | null
          hr_approved_by?: string | null
          hr_notified_at?: string | null
          id?: string
          leave_type_id?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          manager_comments?: string | null
          reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_director_approved_by_fkey"
            columns: ["director_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_final_approved_by_fkey"
            columns: ["final_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_gm_approved_by_fkey"
            columns: ["gm_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_approved_by_fkey"
            columns: ["hr_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_type_display_config: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          leave_type_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          leave_type_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          leave_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_type_display_config_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: true
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          created_at: string
          days_allowed: number
          description: string | null
          id: string
          is_paid: boolean
          min_days: number
          name: string
          requires_document: boolean
        }
        Insert: {
          created_at?: string
          days_allowed?: number
          description?: string | null
          id?: string
          is_paid?: boolean
          min_days?: number
          name: string
          requires_document?: boolean
        }
        Update: {
          created_at?: string
          days_allowed?: number
          description?: string | null
          id?: string
          is_paid?: boolean
          min_days?: number
          name?: string
          requires_document?: boolean
        }
        Relationships: []
      }
      notification_delivery_queue: {
        Row: {
          attempts: number
          body_text: string
          category: string
          channel: string
          created_at: string
          event_type: string
          failed_at: string | null
          id: string
          last_error: string | null
          last_provider: string | null
          leased_at: string | null
          leased_by: string | null
          next_attempt_at: string
          notification_id: string
          payload: Json
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          body_text: string
          category: string
          channel?: string
          created_at?: string
          event_type: string
          failed_at?: string | null
          id?: string
          last_error?: string | null
          last_provider?: string | null
          leased_at?: string | null
          leased_by?: string | null
          next_attempt_at?: string
          notification_id: string
          payload?: Json
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          body_text?: string
          category?: string
          channel?: string
          created_at?: string
          event_type?: string
          failed_at?: string | null
          id?: string
          last_error?: string | null
          last_provider?: string | null
          leased_at?: string | null
          leased_by?: string | null
          next_attempt_at?: string
          notification_id?: string
          payload?: Json
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "user_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_email_worker_runs: {
        Row: {
          claimed_count: number
          discarded_count: number
          duration_ms: number | null
          error_message: string | null
          failed_count: number
          finished_at: string | null
          id: string
          processed_count: number
          provider: string
          request_batch_size: number
          request_lease_seconds: number
          request_max_attempts: number
          request_payload: Json
          request_retry_delay_seconds: number
          run_status: string
          sent_count: number
          started_at: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          claimed_count?: number
          discarded_count?: number
          duration_ms?: number | null
          error_message?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          processed_count?: number
          provider: string
          request_batch_size?: number
          request_lease_seconds?: number
          request_max_attempts?: number
          request_payload?: Json
          request_retry_delay_seconds?: number
          run_status?: string
          sent_count?: number
          started_at?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          claimed_count?: number
          discarded_count?: number
          duration_ms?: number | null
          error_message?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          processed_count?: number
          provider?: string
          request_batch_size?: number
          request_lease_seconds?: number
          request_max_attempts?: number
          request_payload?: Json
          request_retry_delay_seconds?: number
          run_status?: string
          sent_count?: number
          started_at?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: []
      }
      onboarding_checklists: {
        Row: {
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          employee_id: string
          id: string
          is_completed: boolean
          item_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          is_completed?: boolean
          item_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          is_completed?: boolean
          item_name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklists_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          name: string
          payment_date: string | null
          processed_at: string | null
          start_date: string
          status: Database["public"]["Enums"]["payroll_status"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          name: string
          payment_date?: string | null
          processed_at?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["payroll_status"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          name?: string
          payment_date?: string | null
          processed_at?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["payroll_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          allowances_breakdown: Json | null
          basic_salary: number
          created_at: string
          days_absent: number | null
          days_leave: number | null
          days_worked: number | null
          deductions_breakdown: Json | null
          employee_id: string
          gross_salary: number
          id: string
          net_salary: number
          overtime_amount: number | null
          overtime_hours: number | null
          paid_at: string | null
          payroll_period_id: string
          status: Database["public"]["Enums"]["payslip_status"] | null
          total_allowances: number | null
          total_deductions: number | null
          updated_at: string
          working_days: number | null
        }
        Insert: {
          allowances_breakdown?: Json | null
          basic_salary?: number
          created_at?: string
          days_absent?: number | null
          days_leave?: number | null
          days_worked?: number | null
          deductions_breakdown?: Json | null
          employee_id: string
          gross_salary?: number
          id?: string
          net_salary?: number
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_at?: string | null
          payroll_period_id: string
          status?: Database["public"]["Enums"]["payslip_status"] | null
          total_allowances?: number | null
          total_deductions?: number | null
          updated_at?: string
          working_days?: number | null
        }
        Update: {
          allowances_breakdown?: Json | null
          basic_salary?: number
          created_at?: string
          days_absent?: number | null
          days_leave?: number | null
          days_worked?: number | null
          deductions_breakdown?: Json | null
          employee_id?: string
          gross_salary?: number
          id?: string
          net_salary?: number
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_at?: string | null
          payroll_period_id?: string
          status?: Database["public"]["Enums"]["payslip_status"] | null
          total_allowances?: number | null
          total_deductions?: number | null
          updated_at?: string
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          acknowledged_at: string | null
          areas_for_improvement: string | null
          comments: string | null
          created_at: string
          employee_id: string
          goals: string | null
          id: string
          overall_rating: number | null
          review_period: string
          reviewer_id: string
          status: string | null
          strengths: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          areas_for_improvement?: string | null
          comments?: string | null
          created_at?: string
          employee_id: string
          goals?: string | null
          id?: string
          overall_rating?: number | null
          review_period: string
          reviewer_id: string
          status?: string | null
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          areas_for_improvement?: string | null
          comments?: string | null
          created_at?: string
          employee_id?: string
          goals?: string | null
          id?: string
          overall_rating?: number | null
          review_period?: string
          reviewer_id?: string
          status?: string | null
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_change_log: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          profile_id: string
        }
        Insert: {
          change_type: string
          changed_at?: string
          changed_by?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          profile_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_change_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bank_account: string | null
          bank_name: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string | null
          employment_type: string | null
          first_name: string
          hire_date: string | null
          id: string
          job_title: string | null
          last_name: string
          manager_id: string | null
          national_id: string | null
          phone: string | null
          probation_end_date: string | null
          status: string | null
          updated_at: string
          username: string
          work_location: string | null
        }
        Insert: {
          avatar_url?: string | null
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          employment_type?: string | null
          first_name: string
          hire_date?: string | null
          id: string
          job_title?: string | null
          last_name: string
          manager_id?: string | null
          national_id?: string | null
          phone?: string | null
          probation_end_date?: string | null
          status?: string | null
          updated_at?: string
          username: string
          work_location?: string | null
        }
        Update: {
          avatar_url?: string | null
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          employment_type?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          last_name?: string
          manager_id?: string | null
          national_id?: string | null
          phone?: string | null
          probation_end_date?: string | null
          status?: string | null
          updated_at?: string
          username?: string
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_structures: {
        Row: {
          basic_salary: number
          created_at: string
          effective_date: string
          employee_id: string
          housing_allowance: number | null
          id: string
          is_active: boolean | null
          meal_allowance: number | null
          other_allowances: number | null
          transport_allowance: number | null
          updated_at: string
        }
        Insert: {
          basic_salary?: number
          created_at?: string
          effective_date?: string
          employee_id: string
          housing_allowance?: number | null
          id?: string
          is_active?: boolean | null
          meal_allowance?: number | null
          other_allowances?: number | null
          transport_allowance?: number | null
          updated_at?: string
        }
        Update: {
          basic_salary?: number
          created_at?: string
          effective_date?: string
          employee_id?: string
          housing_allowance?: number | null
          id?: string
          is_active?: boolean | null
          meal_allowance?: number | null
          other_allowances?: number | null
          transport_allowance?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_structures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_branding: {
        Row: {
          accent_color: string | null
          company_name: string
          company_tagline: string | null
          favicon_url: string | null
          id: string
          login_background_url: string | null
          logo_url: string | null
          primary_color: string | null
          sidebar_color: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color?: string | null
          company_name?: string
          company_tagline?: string | null
          favicon_url?: string | null
          id?: string
          login_background_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          sidebar_color?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color?: string | null
          company_name?: string
          company_tagline?: string | null
          favicon_url?: string | null
          id?: string
          login_background_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          sidebar_color?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      training_enrollments: {
        Row: {
          completed_at: string | null
          employee_id: string
          enrolled_at: string
          id: string
          program_id: string
          score: number | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          employee_id: string
          enrolled_at?: string
          id?: string
          program_id: string
          score?: number | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          employee_id?: string
          enrolled_at?: string
          id?: string
          program_id?: string
          score?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_hours: number | null
          id: string
          is_mandatory: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_mandatory?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_mandatory?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          admin_enabled: boolean
          created_at: string
          email_admin_enabled: boolean
          email_leave_enabled: boolean
          email_system_enabled: boolean
          leave_enabled: boolean
          system_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_enabled?: boolean
          created_at?: string
          email_admin_enabled?: boolean
          email_leave_enabled?: boolean
          email_system_enabled?: boolean
          leave_enabled?: boolean
          system_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_enabled?: boolean
          created_at?: string
          email_admin_enabled?: boolean
          email_leave_enabled?: boolean
          email_system_enabled?: boolean
          leave_enabled?: boolean
          system_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          category: string
          created_at: string
          event_type: string
          id: string
          leave_request_event_id: string | null
          leave_request_id: string | null
          message: string
          metadata: Json
          read_at: string | null
          source_id: string | null
          source_table: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          event_type: string
          id?: string
          leave_request_event_id?: string | null
          leave_request_id?: string | null
          message: string
          metadata?: Json
          read_at?: string | null
          source_id?: string | null
          source_table?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          event_type?: string
          id?: string
          leave_request_event_id?: string | null
          leave_request_id?: string | null
          message?: string
          metadata?: Json
          read_at?: string | null
          source_id?: string | null
          source_table?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_leave_request_event_id_fkey"
            columns: ["leave_request_event_id"]
            isOneToOne: false
            referencedRelation: "leave_request_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_config_events: {
        Row: {
          action: string
          changed_by_role: Database["public"]["Enums"]["app_role"] | null
          changed_by_user_id: string | null
          created_at: string
          department_id: string | null
          id: string
          metadata: Json
          new_values: Json | null
          old_values: Json | null
          requester_role: Database["public"]["Enums"]["app_role"]
          workflow_row_id: string
          workflow_table: string
          workflow_type: string
        }
        Insert: {
          action: string
          changed_by_role?: Database["public"]["Enums"]["app_role"] | null
          changed_by_user_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          metadata?: Json
          new_values?: Json | null
          old_values?: Json | null
          requester_role: Database["public"]["Enums"]["app_role"]
          workflow_row_id: string
          workflow_table: string
          workflow_type: string
        }
        Update: {
          action?: string
          changed_by_role?: Database["public"]["Enums"]["app_role"] | null
          changed_by_user_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          metadata?: Json
          new_values?: Json | null
          old_values?: Json | null
          requester_role?: Database["public"]["Enums"]["app_role"]
          workflow_row_id?: string
          workflow_table?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_config_events_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_employee: {
        Args: {
          _department_id?: string
          _email: string
          _first_name: string
          _hire_date?: string
          _job_title?: string
          _last_name?: string
          _manager_id?: string
          _password: string
          _phone?: string
        }
        Returns: string
      }
      admin_reset_user_password: {
        Args: { _new_password: string; _target_user_id: string }
        Returns: undefined
      }
      amend_leave_request: {
        Args: {
          _amendment_notes: string
          _document_url?: string
          _reason?: string
          _request_id: string
        }
        Returns: {
          amended_at: string | null
          amendment_notes: string | null
          approval_route_snapshot: string[] | null
          cancellation_comments: string | null
          cancellation_director_approved_at: string | null
          cancellation_director_approved_by: string | null
          cancellation_final_approved_at: string | null
          cancellation_final_approved_by: string | null
          cancellation_final_approved_by_role:
            | Database["public"]["Enums"]["app_role"]
            | null
          cancellation_gm_approved_at: string | null
          cancellation_gm_approved_by: string | null
          cancellation_manager_approved_at: string | null
          cancellation_manager_approved_by: string | null
          cancellation_reason: string | null
          cancellation_rejected_at: string | null
          cancellation_rejected_by: string | null
          cancellation_rejection_reason: string | null
          cancellation_requested_at: string | null
          cancellation_requested_by: string | null
          cancellation_route_snapshot: string[] | null
          cancellation_status: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_by_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          days_count: number
          director_approved_at: string | null
          director_approved_by: string | null
          document_required: boolean
          document_url: string | null
          employee_id: string
          end_date: string
          final_approved_at: string | null
          final_approved_by: string | null
          final_approved_by_role: Database["public"]["Enums"]["app_role"] | null
          gm_approved_at: string | null
          gm_approved_by: string | null
          hr_approved_at: string | null
          hr_approved_by: string | null
          hr_notified_at: string | null
          id: string
          leave_type_id: string
          manager_approved_at: string | null
          manager_approved_by: string | null
          manager_comments: string | null
          reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "leave_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_leave_request: {
        Args: {
          _action: string
          _document_required?: boolean
          _expected_status?: string
          _manager_comments?: string
          _rejection_reason?: string
          _request_id: string
        }
        Returns: Json
      }
      delete_user_notifications: {
        Args: { _older_than_days?: number; _read_only?: boolean }
        Returns: number
      }
      generate_unique_username: {
        Args: { _base: string; _profile_id?: string }
        Returns: string
      }
      get_calendar_visible_leaves: {
        Args: { _end_date: string; _start_date: string }
        Returns: {
          employee_first_name: string
          employee_last_name: string
          end_date: string
          final_approved_at: string
          id: string
          leave_type_name: string
          start_date: string
          status: string
        }[]
      }
      get_dashboard_leave_types: {
        Args: never
        Returns: {
          category: string
          days_allowed: number
          display_order: number
          leave_type_id: string
          leave_type_name: string
        }[]
      }
      get_dashboard_stats: { Args: never; Returns: Json }
      get_employee_directory_profiles: {
        Args: { _profile_id?: string }
        Returns: {
          avatar_url: string
          created_at: string
          department: Json
          department_id: string
          email: string
          employee_id: string
          first_name: string
          hire_date: string
          id: string
          job_title: string
          last_name: string
          manager_id: string
          phone: string
          status: string
          updated_at: string
          username: string
        }[]
      }
      get_executive_stats: { Args: { _department_id?: string }; Returns: Json }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_department_manager: {
        Args: { _employee_id: string; _manager_id: string }
        Returns: boolean
      }
      is_manager_of: {
        Args: { _employee_id: string; _manager_id: string }
        Returns: boolean
      }
      leave_stage_recipients: {
        Args: { _employee_id: string; _stage: string }
        Returns: {
          user_id: string
        }[]
      }
      mark_user_notifications_read: {
        Args: { _notification_ids?: string[] }
        Returns: number
      }
      mark_user_notifications_unread: {
        Args: { _notification_ids: string[] }
        Returns: number
      }
      next_leave_stage_from_route: {
        Args: { _current_stage?: string; _route: string[] }
        Returns: string
      }
      normalize_username: { Args: { _value: string }; Returns: string }
      notification_admin_combined_dashboard: {
        Args: {
          _dl_limit?: number
          _dl_window_hours?: number
          _queue_limit?: number
          _queue_offset?: number
          _queue_status?: string
          _run_limit?: number
          _run_offset?: number
          _run_status?: string
        }
        Returns: Json
      }
      notification_admin_discard_email_queue_item: {
        Args: { _queue_id: string; _reason?: string }
        Returns: {
          attempts: number
          body_text: string
          category: string
          channel: string
          created_at: string
          event_type: string
          failed_at: string | null
          id: string
          last_error: string | null
          last_provider: string | null
          leased_at: string | null
          leased_by: string | null
          next_attempt_at: string
          notification_id: string
          payload: Json
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_delivery_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      notification_admin_email_dead_letter_analytics: {
        Args: { _limit?: number; _window_hours?: number }
        Returns: Json
      }
      notification_admin_email_queue_summary: { Args: never; Returns: Json }
      notification_admin_email_worker_run_summary: {
        Args: never
        Returns: Json
      }
      notification_admin_list_email_queue: {
        Args: { _limit?: number; _offset?: number; _status?: string }
        Returns: {
          attempts: number
          body_text: string
          category: string
          channel: string
          created_at: string
          event_type: string
          failed_at: string | null
          id: string
          last_error: string | null
          last_provider: string | null
          leased_at: string | null
          leased_by: string | null
          next_attempt_at: string
          notification_id: string
          payload: Json
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_delivery_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      notification_admin_list_email_worker_runs: {
        Args: { _limit?: number; _offset?: number; _status?: string }
        Returns: {
          claimed_count: number
          discarded_count: number
          duration_ms: number | null
          error_message: string | null
          failed_count: number
          finished_at: string | null
          id: string
          processed_count: number
          provider: string
          request_batch_size: number
          request_lease_seconds: number
          request_max_attempts: number
          request_payload: Json
          request_retry_delay_seconds: number
          run_status: string
          sent_count: number
          started_at: string
          updated_at: string
          worker_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_email_worker_runs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      notification_admin_requeue_email_queue_item: {
        Args: { _delay_seconds?: number; _queue_id: string }
        Returns: {
          attempts: number
          body_text: string
          category: string
          channel: string
          created_at: string
          event_type: string
          failed_at: string | null
          id: string
          last_error: string | null
          last_provider: string | null
          leased_at: string | null
          leased_by: string | null
          next_attempt_at: string
          notification_id: string
          payload: Json
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_delivery_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      notification_category_enabled: {
        Args: { _category: string; _user_id: string }
        Returns: boolean
      }
      notification_email_category_enabled: {
        Args: { _category: string; _user_id: string }
        Returns: boolean
      }
      notification_worker_claim_email_queue: {
        Args: {
          _batch_size?: number
          _lease_seconds?: number
          _max_attempts?: number
          _worker_id?: string
        }
        Returns: {
          attempts: number
          body_text: string
          category: string
          channel: string
          created_at: string
          event_type: string
          failed_at: string | null
          id: string
          last_error: string | null
          last_provider: string | null
          leased_at: string | null
          leased_by: string | null
          next_attempt_at: string
          notification_id: string
          payload: Json
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_delivery_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      notification_worker_finalize_email_queue_item: {
        Args: {
          _error?: string
          _outcome: string
          _queue_id: string
          _retry_delay_seconds?: number
          _worker_id?: string
        }
        Returns: {
          attempts: number
          body_text: string
          category: string
          channel: string
          created_at: string
          event_type: string
          failed_at: string | null
          id: string
          last_error: string | null
          last_provider: string | null
          leased_at: string | null
          leased_by: string | null
          next_attempt_at: string
          notification_id: string
          payload: Json
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_delivery_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      notification_worker_finalize_email_queue_item_v2: {
        Args: {
          _error?: string
          _outcome: string
          _provider?: string
          _queue_id: string
          _retry_delay_seconds?: number
          _worker_id?: string
        }
        Returns: {
          attempts: number
          body_text: string
          category: string
          channel: string
          created_at: string
          event_type: string
          failed_at: string | null
          id: string
          last_error: string | null
          last_provider: string | null
          leased_at: string | null
          leased_by: string | null
          next_attempt_at: string
          notification_id: string
          payload: Json
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_delivery_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      notification_worker_finish_email_run: {
        Args: {
          _claimed_count?: number
          _discarded_count?: number
          _duration_ms?: number
          _error?: string
          _failed_count?: number
          _processed_count?: number
          _run_id: string
          _sent_count?: number
        }
        Returns: {
          claimed_count: number
          discarded_count: number
          duration_ms: number | null
          error_message: string | null
          failed_count: number
          finished_at: string | null
          id: string
          processed_count: number
          provider: string
          request_batch_size: number
          request_lease_seconds: number
          request_max_attempts: number
          request_payload: Json
          request_retry_delay_seconds: number
          run_status: string
          sent_count: number
          started_at: string
          updated_at: string
          worker_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_email_worker_runs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      notification_worker_start_email_run: {
        Args: {
          _batch_size?: number
          _lease_seconds?: number
          _max_attempts?: number
          _provider: string
          _request_payload?: Json
          _retry_delay_seconds?: number
          _worker_id: string
        }
        Returns: string
      }
      request_leave_cancellation: {
        Args: { _reason?: string; _request_id: string }
        Returns: string
      }
      request_user_id: { Args: never; Returns: string }
      resolve_leave_request_workflow_snapshot: {
        Args: { _employee_id: string }
        Returns: string[]
      }
      resolve_login_email: { Args: { _identifier: string }; Returns: string }
      run_notification_retention_job: {
        Args: {
          _failed_queue_days?: number
          _read_notifications_days?: number
          _sent_queue_days?: number
        }
        Returns: Json
      }
      seed_onboarding_checklist: {
        Args: { p_employee_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "hr"
        | "manager"
        | "employee"
        | "general_manager"
        | "director"
      deduction_type: "fixed" | "percentage"
      document_category: "contract" | "certificate" | "official" | "other"
      payroll_status: "draft" | "processing" | "completed" | "cancelled"
      payslip_status: "pending" | "paid" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "hr",
        "manager",
        "employee",
        "general_manager",
        "director",
      ],
      deduction_type: ["fixed", "percentage"],
      document_category: ["contract", "certificate", "official", "other"],
      payroll_status: ["draft", "processing", "completed", "cancelled"],
      payslip_status: ["pending", "paid", "cancelled"],
    },
  },
} as const
