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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      user_roles: {
        Row: {
          active: boolean
          contexts: string[]
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          contexts?: string[]
          role: string
          user_id: string
        }
        Update: {
          active?: boolean
          contexts?: string[]
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_request_limits: {
        Row: {
          bucket: string
          requests: number
          started_at: string
        }
        Insert: {
          bucket: string
          requests?: number
          started_at?: string
        }
        Update: {
          bucket?: string
          requests?: number
          started_at?: string
        }
        Relationships: []
      }
      voice_service_controls: {
        Row: {
          id: string
          paused: boolean
          reason: string | null
          status: number | null
          updated_at: string
        }
        Insert: {
          id: string
          paused?: boolean
          reason?: string | null
          status?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          paused?: boolean
          reason?: string | null
          status?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      whispers_audit: {
        Row: {
          action: string
          actor_id: string | null
          at: string
          id: string
          outcome: string
          target_id: string | null
          workspace: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          at?: string
          id?: string
          outcome?: string
          target_id?: string | null
          workspace: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string
          id?: string
          outcome?: string
          target_id?: string | null
          workspace?: string
        }
        Relationships: []
      }
      whispers_daily_ai_usage: {
        Row: {
          day: string
          requests: number
          service: string
        }
        Insert: {
          day?: string
          requests?: number
          service: string
        }
        Update: {
          day?: string
          requests?: number
          service?: string
        }
        Relationships: []
      }
      whispers_expert_assignments: {
        Row: {
          expert_id: string
          request_id: string
        }
        Insert: {
          expert_id: string
          request_id: string
        }
        Update: {
          expert_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whispers_expert_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "whispers_expert_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      whispers_expert_requests: {
        Row: {
          created_at: string
          id: string
          interpretation: string | null
          packet: Json
          report_ids: string[]
          state: string
          workspace: string
        }
        Insert: {
          created_at?: string
          id?: string
          interpretation?: string | null
          packet: Json
          report_ids: string[]
          state?: string
          workspace: string
        }
        Update: {
          created_at?: string
          id?: string
          interpretation?: string | null
          packet?: Json
          report_ids?: string[]
          state?: string
          workspace?: string
        }
        Relationships: []
      }
      whispers_expert_responses: {
        Row: {
          choice: string
          created_at: string
          expert_id: string
          explanation: string
          id: string
          request_id: string
          source: string | null
        }
        Insert: {
          choice: string
          created_at?: string
          expert_id: string
          explanation: string
          id?: string
          request_id: string
          source?: string | null
        }
        Update: {
          choice?: string
          created_at?: string
          expert_id?: string
          explanation?: string
          id?: string
          request_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whispers_expert_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "whispers_expert_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      whispers_interface_translations: {
        Row: {
          batch_offset: number
          catalog_hash: string
          claimed_at: string
          language: string
          phrases: Json | null
          status: string
        }
        Insert: {
          batch_offset: number
          catalog_hash: string
          claimed_at?: string
          language: string
          phrases?: Json | null
          status?: string
        }
        Update: {
          batch_offset?: number
          catalog_hash?: string
          claimed_at?: string
          language?: string
          phrases?: Json | null
          status?: string
        }
        Relationships: []
      }
      whispers_media_cleanup: {
        Row: {
          queued_at: string
          report_id: string
        }
        Insert: {
          queued_at?: string
          report_id: string
        }
        Update: {
          queued_at?: string
          report_id?: string
        }
        Relationships: []
      }
      whispers_records: {
        Row: {
          body: Json
          created_at: string
          id: string
          kind: string
          report_id: string | null
          upload_id: string | null
          workspace: string
        }
        Insert: {
          body: Json
          created_at?: string
          id?: string
          kind: string
          report_id?: string | null
          upload_id?: string | null
          workspace: string
        }
        Update: {
          body?: Json
          created_at?: string
          id?: string
          kind?: string
          report_id?: string | null
          upload_id?: string | null
          workspace?: string
        }
        Relationships: [
          {
            foreignKeyName: "whispers_records_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "whispers_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      whispers_release: {
        Row: {
          id: string
          live_intake: boolean
          operator_contact: string | null
          operator_name: string | null
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          live_intake?: boolean
          operator_contact?: string | null
          operator_name?: string | null
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          live_intake?: boolean
          operator_contact?: string | null
          operator_name?: string | null
          reviewed_at?: string | null
        }
        Relationships: []
      }
      whispers_release_reviews: {
        Row: {
          id: string
          kind: string
          reference: string
          reviewed_at: string
          reviewer_id: string
        }
        Insert: {
          id?: string
          kind: string
          reference: string
          reviewed_at?: string
          reviewer_id: string
        }
        Update: {
          id?: string
          kind?: string
          reference?: string
          reviewed_at?: string
          reviewer_id?: string
        }
        Relationships: []
      }
      whispers_reports: {
        Row: {
          body: Json
          code_hash: string
          expires_at: string
          id: string
          idempotency_key: string
          payload_hash: string
          photo_count: number
          received_at: string
          removal_requested_at: string | null
          revoked_at: string | null
          version: number
          workspace: string
        }
        Insert: {
          body: Json
          code_hash: string
          expires_at?: string
          id?: string
          idempotency_key: string
          payload_hash: string
          photo_count?: number
          received_at?: string
          removal_requested_at?: string | null
          revoked_at?: string | null
          version?: number
          workspace: string
        }
        Update: {
          body?: Json
          code_hash?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          payload_hash?: string
          photo_count?: number
          received_at?: string
          removal_requested_at?: string | null
          revoked_at?: string | null
          version?: number
          workspace?: string
        }
        Relationships: []
      }
      whispers_staff_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          revoked_at: string | null
          role: string
          workspace: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          role: string
          workspace: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          role?: string
          workspace?: string
        }
        Relationships: []
      }
      whispers_updates: {
        Row: {
          approver_id: string | null
          author_id: string
          body: Json
          created_at: string
          disclosure_reviewer_id: string | null
          id: string
          published_at: string | null
          publisher_id: string | null
          source_report_ids: string[]
          state: string
          workspace: string
        }
        Insert: {
          approver_id?: string | null
          author_id: string
          body: Json
          created_at?: string
          disclosure_reviewer_id?: string | null
          id?: string
          published_at?: string | null
          publisher_id?: string | null
          source_report_ids?: string[]
          state?: string
          workspace: string
        }
        Update: {
          approver_id?: string | null
          author_id?: string
          body?: Json
          created_at?: string
          disclosure_reviewer_id?: string | null
          id?: string
          published_at?: string | null
          publisher_id?: string | null
          source_report_ids?: string[]
          state?: string
          workspace?: string
        }
        Relationships: []
      }
    }
    Views: {
      whispers_public_updates: {
        Row: {
          id: string | null
          known: string | null
          published_at: string | null
          sources: Json | null
          summary: string | null
          title: string | null
          uncertain: string | null
          withdrawn: boolean | null
        }
        Insert: {
          id?: string | null
          known?: never
          published_at?: string | null
          sources?: never
          summary?: never
          title?: never
          uncertain?: never
          withdrawn?: never
        }
        Update: {
          id?: string | null
          known?: never
          published_at?: string | null
          sources?: never
          summary?: never
          title?: never
          uncertain?: never
          withdrawn?: never
        }
        Relationships: []
      }
    }
    Functions: {
      reserve_voice_request: { Args: { p_bucket: string }; Returns: boolean }
      whispers_accept_staff_invitations: { Args: never; Returns: number }
      whispers_access: {
        Args: { needed: string; ws: string }
        Returns: boolean
      }
      whispers_claim_translation: {
        Args: { p_hash: string; p_language: string; p_offset: number }
        Returns: boolean
      }
      whispers_expire_private: { Args: never; Returns: number }
      whispers_publication_transition: {
        Args: { p_action: string; p_actor: string; p_id: string }
        Returns: boolean
      }
      whispers_reserve_daily_ai: {
        Args: { p_cap: number; p_service: string }
        Returns: boolean
      }
      whispers_revoke_private: { Args: { p_id: string }; Returns: boolean }
      whispers_update_report: {
        Args: { p_body: Json; p_id: string; p_version: number }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
