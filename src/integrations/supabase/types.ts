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
      downtime: {
        Row: {
          created_at: string
          id: string
          line_id: string
          minutes: number
          notes: string | null
          occurred_at: string
          plan_id: string | null
          reason: Database["public"]["Enums"]["downtime_reason_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          line_id: string
          minutes?: number
          notes?: string | null
          occurred_at?: string
          plan_id?: string | null
          reason: Database["public"]["Enums"]["downtime_reason_type"]
        }
        Update: {
          created_at?: string
          id?: string
          line_id?: string
          minutes?: number
          notes?: string | null
          occurred_at?: string
          plan_id?: string | null
          reason?: Database["public"]["Enums"]["downtime_reason_type"]
        }
        Relationships: [
          {
            foreignKeyName: "downtime_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "production_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      factories: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      factory_daily_summary: {
        Row: {
          absenteeism_pct: number | null
          capacity_utilization_pct: number | null
          created_at: string
          date: string
          dhu_pct: number | null
          efficiency_pct: number | null
          factory_id: string
          id: string
          lost_time_pct: number | null
          man_to_machine_ratio: number | null
          npt_pct: number | null
          planned_operators: number
          present_operators: number
          rft_pct: number | null
          total_checked: number
          total_defects: number
          total_downtime_minutes: number
          total_machines: number
          total_manpower: number
          total_npt_minutes: number
          total_output: number
          total_rework: number
          total_target: number
          total_working_minutes: number
          updated_at: string
          weighted_smv: number
        }
        Insert: {
          absenteeism_pct?: number | null
          capacity_utilization_pct?: number | null
          created_at?: string
          date: string
          dhu_pct?: number | null
          efficiency_pct?: number | null
          factory_id: string
          id?: string
          lost_time_pct?: number | null
          man_to_machine_ratio?: number | null
          npt_pct?: number | null
          planned_operators?: number
          present_operators?: number
          rft_pct?: number | null
          total_checked?: number
          total_defects?: number
          total_downtime_minutes?: number
          total_machines?: number
          total_manpower?: number
          total_npt_minutes?: number
          total_output?: number
          total_rework?: number
          total_target?: number
          total_working_minutes?: number
          updated_at?: string
          weighted_smv?: number
        }
        Update: {
          absenteeism_pct?: number | null
          capacity_utilization_pct?: number | null
          created_at?: string
          date?: string
          dhu_pct?: number | null
          efficiency_pct?: number | null
          factory_id?: string
          id?: string
          lost_time_pct?: number | null
          man_to_machine_ratio?: number | null
          npt_pct?: number | null
          planned_operators?: number
          present_operators?: number
          rft_pct?: number | null
          total_checked?: number
          total_defects?: number
          total_downtime_minutes?: number
          total_machines?: number
          total_manpower?: number
          total_npt_minutes?: number
          total_output?: number
          total_rework?: number
          total_target?: number
          total_working_minutes?: number
          updated_at?: string
          weighted_smv?: number
        }
        Relationships: [
          {
            foreignKeyName: "factory_daily_summary_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          created_at: string
          factory_id: string
          floor_index: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          factory_id: string
          floor_index?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          factory_id?: string
          floor_index?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "floors_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      hourly_production: {
        Row: {
          checked_qty: number
          created_at: string
          defects: number
          downtime_minutes: number
          downtime_reason:
            | Database["public"]["Enums"]["downtime_reason_type"]
            | null
          helpers_present: number
          hour_slot: number
          id: string
          npt_minutes: number
          operators_present: number
          plan_id: string
          produced_qty: number
          rework: number
        }
        Insert: {
          checked_qty?: number
          created_at?: string
          defects?: number
          downtime_minutes?: number
          downtime_reason?:
            | Database["public"]["Enums"]["downtime_reason_type"]
            | null
          helpers_present?: number
          hour_slot: number
          id?: string
          npt_minutes?: number
          operators_present?: number
          plan_id: string
          produced_qty?: number
          rework?: number
        }
        Update: {
          checked_qty?: number
          created_at?: string
          defects?: number
          downtime_minutes?: number
          downtime_reason?:
            | Database["public"]["Enums"]["downtime_reason_type"]
            | null
          helpers_present?: number
          hour_slot?: number
          id?: string
          npt_minutes?: number
          operators_present?: number
          plan_id?: string
          produced_qty?: number
          rework?: number
        }
        Relationships: [
          {
            foreignKeyName: "hourly_production_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "production_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lines: {
        Row: {
          created_at: string
          floor_id: string
          helper_count: number
          id: string
          ie_name: string | null
          is_active: boolean
          line_number: number
          machine_count: number
          operator_count: number
          supervisor: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          floor_id: string
          helper_count?: number
          id?: string
          ie_name?: string | null
          is_active?: boolean
          line_number: number
          machine_count?: number
          operator_count?: number
          supervisor?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          floor_id?: string
          helper_count?: number
          id?: string
          ie_name?: string | null
          is_active?: boolean
          line_number?: number
          machine_count?: number
          operator_count?: number
          supervisor?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lines_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          created_at: string
          employee_no: string
          factory_id: string
          grade: Database["public"]["Enums"]["operator_grade"]
          id: string
          is_active: boolean
          joined_at: string | null
          line_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_no: string
          factory_id: string
          grade?: Database["public"]["Enums"]["operator_grade"]
          id?: string
          is_active?: boolean
          joined_at?: string | null
          line_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_no?: string
          factory_id?: string
          grade?: Database["public"]["Enums"]["operator_grade"]
          id?: string
          is_active?: boolean
          joined_at?: string | null
          line_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operators_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operators_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      production_plans: {
        Row: {
          created_at: string
          date: string
          id: string
          ie_person_id: string | null
          line_id: string
          planned_efficiency: number
          planned_helpers: number
          planned_operators: number
          production_manager_id: string | null
          style_id: string
          target_efficiency: number
          target_qty: number
          updated_at: string
          working_hours: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          ie_person_id?: string | null
          line_id: string
          planned_efficiency?: number
          planned_helpers?: number
          planned_operators?: number
          production_manager_id?: string | null
          style_id: string
          target_efficiency?: number
          target_qty?: number
          updated_at?: string
          working_hours?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          ie_person_id?: string | null
          line_id?: string
          planned_efficiency?: number
          planned_helpers?: number
          planned_operators?: number
          production_manager_id?: string | null
          style_id?: string
          target_efficiency?: number
          target_qty?: number
          updated_at?: string
          working_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_plans_ie_person_id_fkey"
            columns: ["ie_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_production_manager_id_fkey"
            columns: ["production_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          factory_id: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          factory_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          factory_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      style_changeovers: {
        Row: {
          changeover_date: string
          created_at: string
          from_style_id: string | null
          hours_lost: number
          id: string
          learning_curve_days: number
          line_id: string
          notes: string | null
          to_style_id: string
        }
        Insert: {
          changeover_date: string
          created_at?: string
          from_style_id?: string | null
          hours_lost?: number
          id?: string
          learning_curve_days?: number
          line_id: string
          notes?: string | null
          to_style_id: string
        }
        Update: {
          changeover_date?: string
          created_at?: string
          from_style_id?: string | null
          hours_lost?: number
          id?: string
          learning_curve_days?: number
          line_id?: string
          notes?: string | null
          to_style_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "style_changeovers_from_style_id_fkey"
            columns: ["from_style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "style_changeovers_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "style_changeovers_to_style_id_fkey"
            columns: ["to_style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
        ]
      }
      styles: {
        Row: {
          buyer: string
          created_at: string
          id: string
          operation_count: number
          product_category: Database["public"]["Enums"]["product_category"]
          sam: number
          smv: number
          style_no: string
          target_efficiency: number
          updated_at: string
        }
        Insert: {
          buyer: string
          created_at?: string
          id?: string
          operation_count?: number
          product_category?: Database["public"]["Enums"]["product_category"]
          sam: number
          smv: number
          style_no: string
          target_efficiency?: number
          updated_at?: string
        }
        Update: {
          buyer?: string
          created_at?: string
          id?: string
          operation_count?: number
          product_category?: Database["public"]["Enums"]["product_category"]
          sam?: number
          smv?: number
          style_no?: string
          target_efficiency?: number
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "line_chief" | "operator"
      downtime_reason_type:
        | "machine_breakdown"
        | "no_feeding"
        | "power_failure"
        | "style_changeover"
        | "quality_issue"
        | "material_shortage"
        | "absenteeism"
        | "meeting"
        | "maintenance"
        | "other"
      operator_grade: "A" | "B" | "C" | "D"
      product_category:
        | "basic_5pkt_pants_shorts"
        | "fashion_denim_bottoms"
        | "skirts_skorts"
        | "carpenter"
        | "cargo"
        | "long_short_sleeve_shirts"
        | "sleeveless"
        | "vest"
        | "jackets_coats"
        | "dresses"
        | "others"
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
      app_role: ["admin", "manager", "line_chief", "operator"],
      downtime_reason_type: [
        "machine_breakdown",
        "no_feeding",
        "power_failure",
        "style_changeover",
        "quality_issue",
        "material_shortage",
        "absenteeism",
        "meeting",
        "maintenance",
        "other",
      ],
      operator_grade: ["A", "B", "C", "D"],
      product_category: [
        "basic_5pkt_pants_shorts",
        "fashion_denim_bottoms",
        "skirts_skorts",
        "carpenter",
        "cargo",
        "long_short_sleeve_shirts",
        "sleeveless",
        "vest",
        "jackets_coats",
        "dresses",
        "others",
      ],
    },
  },
} as const
