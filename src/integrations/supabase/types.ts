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
      ai_requests: {
        Row: {
          created_at: string
          fingerprint: string
          period_start: string
          reply: string | null
          request_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          period_start?: string
          reply?: string | null
          request_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          period_start?: string
          reply?: string | null
          request_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          provider_event_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          role: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          answers: Json
          categories: Json
          classification: string
          company_id: string | null
          created_at: string
          first_agent: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          answers: Json
          categories: Json
          classification: string
          company_id?: string | null
          created_at?: string
          first_agent: string
          id?: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          categories?: Json
          classification?: string
          company_id?: string | null
          created_at?: string
          first_agent?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_test_accounts: {
        Row: {
          enabled: boolean
          plan_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          plan_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          plan_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          company_id: string | null
          contact: string | null
          created_at: string
          id: string
          name: string
          next_action: string | null
          stage: string
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          company_id?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          next_action?: string | null
          stage?: string
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          company_id?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          next_action?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email_notifications: boolean
          full_name: string | null
          id: string
          main_goal: string | null
          onboarded: boolean
          segment: string | null
          team_size: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email_notifications?: boolean
          full_name?: string | null
          id: string
          main_goal?: string | null
          onboarded?: boolean
          segment?: string | null
          team_size?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email_notifications?: boolean
          full_name?: string | null
          id?: string
          main_goal?: string | null
          onboarded?: boolean
          segment?: string | null
          team_size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          current_period_end: string | null
          plan_id: string | null
          provider: string | null
          provider_customer_id: string | null
          provider_order_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_period_end?: string | null
          plan_id?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_order_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_period_end?: string | null
          plan_id?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_order_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          company_id: string | null
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_channels: {
        Row: {
          ai_enabled: boolean
          business_hours: string
          company_id: string
          display_phone: string | null
          handoff_message: string
          phone_number_id: string | null
          prompt: string
          status: string
          updated_at: string
          waba_id: string | null
        }
        Insert: {
          ai_enabled?: boolean
          business_hours?: string
          company_id: string
          display_phone?: string | null
          handoff_message?: string
          phone_number_id?: string | null
          prompt?: string
          status?: string
          updated_at?: string
          waba_id?: string | null
        }
        Update: {
          ai_enabled?: boolean
          business_hours?: string
          company_id?: string
          display_phone?: string | null
          handoff_message?: string
          phone_number_id?: string | null
          prompt?: string
          status?: string
          updated_at?: string
          waba_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_contacts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string | null
          wa_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name?: string | null
          wa_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string | null
          wa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_conversations: {
        Row: {
          ai_paused: boolean
          company_id: string
          contact_id: string
          created_at: string
          id: string
          last_message_at: string
        }
        Insert: {
          ai_paused?: boolean
          company_id: string
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string
        }
        Update: {
          ai_paused?: boolean
          company_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "wa_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_messages: {
        Row: {
          body: string
          company_id: string
          conversation_id: string
          created_at: string
          direction: string
          external_id: string | null
          id: string
          sender: string
        }
        Insert: {
          body: string
          company_id: string
          conversation_id: string
          created_at?: string
          direction: string
          external_id?: string | null
          id?: string
          sender: string
        }
        Update: {
          body?: string
          company_id?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          external_id?: string | null
          id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_company_for: { Args: { _user: string }; Returns: string }
      get_effective_subscription: { Args: never; Returns: Json }
      has_company_role: {
        Args: {
          _company: string
          _role: Database["public"]["Enums"]["company_role"]
        }
        Returns: boolean
      }
      has_operational_access: { Args: never; Returns: boolean }
      is_company_member: { Args: { _company: string }; Returns: boolean }
      my_company_id: { Args: never; Returns: string }
      process_kiwify_webhook: { Args: { command: Json }; Returns: Json }
      reserve_ai_interaction: {
        Args: { content_hash: string; request_key: string }
        Returns: Json
      }
      set_internal_test_plan: { Args: { selected_plan: string }; Returns: Json }
    }
    Enums: {
      company_role: "owner" | "agent"
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
    Enums: {
      company_role: ["owner", "agent"],
    },
  },
} as const
