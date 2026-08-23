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
      boletins_urna: {
        Row: {
          assinatura_digital: string | null
          criado_em: string | null
          data_leitura: string | null
          fiscal_id: string | null
          foto: string | null
          id: string
          municipio: string
          pleito: string | null
          secao: string
          total_votos: number
          uf: string
          votos_candidato: number
          zona: string
        }
        Insert: {
          assinatura_digital?: string | null
          criado_em?: string | null
          data_leitura?: string | null
          fiscal_id?: string | null
          foto?: string | null
          id?: string
          municipio: string
          pleito?: string | null
          secao: string
          total_votos: number
          uf: string
          votos_candidato: number
          zona: string
        }
        Update: {
          assinatura_digital?: string | null
          criado_em?: string | null
          data_leitura?: string | null
          fiscal_id?: string | null
          foto?: string | null
          id?: string
          municipio?: string
          pleito?: string | null
          secao?: string
          total_votos?: number
          uf?: string
          votos_candidato?: number
          zona?: string
        }
        Relationships: []
      }
      campaign_members: {
        Row: {
          campaign_id: string
          created_at: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          admin_user_id: string
          ano_eleicao: number
          cargo: string | null
          created_at: string
          id: string
          meta_eleicao: number | null
          meta_expectativa: number | null
          nome_campanha: string
          nome_candidato: string | null
          nome_urna: string | null
          nr_candidato: string
          partido: string | null
          sq_candidato: string | null
          uf: string
        }
        Insert: {
          admin_user_id: string
          ano_eleicao: number
          cargo?: string | null
          created_at?: string
          id?: string
          meta_eleicao?: number | null
          meta_expectativa?: number | null
          nome_campanha: string
          nome_candidato?: string | null
          nome_urna?: string | null
          nr_candidato: string
          partido?: string | null
          sq_candidato?: string | null
          uf: string
        }
        Update: {
          admin_user_id?: string
          ano_eleicao?: number
          cargo?: string | null
          created_at?: string
          id?: string
          meta_eleicao?: number | null
          meta_expectativa?: number | null
          nome_campanha?: string
          nome_candidato?: string | null
          nome_urna?: string | null
          nr_candidato?: string
          partido?: string | null
          sq_candidato?: string | null
          uf?: string
        }
        Relationships: []
      }
      cidade_metas: {
        Row: {
          campaign_id: string | null
          criado_em: string | null
          id: string
          meta_campanha: number | null
          municipio: string
          realidade_votos: number | null
          uf: string
        }
        Insert: {
          campaign_id?: string | null
          criado_em?: string | null
          id?: string
          meta_campanha?: number | null
          municipio: string
          realidade_votos?: number | null
          uf: string
        }
        Update: {
          campaign_id?: string | null
          criado_em?: string | null
          id?: string
          meta_campanha?: number | null
          municipio?: string
          realidade_votos?: number | null
          uf?: string
        }
        Relationships: []
      }
      comites: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          cep: string | null
          complemento: string | null
          coordenador: string
          criado_em: string | null
          endereco: string | null
          foto: string | null
          id: string
          meta_votos: number | null
          meta_votos_conquistados: number | null
          municipio: string
          nome: string
          numero: string | null
          observacoes: string | null
          ponto_referencia: string | null
          status: Database["public"]["Enums"]["comite_status"] | null
          uf: string
          whatsapp_coordenador: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          coordenador: string
          criado_em?: string | null
          endereco?: string | null
          foto?: string | null
          id?: string
          meta_votos?: number | null
          meta_votos_conquistados?: number | null
          municipio: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          ponto_referencia?: string | null
          status?: Database["public"]["Enums"]["comite_status"] | null
          uf: string
          whatsapp_coordenador?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          coordenador?: string
          criado_em?: string | null
          endereco?: string | null
          foto?: string | null
          id?: string
          meta_votos?: number | null
          meta_votos_conquistados?: number | null
          municipio?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          ponto_referencia?: string | null
          status?: Database["public"]["Enums"]["comite_status"] | null
          uf?: string
          whatsapp_coordenador?: string | null
        }
        Relationships: []
      }
      config_campanha: {
        Row: {
          atualizado_em: string | null
          candidato_nome: string
          candidato_urna: string | null
          cargo: string | null
          configurada: boolean | null
          criado_em: string | null
          id: string
          meta_eleicao: number | null
          meta_expectativa: number | null
          numero: string
          partido_coligacao: string | null
          total_secoes: number | null
          uf: string
        }
        Insert: {
          atualizado_em?: string | null
          candidato_nome: string
          candidato_urna?: string | null
          cargo?: string | null
          configurada?: boolean | null
          criado_em?: string | null
          id?: string
          meta_eleicao?: number | null
          meta_expectativa?: number | null
          numero: string
          partido_coligacao?: string | null
          total_secoes?: number | null
          uf: string
        }
        Update: {
          atualizado_em?: string | null
          candidato_nome?: string
          candidato_urna?: string | null
          cargo?: string | null
          configurada?: boolean | null
          criado_em?: string | null
          id?: string
          meta_eleicao?: number | null
          meta_expectativa?: number | null
          numero?: string
          partido_coligacao?: string | null
          total_secoes?: number | null
          uf?: string
        }
        Relationships: []
      }
      historico_estoque: {
        Row: {
          criado_em: string | null
          diferenca: number
          id: string
          material_id: string
          observacao: string | null
          quantidade_anterior: number
          quantidade_nova: number
          tipo: string
        }
        Insert: {
          criado_em?: string | null
          diferenca: number
          id?: string
          material_id: string
          observacao?: string | null
          quantidade_anterior: number
          quantidade_nova: number
          tipo: string
        }
        Update: {
          criado_em?: string | null
          diferenca?: number
          id?: string
          material_id?: string
          observacao?: string | null
          quantidade_anterior?: number
          quantidade_nova?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_estoque_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          arquivado: boolean | null
          criado_em: string | null
          descricao: string | null
          id: string
          itens: Json | null
          nome: string
        }
        Insert: {
          arquivado?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          itens?: Json | null
          nome: string
        }
        Update: {
          arquivado?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          itens?: Json | null
          nome?: string
        }
        Relationships: []
      }
      materiais: {
        Row: {
          arquivado: boolean | null
          categoria: string
          criado_em: string | null
          descricao: string | null
          estoque: number | null
          estoque_minimo: number | null
          foto: string | null
          id: string
          nome: string
          unidade: string | null
        }
        Insert: {
          arquivado?: boolean | null
          categoria: string
          criado_em?: string | null
          descricao?: string | null
          estoque?: number | null
          estoque_minimo?: number | null
          foto?: string | null
          id?: string
          nome: string
          unidade?: string | null
        }
        Update: {
          arquivado?: boolean | null
          categoria?: string
          criado_em?: string | null
          descricao?: string | null
          estoque?: number | null
          estoque_minimo?: number | null
          foto?: string | null
          id?: string
          nome?: string
          unidade?: string | null
        }
        Relationships: []
      }
      pessoas: {
        Row: {
          bairro: string | null
          cep: string | null
          comite_id: string | null
          complemento: string | null
          cpf: string | null
          criado_em: string | null
          endereco: string | null
          funcao: string | null
          id: string
          meta_votos: number | null
          meta_votos_conquistados: number | null
          municipio: string
          nome: string
          numero: string | null
          status: string | null
          telefone: string
          tipo: Database["public"]["Enums"]["tipo_pessoa"] | null
          uf: string
          zona: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          comite_id?: string | null
          complemento?: string | null
          cpf?: string | null
          criado_em?: string | null
          endereco?: string | null
          funcao?: string | null
          id?: string
          meta_votos?: number | null
          meta_votos_conquistados?: number | null
          municipio: string
          nome: string
          numero?: string | null
          status?: string | null
          telefone: string
          tipo?: Database["public"]["Enums"]["tipo_pessoa"] | null
          uf: string
          zona?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          comite_id?: string | null
          complemento?: string | null
          cpf?: string | null
          criado_em?: string | null
          endereco?: string | null
          funcao?: string | null
          id?: string
          meta_votos?: number | null
          meta_votos_conquistados?: number | null
          municipio?: string
          nome?: string
          numero?: string | null
          status?: string | null
          telefone?: string
          tipo?: Database["public"]["Enums"]["tipo_pessoa"] | null
          uf?: string
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoas_comite_id_fkey"
            columns: ["comite_id"]
            isOneToOne: false
            referencedRelation: "comites"
            referencedColumns: ["id"]
          },
        ]
      }
      saidas: {
        Row: {
          comite_id: string | null
          criado_em: string | null
          id: string
          itens: Json | null
          kits: Json | null
          pessoa_id: string | null
        }
        Insert: {
          comite_id?: string | null
          criado_em?: string | null
          id?: string
          itens?: Json | null
          kits?: Json | null
          pessoa_id?: string | null
        }
        Update: {
          comite_id?: string | null
          criado_em?: string | null
          id?: string
          itens?: Json | null
          kits?: Json | null
          pessoa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saidas_comite_id_fkey"
            columns: ["comite_id"]
            isOneToOne: false
            referencedRelation: "comites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          comite_id: string | null
          criado_em: string | null
          endereco_entrega: string | null
          id: string
          itens: Json | null
          lideranca_id: string | null
          municipio: string | null
          nome: string
          status: Database["public"]["Enums"]["solicitacao_status"] | null
          tipo_logistica: Database["public"]["Enums"]["tipo_logistica"] | null
        }
        Insert: {
          comite_id?: string | null
          criado_em?: string | null
          endereco_entrega?: string | null
          id?: string
          itens?: Json | null
          lideranca_id?: string | null
          municipio?: string | null
          nome: string
          status?: Database["public"]["Enums"]["solicitacao_status"] | null
          tipo_logistica?: Database["public"]["Enums"]["tipo_logistica"] | null
        }
        Update: {
          comite_id?: string | null
          criado_em?: string | null
          endereco_entrega?: string | null
          id?: string
          itens?: Json | null
          lideranca_id?: string | null
          municipio?: string | null
          nome?: string
          status?: Database["public"]["Enums"]["solicitacao_status"] | null
          tipo_logistica?: Database["public"]["Enums"]["tipo_logistica"] | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_comite_id_fkey"
            columns: ["comite_id"]
            isOneToOne: false
            referencedRelation: "comites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_lideranca_id_fkey"
            columns: ["lideranca_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      comite_status: "ativo" | "pendente_validacao"
      solicitacao_status:
        | "pendente"
        | "separando"
        | "pronto"
        | "entregue"
        | "cancelado"
      tipo_logistica: "retirada" | "entrega"
      tipo_pessoa: "responsavel" | "apoiador"
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
      comite_status: ["ativo", "pendente_validacao"],
      solicitacao_status: [
        "pendente",
        "separando",
        "pronto",
        "entregue",
        "cancelado",
      ],
      tipo_logistica: ["retirada", "entrega"],
      tipo_pessoa: ["responsavel", "apoiador"],
    },
  },
} as const
