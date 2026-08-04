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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      announcement_reads: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          leido_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          leido_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          leido_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          area_id: string | null
          confidencialidad: Database["public"]["Enums"]["confidencialidad"]
          created_at: string
          created_by: string | null
          cuerpo: string
          id: string
          prioridad: Database["public"]["Enums"]["prioridad"]
          requiere_lectura: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          confidencialidad?: Database["public"]["Enums"]["confidencialidad"]
          created_at?: string
          created_by?: string | null
          cuerpo: string
          id?: string
          prioridad?: Database["public"]["Enums"]["prioridad"]
          requiere_lectura?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          confidencialidad?: Database["public"]["Enums"]["confidencialidad"]
          created_at?: string
          created_by?: string | null
          cuerpo?: string
          id?: string
          prioridad?: Database["public"]["Enums"]["prioridad"]
          requiere_lectura?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          checklist_id: string
          completado: boolean
          completado_at: string | null
          completado_por: string | null
          created_at: string
          descripcion: string
          id: string
          orden: number
          updated_at: string
        }
        Insert: {
          checklist_id: string
          completado?: boolean
          completado_at?: string | null
          completado_por?: string | null
          created_at?: string
          descripcion: string
          id?: string
          orden?: number
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          completado?: boolean
          completado_at?: string | null
          completado_por?: string | null
          created_at?: string
          descripcion?: string
          id?: string
          orden?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          area_id: string | null
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          nombre: string
          responsable: string | null
          turno: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          nombre: string
          responsable?: string | null
          turno?: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          nombre?: string
          responsable?: string | null
          turno?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          area_id: string | null
          asignado_a: string | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_incidencia"]
          id: string
          primera_respuesta_at: string | null
          prioridad: Database["public"]["Enums"]["prioridad"]
          resuelta_at: string | null
          titulo: string
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          asignado_a?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_incidencia"]
          id?: string
          primera_respuesta_at?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad"]
          resuelta_at?: string | null
          titulo: string
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          asignado_a?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_incidencia"]
          id?: string
          primera_respuesta_at?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad"]
          resuelta_at?: string | null
          titulo?: string
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_requests: {
        Row: {
          aprobado_por: string | null
          area_destino: string | null
          area_solicitante: string | null
          created_at: string
          created_by: string | null
          detalle: string | null
          estado: Database["public"]["Enums"]["estado_pedido"]
          id: string
          prioridad: Database["public"]["Enums"]["prioridad"]
          titulo: string
          updated_at: string
        }
        Insert: {
          aprobado_por?: string | null
          area_destino?: string | null
          area_solicitante?: string | null
          created_at?: string
          created_by?: string | null
          detalle?: string | null
          estado?: Database["public"]["Enums"]["estado_pedido"]
          id?: string
          prioridad?: Database["public"]["Enums"]["prioridad"]
          titulo: string
          updated_at?: string
        }
        Update: {
          aprobado_por?: string | null
          area_destino?: string | null
          area_solicitante?: string | null
          created_at?: string
          created_by?: string | null
          detalle?: string | null
          estado?: Database["public"]["Enums"]["estado_pedido"]
          id?: string
          prioridad?: Database["public"]["Enums"]["prioridad"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_requests_area_destino_fkey"
            columns: ["area_destino"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_requests_area_solicitante_fkey"
            columns: ["area_solicitante"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          area_id: string | null
          created_at: string
          email: string | null
          id: string
          nombre: string
          puesto: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          area_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          nombre?: string
          puesto?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          area_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          puesto?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_handovers: {
        Row: {
          area_id: string | null
          created_at: string
          created_by: string | null
          entregado_por: string | null
          fecha: string
          firma_entrega: string | null
          firma_recepcion: string | null
          id: string
          incidencias_abiertas: string | null
          notas: string | null
          pendientes: string | null
          recibido_por: string | null
          turno: string
          updated_at: string
          vips: string | null
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          created_by?: string | null
          entregado_por?: string | null
          fecha?: string
          firma_entrega?: string | null
          firma_recepcion?: string | null
          id?: string
          incidencias_abiertas?: string | null
          notas?: string | null
          pendientes?: string | null
          recibido_por?: string | null
          turno?: string
          updated_at?: string
          vips?: string | null
        }
        Update: {
          area_id?: string | null
          created_at?: string
          created_by?: string | null
          entregado_por?: string | null
          fecha?: string
          firma_entrega?: string | null
          firma_recepcion?: string | null
          id?: string
          incidencias_abiertas?: string | null
          notas?: string | null
          pendientes?: string | null
          recibido_por?: string | null
          turno?: string
          updated_at?: string
          vips?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_handovers_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
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
      vip_alerts: {
        Row: {
          alergias: string | null
          areas_involucradas: string[]
          created_at: string
          created_by: string | null
          habitacion: string | null
          huesped: string
          id: string
          llegada: string | null
          preferencias: string | null
          prioridad: Database["public"]["Enums"]["prioridad"]
          restricciones: string | null
          salida: string | null
          updated_at: string
        }
        Insert: {
          alergias?: string | null
          areas_involucradas?: string[]
          created_at?: string
          created_by?: string | null
          habitacion?: string | null
          huesped: string
          id?: string
          llegada?: string | null
          preferencias?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad"]
          restricciones?: string | null
          salida?: string | null
          updated_at?: string
        }
        Update: {
          alergias?: string | null
          areas_involucradas?: string[]
          created_at?: string
          created_by?: string | null
          habitacion?: string | null
          huesped?: string
          id?: string
          llegada?: string | null
          preferencias?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad"]
          restricciones?: string | null
          salida?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      area_usuario: { Args: { _user_id: string }; Returns: string }
      es_gerencia: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "supervisor" | "colaborador"
      confidencialidad: "interno" | "restringido"
      estado_incidencia:
        | "abierta"
        | "en_proceso"
        | "escalada"
        | "resuelta"
        | "cerrada"
      estado_pedido:
        | "solicitado"
        | "aprobado"
        | "rechazado"
        | "en_proceso"
        | "entregado"
        | "cerrado"
      prioridad: "baja" | "media" | "alta" | "critica"
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
      app_role: ["admin", "gerente", "supervisor", "colaborador"],
      confidencialidad: ["interno", "restringido"],
      estado_incidencia: [
        "abierta",
        "en_proceso",
        "escalada",
        "resuelta",
        "cerrada",
      ],
      estado_pedido: [
        "solicitado",
        "aprobado",
        "rechazado",
        "en_proceso",
        "entregado",
        "cerrado",
      ],
      prioridad: ["baja", "media", "alta", "critica"],
    },
  },
} as const
