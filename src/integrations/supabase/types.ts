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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      checklist_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          implementation_id: string
          is_completed: boolean
          observations: string | null
          order_index: number
          parent_id: string | null
          time_spent_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          implementation_id: string
          is_completed?: boolean
          observations?: string | null
          order_index: number
          parent_id?: string | null
          time_spent_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          implementation_id?: string
          is_completed?: boolean
          observations?: string | null
          order_index?: number
          parent_id?: string | null
          time_spent_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_implementation_id_fkey"
            columns: ["implementation_id"]
            isOneToOne: false
            referencedRelation: "implementations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          cnpj: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          observations: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          observations?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          observations?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          commission_value: number
          created_at: string
          created_by: string | null
          id: string
          implementation_type: Database["public"]["Enums"]["implementation_type"]
          is_active: boolean
          updated_at: string
        }
        Insert: {
          commission_value?: number
          created_at?: string
          created_by?: string | null
          id?: string
          implementation_type: Database["public"]["Enums"]["implementation_type"]
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          commission_value?: number
          created_at?: string
          created_by?: string | null
          id?: string
          implementation_type?: Database["public"]["Enums"]["implementation_type"]
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      commission_types: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      episodes: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string
          episode_date: string
          episode_type: Database["public"]["Enums"]["episode_type"]
          id: string
          implementation_id: string
          module: Database["public"]["Enums"]["module_type"]
          observations: string | null
          start_time: string
          time_spent_minutes: number
          trained_clients: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time: string
          episode_date: string
          episode_type: Database["public"]["Enums"]["episode_type"]
          id?: string
          implementation_id: string
          module: Database["public"]["Enums"]["module_type"]
          observations?: string | null
          start_time: string
          time_spent_minutes: number
          trained_clients?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string
          episode_date?: string
          episode_type?: Database["public"]["Enums"]["episode_type"]
          id?: string
          implementation_id?: string
          module?: Database["public"]["Enums"]["module_type"]
          observations?: string | null
          start_time?: string
          time_spent_minutes?: number
          trained_clients?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_implementation_id_fkey"
            columns: ["implementation_id"]
            isOneToOne: false
            referencedRelation: "implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      implementation_analysts: {
        Row: {
          analyst_id: string
          created_at: string
          id: string
          implementation_id: string
        }
        Insert: {
          analyst_id: string
          created_at?: string
          id?: string
          implementation_id: string
        }
        Update: {
          analyst_id?: string
          created_at?: string
          id?: string
          implementation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_analysts_implementation_id_fkey"
            columns: ["implementation_id"]
            isOneToOne: false
            referencedRelation: "implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      implementation_commissions: {
        Row: {
          commission_name: string
          commission_type_id: string | null
          commission_value: number
          created_at: string
          created_by: string | null
          id: string
          implementation_id: string
        }
        Insert: {
          commission_name: string
          commission_type_id?: string | null
          commission_value: number
          created_at?: string
          created_by?: string | null
          id?: string
          implementation_id: string
        }
        Update: {
          commission_name?: string
          commission_type_id?: string | null
          commission_value?: number
          created_at?: string
          created_by?: string | null
          id?: string
          implementation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_commissions_commission_type_id_fkey"
            columns: ["commission_type_id"]
            isOneToOne: false
            referencedRelation: "commission_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "implementation_commissions_implementation_id_fkey"
            columns: ["implementation_id"]
            isOneToOne: false
            referencedRelation: "implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      implementations: {
        Row: {
          actual_start_date: string | null
          client_id: string
          commission_paid: boolean
          commission_paid_at: string | null
          commission_type_id: string | null
          commission_value: number | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          implementation_type:
            | Database["public"]["Enums"]["implementation_type"]
            | null
          implementer_id: string | null
          negotiated_time_minutes: number | null
          observations: string | null
          start_date: string
          status: Database["public"]["Enums"]["implementation_status"]
          total_time_minutes: number | null
          updated_at: string
        }
        Insert: {
          actual_start_date?: string | null
          client_id: string
          commission_paid?: boolean
          commission_paid_at?: string | null
          commission_type_id?: string | null
          commission_value?: number | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          implementation_type?:
            | Database["public"]["Enums"]["implementation_type"]
            | null
          implementer_id?: string | null
          negotiated_time_minutes?: number | null
          observations?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["implementation_status"]
          total_time_minutes?: number | null
          updated_at?: string
        }
        Update: {
          actual_start_date?: string | null
          client_id?: string
          commission_paid?: boolean
          commission_paid_at?: string | null
          commission_type_id?: string | null
          commission_value?: number | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          implementation_type?:
            | Database["public"]["Enums"]["implementation_type"]
            | null
          implementer_id?: string | null
          negotiated_time_minutes?: number | null
          observations?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["implementation_status"]
          total_time_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "implementations_commission_type_id_fkey"
            columns: ["commission_type_id"]
            isOneToOne: false
            referencedRelation: "commission_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      webhook_logs: {
        Row: {
          created_at: string
          evento: string
          id: string
          payload: Json
          response: string | null
          status: string
        }
        Insert: {
          created_at?: string
          evento: string
          id?: string
          payload: Json
          response?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          evento?: string
          id?: string
          payload?: Json
          response?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_default_checklist: {
        Args: { impl_id: string }
        Returns: undefined
      }
      get_active_commission: {
        Args: { impl_type: Database["public"]["Enums"]["implementation_type"] }
        Returns: number
      }
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
      update_scheduled_implementations: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "implantador"
      episode_type:
        | "treinamento"
        | "parametrizacao"
        | "ajuste_fiscal"
        | "migracao"
      implementation_status:
        | "em_andamento"
        | "pausada"
        | "concluida"
        | "cancelada"
        | "agendada"
      implementation_type: "web" | "manager" | "basic"
      module_type:
        | "vendas"
        | "financeiro"
        | "cadastros"
        | "relatorios"
        | "caixa"
        | "fiscal"
        | "geral"
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
      app_role: ["admin", "implantador"],
      episode_type: [
        "treinamento",
        "parametrizacao",
        "ajuste_fiscal",
        "migracao",
      ],
      implementation_status: [
        "em_andamento",
        "pausada",
        "concluida",
        "cancelada",
        "agendada",
      ],
      implementation_type: ["web", "manager", "basic"],
      module_type: [
        "vendas",
        "financeiro",
        "cadastros",
        "relatorios",
        "caixa",
        "fiscal",
        "geral",
      ],
    },
  },
} as const
