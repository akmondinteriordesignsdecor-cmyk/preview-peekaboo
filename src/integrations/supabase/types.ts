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
      ledger_entries: {
        Row: {
          account: string
          amount: number
          created_at: string
          details: Json
          id: string
          kind: string
          reference: string
          status: string
          user_id: string
        }
        Insert: {
          account: string
          amount: number
          created_at?: string
          details?: Json
          id?: string
          kind: string
          reference: string
          status?: string
          user_id: string
        }
        Update: {
          account?: string
          amount?: number
          created_at?: string
          details?: Json
          id?: string
          kind?: string
          reference?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      login_events: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          method: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          method?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          method?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mining_sessions: {
        Row: {
          claimed_at: string | null
          ends_at: string
          id: string
          purchase_id: string
          reward_mvt: number | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          ends_at: string
          id?: string
          purchase_id: string
          reward_mvt?: number | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          ends_at?: string
          id?: string
          purchase_id?: string
          reward_mvt?: number | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mining_sessions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "plan_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_ngn_kobo: number
          amount_usd: number
          created_at: string
          id: string
          kind: string
          mvt_amount: number | null
          plan_id: string | null
          reference: string
          status: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          amount_ngn_kobo: number
          amount_usd: number
          created_at?: string
          id?: string
          kind: string
          mvt_amount?: number | null
          plan_id?: string | null
          reference: string
          status?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          amount_ngn_kobo?: number
          amount_usd?: number
          created_at?: string
          id?: string
          kind?: string
          mvt_amount?: number | null
          plan_id?: string | null
          reference?: string
          status?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_purchases: {
        Row: {
          created_at: string
          id: string
          payment_id: string
          plan_id: string
          referral_paid: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id: string
          plan_id: string
          referral_paid?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string
          plan_id?: string
          referral_paid?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_purchases_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_purchases_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          capacity_ths: number
          id: string
          mvt_per_session: number
          name: string
          price_usd: number
          sort: number
        }
        Insert: {
          active?: boolean
          capacity_ths: number
          id?: string
          mvt_per_session?: number
          name: string
          price_usd: number
          sort?: number
        }
        Update: {
          active?: boolean
          capacity_ths?: number
          id?: string
          mvt_per_session?: number
          name?: string
          price_usd?: number
          sort?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          referral_code: string
          referred_by: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          referral_code: string
          referred_by?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          referral_code?: string
          referred_by?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: number
          launch_date: string
          launch_label: string
          min_withdrawal_usd: number
          mvt_per_usd: number
          referral_commission_pct: number
          session_hours: number
          usd_to_ngn: number
        }
        Insert: {
          id?: number
          launch_date?: string
          launch_label?: string
          min_withdrawal_usd?: number
          mvt_per_usd?: number
          referral_commission_pct?: number
          session_hours?: number
          usd_to_ngn?: number
        }
        Update: {
          id?: number
          launch_date?: string
          launch_label?: string
          min_withdrawal_usd?: number
          mvt_per_usd?: number
          referral_commission_pct?: number
          session_hours?: number
          usd_to_ngn?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whitelist: {
        Row: {
          created_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_name: string | null
          account_number: string | null
          admin_note: string | null
          amount_ngn_kobo: number | null
          amount_usd: number
          bank_code: string | null
          bank_name: string | null
          created_at: string
          id: string
          method: string
          reference: string
          status: string
          transfer_code: string | null
          transfer_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          admin_note?: string | null
          amount_ngn_kobo?: number | null
          amount_usd: number
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          method: string
          reference: string
          status?: string
          transfer_code?: string | null
          transfer_ref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          admin_note?: string | null
          amount_ngn_kobo?: number | null
          amount_usd?: number
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          method?: string
          reference?: string
          status?: string
          transfer_code?: string | null
          transfer_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_withdrawal: {
        Args: { _id: string; _note: string; _status: string }
        Returns: undefined
      }
      cancel_withdrawal: { Args: { _id: string }; Returns: undefined }
      claim_mining: { Args: { _session: string }; Returns: Json }
      fulfill_payment: {
        Args: { _paid_kobo: number; _reference: string }
        Returns: string
      }
      get_balances: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_whitelist: { Args: { _wallet: string }; Returns: undefined }
      platform_stats: { Args: never; Returns: Json }
      referral_stats: { Args: never; Returns: Json }
      request_withdrawal: {
        Args: {
          _acct: string
          _amount: number
          _bank: string
          _method: string
          _name: string
        }
        Returns: Json
      }
      start_mining: { Args: never; Returns: Json }
      system_set_withdrawal: {
        Args: { _id: string; _note: string; _status: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
