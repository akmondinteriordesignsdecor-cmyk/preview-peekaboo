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
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          role: string | null
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          role?: string | null
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          role?: string | null
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      crypto_access_requests: {
        Row: {
          created_at: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      crypto_nft_checkouts: {
        Row: {
          amount_usdt: number
          created_at: string
          id: string
          payment_id: string
          status: string
          tx_hash: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount_usdt: number
          created_at?: string
          id?: string
          payment_id: string
          status?: string
          tx_hash?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          amount_usdt?: number
          created_at?: string
          id?: string
          payment_id?: string
          status?: string
          tx_hash?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_nft_checkouts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_spins: {
        Row: {
          created_at: string
          id: string
          jackpot: boolean
          reward_mvt: number
          spin_date: string
          streak: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jackpot?: boolean
          reward_mvt: number
          spin_date?: string
          streak?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jackpot?: boolean
          reward_mvt?: number
          spin_date?: string
          streak?: number
          user_id?: string
        }
        Relationships: []
      }
      influencer_earnings: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      influencer_submissions: {
        Row: {
          admin_note: string | null
          award_usd: number | null
          channel_links: string
          created_at: string
          id: string
          message: string
          reviewed_at: string | null
          screenshots: string[]
          status: string
          user_id: string
          views: number
        }
        Insert: {
          admin_note?: string | null
          award_usd?: number | null
          channel_links: string
          created_at?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          screenshots?: string[]
          status?: string
          user_id?: string
          views?: number
        }
        Update: {
          admin_note?: string | null
          award_usd?: number | null
          channel_links?: string
          created_at?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          screenshots?: string[]
          status?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
      influencer_withdrawals: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          payout_details: string
          status: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          payout_details: string
          status?: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          payout_details?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
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
      listing_alerts: {
        Row: {
          enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          updated_at?: string
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
      mining_nft_events: {
        Row: {
          actor_id: string | null
          details: Json
          id: string
          kind: string
          occurred_at: string | null
          other_user_id: string | null
          ownership_id: string
          source_key: string | null
        }
        Insert: {
          actor_id?: string | null
          details?: Json
          id?: string
          kind: string
          occurred_at?: string | null
          other_user_id?: string | null
          ownership_id: string
          source_key?: string | null
        }
        Update: {
          actor_id?: string | null
          details?: Json
          id?: string
          kind?: string
          occurred_at?: string | null
          other_user_id?: string | null
          ownership_id?: string
          source_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mining_nft_events_ownership_id_fkey"
            columns: ["ownership_id"]
            isOneToOne: false
            referencedRelation: "nft_ownerships"
            referencedColumns: ["id"]
          },
        ]
      }
      mining_sessions: {
        Row: {
          cancelled_at: string | null
          claimed_at: string | null
          ends_at: string
          id: string
          ownership_id: string | null
          purchase_id: string
          reward_mvt: number | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          claimed_at?: string | null
          ends_at: string
          id?: string
          ownership_id?: string | null
          purchase_id: string
          reward_mvt?: number | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          claimed_at?: string | null
          ends_at?: string
          id?: string
          ownership_id?: string | null
          purchase_id?: string
          reward_mvt?: number | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mining_sessions_ownership_id_fkey"
            columns: ["ownership_id"]
            isOneToOne: false
            referencedRelation: "nft_ownerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_sessions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "plan_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      mystery_opens: {
        Row: {
          created_at: string
          id: string
          reward_mvt: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reward_mvt: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reward_mvt?: number
          user_id?: string
        }
        Relationships: []
      }
      nft_listings: {
        Row: {
          buyer_id: string | null
          created_at: string
          history_hidden: boolean
          id: string
          nft_id: string
          ownership_id: string
          price_mvg: number
          seller_id: string
          status: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          history_hidden?: boolean
          id?: string
          nft_id: string
          ownership_id: string
          price_mvg: number
          seller_id: string
          status?: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          history_hidden?: boolean
          id?: string
          nft_id?: string
          ownership_id?: string
          price_mvg?: number
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "nft_listings_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nft_listings_ownership_id_fkey"
            columns: ["ownership_id"]
            isOneToOne: false
            referencedRelation: "nft_ownerships"
            referencedColumns: ["id"]
          },
        ]
      }
      nft_ownerships: {
        Row: {
          created_at: string
          id: string
          nft_id: string
          payment_id: string | null
          plan_purchase_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nft_id: string
          payment_id?: string | null
          plan_purchase_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nft_id?: string
          payment_id?: string | null
          plan_purchase_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nft_ownerships_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nft_ownerships_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nft_ownerships_plan_purchase_id_fkey"
            columns: ["plan_purchase_id"]
            isOneToOne: false
            referencedRelation: "plan_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      nft_task_submissions: {
        Row: {
          created_at: string
          evidence: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evidence: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          evidence?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nft_task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "nft_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      nft_tasks: {
        Row: {
          active: boolean
          award_quantity: number
          created_at: string
          description: string
          id: string
          nft_id: string
          title: string
        }
        Insert: {
          active?: boolean
          award_quantity?: number
          created_at?: string
          description: string
          id?: string
          nft_id: string
          title: string
        }
        Update: {
          active?: boolean
          award_quantity?: number
          created_at?: string
          description?: string
          id?: string
          nft_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "nft_tasks_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
        ]
      }
      nfts: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          discount_pct: number
          history_hidden: boolean
          id: string
          image_url: string | null
          mining_plan_id: string | null
          model_url: string | null
          name: string
          price_usd: number | null
          quantity: number | null
          sort: number
          verified: boolean
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          discount_pct?: number
          history_hidden?: boolean
          id?: string
          image_url?: string | null
          mining_plan_id?: string | null
          model_url?: string | null
          name: string
          price_usd?: number | null
          quantity?: number | null
          sort?: number
          verified?: boolean
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          discount_pct?: number
          history_hidden?: boolean
          id?: string
          image_url?: string | null
          mining_plan_id?: string | null
          model_url?: string | null
          name?: string
          price_usd?: number | null
          quantity?: number | null
          sort?: number
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "nfts_mining_plan_id_fkey"
            columns: ["mining_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
      p2p_listings: {
        Row: {
          created_at: string
          id: string
          mvt_amount: number
          price_usd: number
          side: string
          source_account: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mvt_amount: number
          price_usd: number
          side: string
          source_account?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mvt_amount?: number
          price_usd?: number
          side?: string
          source_account?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      p2p_orders: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          mvt_amount: number
          price_usd: number
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          mvt_amount: number
          price_usd: number
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          mvt_amount?: number
          price_usd?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2p_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "p2p_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_ngn_kobo: number
          amount_usd: number
          created_at: string
          id: string
          kind: string
          mvt_amount: number | null
          nft_id: string | null
          plan_id: string | null
          quote_expires_at: string | null
          reference: string
          status: string
          upgrade_from: string | null
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
          nft_id?: string | null
          plan_id?: string | null
          quote_expires_at?: string | null
          reference: string
          status?: string
          upgrade_from?: string | null
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
          nft_id?: string | null
          plan_id?: string | null
          quote_expires_at?: string | null
          reference?: string
          status?: string
          upgrade_from?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_upgrade_from_fkey"
            columns: ["upgrade_from"]
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
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          marketplace_blocked: boolean
          referral_code: string
          referred_by: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          marketplace_blocked?: boolean
          referral_code: string
          referred_by?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          marketplace_blocked?: boolean
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
          mystery_max_mvt: number
          mystery_min_mvt: number
          purchase_discount_pct: number
          referral_commission_pct: number
          session_hours: number
          spin_max_mvt: number
          spin_min_mvt: number
          streak_reward_days: number
          task_sale_mvg_per_five_usd: number
          usd_to_ngn: number
        }
        Insert: {
          id?: number
          launch_date?: string
          launch_label?: string
          min_withdrawal_usd?: number
          mvt_per_usd?: number
          mystery_max_mvt?: number
          mystery_min_mvt?: number
          purchase_discount_pct?: number
          referral_commission_pct?: number
          session_hours?: number
          spin_max_mvt?: number
          spin_min_mvt?: number
          streak_reward_days?: number
          task_sale_mvg_per_five_usd?: number
          usd_to_ngn?: number
        }
        Update: {
          id?: number
          launch_date?: string
          launch_label?: string
          min_withdrawal_usd?: number
          mvt_per_usd?: number
          mystery_max_mvt?: number
          mystery_min_mvt?: number
          purchase_discount_pct?: number
          referral_commission_pct?: number
          session_hours?: number
          spin_max_mvt?: number
          spin_min_mvt?: number
          streak_reward_days?: number
          task_sale_mvg_per_five_usd?: number
          usd_to_ngn?: number
        }
        Relationships: []
      }
      task_nft_instances: {
        Row: {
          created_at: string
          id: string
          nft_id: string
          submission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nft_id: string
          submission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nft_id?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_nft_instances_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_nft_instances_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "nft_task_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      task_nft_listings: {
        Row: {
          buyer_id: string | null
          created_at: string
          id: string
          instance_id: string
          nft_id: string
          price_usd: number
          seller_id: string
          sold_at: string | null
          status: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          instance_id: string
          nft_id: string
          price_usd: number
          seller_id: string
          sold_at?: string | null
          status?: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          nft_id?: string
          price_usd?: number
          seller_id?: string
          sold_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_nft_listings_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "task_nft_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_nft_listings_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
        ]
      }
      task_nft_orders: {
        Row: {
          amount_ngn_kobo: number
          amount_usd: number
          created_at: string
          expires_at: string
          id: string
          listing_id: string
          mining_mvg: number
          reference: string
          seller_id: string
          status: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          amount_ngn_kobo: number
          amount_usd: number
          created_at?: string
          expires_at?: string
          id?: string
          listing_id: string
          mining_mvg: number
          reference: string
          seller_id: string
          status?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          amount_ngn_kobo?: number
          amount_usd?: number
          created_at?: string
          expires_at?: string
          id?: string
          listing_id?: string
          mining_mvg?: number
          reference?: string
          seller_id?: string
          status?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_nft_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "task_nft_listings"
            referencedColumns: ["id"]
          },
        ]
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
      withdrawal_reviews: {
        Row: {
          admin_details: string | null
          admin_id: string
          created_at: string
          flags: Json
          id: string
          risk: string
          summary: string
          withdrawal_id: string
        }
        Insert: {
          admin_details?: string | null
          admin_id: string
          created_at?: string
          flags?: Json
          id?: string
          risk: string
          summary: string
          withdrawal_id: string
        }
        Update: {
          admin_details?: string | null
          admin_id?: string
          created_at?: string
          flags?: Json
          id?: string
          risk?: string
          summary?: string
          withdrawal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_reviews_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
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
      admin_create_nft_task: {
        Args: {
          _description: string
          _nft: string
          _quantity: number
          _title: string
        }
        Returns: string
      }
      admin_set_influencer_withdrawal: {
        Args: { _id: string; _status: string }
        Returns: undefined
      }
      admin_set_task_reward: { Args: { _rate: number }; Returns: undefined }
      admin_set_withdrawal: {
        Args: { _id: string; _note: string; _status: string }
        Returns: undefined
      }
      admin_toggle_nft_task: {
        Args: { _active: boolean; _id: string }
        Returns: undefined
      }
      cancel_p2p_listing: { Args: { _id: string }; Returns: undefined }
      cancel_withdrawal: { Args: { _id: string }; Returns: undefined }
      claim_mining: { Args: { _session: string }; Returns: Json }
      convert_mvt: { Args: { _mvt: number }; Returns: Json }
      create_p2p_listing: {
        Args: { _mvt: number; _price: number; _side: string }
        Returns: string
      }
      fill_p2p_order: { Args: { _listing: string }; Returns: Json }
      fulfill_payment: {
        Args: { _paid_kobo: number; _reference: string }
        Returns: string
      }
      fulfill_task_nft_payment: {
        Args: { _paid_kobo: number; _reference: string }
        Returns: string
      }
      game_status: { Args: never; Returns: Json }
      get_balances: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      influencer_balance: { Args: never; Returns: Json }
      join_whitelist: { Args: { _wallet: string }; Returns: undefined }
      list_purchased_coins: {
        Args: { _amount: number; _price: number }
        Returns: string
      }
      moderate_coin_listing: { Args: { _id: string }; Returns: undefined }
      moderate_market: {
        Args: { _blocked?: boolean; _id: string; _kind: string }
        Returns: undefined
      }
      my_mining_nft_timeline: { Args: never; Returns: Json }
      nft_inventory: {
        Args: never
        Returns: {
          nft_id: string
          reserved: number
          sold: number
        }[]
      }
      nft_market_action: {
        Args: { _action: string; _id: string; _price?: number }
        Returns: string
      }
      open_mystery_box: { Args: never; Returns: Json }
      platform_stats: { Args: never; Returns: Json }
      prepare_checkout: {
        Args: { _kind: string; _rate: number; _target: string; _usd: number }
        Returns: Json
      }
      prepare_checkout_for_user: {
        Args: {
          _kind: string
          _rate: number
          _target: string
          _usd: number
          _user: string
        }
        Returns: Json
      }
      prepare_crypto_nft_checkout: {
        Args: { _nft: string; _user: string; _wallet: string }
        Returns: Json
      }
      prepare_task_nft_checkout: {
        Args: { _listing: string; _rate: number; _user: string }
        Returns: Json
      }
      referral_stats: { Args: never; Returns: Json }
      request_influencer_withdrawal: {
        Args: { _amount: number; _details: string }
        Returns: string
      }
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
      review_crypto_request: {
        Args: { _approve: boolean; _user: string }
        Returns: undefined
      }
      review_influencer: {
        Args: { _approve: boolean; _award: number; _id: string; _note: string }
        Returns: undefined
      }
      review_nft_task: {
        Args: { _approve: boolean; _id: string; _note: string }
        Returns: undefined
      }
      settle_crypto_nft_verified: {
        Args: { _hash: string; _id: string; _user: string }
        Returns: string
      }
      settle_task_nft_verified: {
        Args: { _paid_kobo: number; _reference: string }
        Returns: string
      }
      spin_roulette: { Args: never; Returns: Json }
      start_mining: { Args: never; Returns: Json }
      submit_nft_task: {
        Args: { _evidence: string; _task: string }
        Returns: string
      }
      system_set_withdrawal: {
        Args: { _id: string; _note: string; _status: string }
        Returns: undefined
      }
      task_nft_market_action: {
        Args: { _action: string; _id: string; _price?: number }
        Returns: string
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
