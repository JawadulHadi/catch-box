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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      human_triage_queue: {
        Row: {
          created_at: string
          error_trace: string | null
          error_type: Database["public"]["Enums"]["catch_reason"]
          id: string
          missing_fields: string[]
          owner_id: string
          raw_payload: Json
          resolved_at: string | null
          site: string
          status: Database["public"]["Enums"]["catch_status"]
          url: string
        }
        Insert: {
          created_at?: string
          error_trace?: string | null
          error_type?: Database["public"]["Enums"]["catch_reason"]
          id?: string
          missing_fields?: string[]
          owner_id?: string
          raw_payload?: Json
          resolved_at?: string | null
          site: string
          status?: Database["public"]["Enums"]["catch_status"]
          url: string
        }
        Update: {
          created_at?: string
          error_trace?: string | null
          error_type?: Database["public"]["Enums"]["catch_reason"]
          id?: string
          missing_fields?: string[]
          owner_id?: string
          raw_payload?: Json
          resolved_at?: string | null
          site?: string
          status?: Database["public"]["Enums"]["catch_status"]
          url?: string
        }
        Relationships: []
      }
      ingest_keys: {
        Row: {
          created_at: string
          id: string
          key: string
          owner_id: string
          rotated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          owner_id?: string
          rotated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          owner_id?: string
          rotated_at?: string | null
        }
        Relationships: []
      }
      scraped_warehouse: {
        Row: {
          data: Json
          extracted_at: string
          id: string
          owner_id: string
          site: string
          source_record_id: string | null
          url: string
        }
        Insert: {
          data?: Json
          extracted_at?: string
          id?: string
          owner_id?: string
          site: string
          source_record_id?: string | null
          url: string
        }
        Update: {
          data?: Json
          extracted_at?: string
          id?: string
          owner_id?: string
          site?: string
          source_record_id?: string | null
          url?: string
        }
        Relationships: []
      }
      scraper_jobs: {
        Row: {
          created_at: string
          failure_count: number
          id: string
          last_failure_at: string | null
          owner_id: string
          schedule: string
          site: string
        }
        Insert: {
          created_at?: string
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          owner_id?: string
          schedule?: string
          site: string
        }
        Update: {
          created_at?: string
          failure_count?: number
          id?: string
          last_failure_at?: string | null
          owner_id?: string
          schedule?: string
          site?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_ingest_key: { Args: { p_rotate?: boolean }; Returns: string }
      promote_triage_record: {
        Args: { p_data: Json; p_record_id: string }
        Returns: string
      }
      seed_demo_data: { Args: never; Returns: undefined }
    }
    Enums: {
      catch_reason: "page_changed" | "blocked" | "missing_info" | "other"
      catch_status: "pending" | "resolved" | "discarded"
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
      catch_reason: ["page_changed", "blocked", "missing_info", "other"],
      catch_status: ["pending", "resolved", "discarded"],
    },
  },
} as const
