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
      match_events: {
        Row: {
          created_at: string | null
          event_type: string
          filled_position: string | null
          id: string
          increment: number | null
          match_id: string | null
          player_in_id: string | null
          player_out_id: string | null
          score_a: number | null
          score_b: number | null
          team: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          filled_position?: string | null
          id?: string
          increment?: number | null
          match_id?: string | null
          player_in_id?: string | null
          player_out_id?: string | null
          score_a?: number | null
          score_b?: number | null
          team?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          filled_position?: string | null
          id?: string
          increment?: number | null
          match_id?: string | null
          player_in_id?: string | null
          player_out_id?: string | null
          score_a?: number | null
          score_b?: number | null
          team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_in_id_fkey"
            columns: ["player_in_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_out_id_fkey"
            columns: ["player_out_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          completed_at: string | null
          created_at: string
          hoster_id: string
          id: string
          is_completed: boolean
          session_id: string
          team_a_players: string[]
          team_a_positions: Json | null
          team_a_score: number
          team_b_players: string[]
          team_b_positions: Json | null
          team_b_score: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          hoster_id: string
          id?: string
          is_completed?: boolean
          session_id: string
          team_a_players: string[]
          team_a_positions?: Json | null
          team_a_score?: number
          team_b_players: string[]
          team_b_positions?: Json | null
          team_b_score?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          hoster_id?: string
          id?: string
          is_completed?: boolean
          session_id?: string
          team_a_players?: string[]
          team_a_positions?: Json | null
          team_a_score?: number
          team_b_players?: string[]
          team_b_positions?: Json | null
          team_b_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "matches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hoster_access_grants: {
        Row: {
          created_at: string
          expires_at: string | null
          grantee_user_id: string | null
          granted_by: string
          id: string
          invite_email: string | null
          owner_hoster_id: string
          permissions: string[]
          revoked_at: string | null
          scope: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          grantee_user_id?: string | null
          granted_by: string
          id?: string
          invite_email?: string | null
          owner_hoster_id: string
          permissions?: string[]
          revoked_at?: string | null
          scope?: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          grantee_user_id?: string | null
          granted_by?: string
          id?: string
          invite_email?: string | null
          owner_hoster_id?: string
          permissions?: string[]
          revoked_at?: string | null
          scope?: string
          session_id?: string | null
        }
        Relationships: []
      }
      mmr_history: {
        Row: {
          created_at: string | null
          hoster_id: string
          id: string
          match_id: string | null
          mmr_change: number
          new_mmr: number
          old_mmr: number
          player_id: string
          reason: string
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          hoster_id: string
          id?: string
          match_id?: string | null
          mmr_change: number
          new_mmr: number
          old_mmr: number
          player_id: string
          reason?: string
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          hoster_id?: string
          id?: string
          match_id?: string | null
          mmr_change?: number
          new_mmr?: number
          old_mmr?: number
          player_id?: string
          reason?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mmr_history_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mmr_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mmr_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          active_positions:
            | Database["public"]["Enums"]["court_position"][]
            | null
          created_at: string
          games_played_today: number
          hoster_id: string
          id: string
          initial_tier: Database["public"]["Enums"]["mmr_tier"]
          is_present_today: boolean
          is_temporary: boolean
          mmr: number
          name: string
          positions: Database["public"]["Enums"]["court_position"][]
        }
        Insert: {
          active_positions?:
            | Database["public"]["Enums"]["court_position"][]
            | null
          created_at?: string
          games_played_today?: number
          hoster_id: string
          id?: string
          initial_tier?: Database["public"]["Enums"]["mmr_tier"]
          is_present_today?: boolean
          is_temporary?: boolean
          mmr?: number
          name: string
          positions?: Database["public"]["Enums"]["court_position"][]
        }
        Update: {
          active_positions?:
            | Database["public"]["Enums"]["court_position"][]
            | null
          created_at?: string
          games_played_today?: number
          hoster_id?: string
          id?: string
          initial_tier?: Database["public"]["Enums"]["mmr_tier"]
          is_present_today?: boolean
          is_temporary?: boolean
          mmr?: number
          name?: string
          positions?: Database["public"]["Enums"]["court_position"][]
        }
        Relationships: []
      }
      point_attributions: {
        Row: {
          attributed_to: string
          created_at: string | null
          id: string
          match_id: string
          score_a: number
          score_b: number
          scoring_type: string
          session_id: string
          team: string
          voter_token: string
        }
        Insert: {
          attributed_to: string
          created_at?: string | null
          id?: string
          match_id: string
          score_a: number
          score_b: number
          scoring_type?: string
          session_id: string
          team: string
          voter_token: string
        }
        Update: {
          attributed_to?: string
          created_at?: string | null
          id?: string
          match_id?: string
          score_a?: number
          score_b?: number
          scoring_type?: string
          session_id?: string
          team?: string
          voter_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_attributions_attributed_to_fkey"
            columns: ["attributed_to"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_attributions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_attributions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_players: {
        Row: {
          created_at: string
          games_played: number
          is_present: boolean
          player_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          games_played?: number
          is_present?: boolean
          player_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          games_played?: number
          is_present?: boolean
          player_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          hoster_id: string
          id: string
          is_active: boolean
          matchmaking_mode: string | null
          pending_draft: Json | null
          pin: string | null
          summary_data: Json | null
          target_score: number
          tie_breaker_rule: string
          version: number
        }
        Insert: {
          created_at?: string
          hoster_id: string
          id?: string
          is_active?: boolean
          matchmaking_mode?: string | null
          pending_draft?: Json | null
          pin?: string | null
          summary_data?: Json | null
          target_score?: number
          tie_breaker_rule?: string
          version?: number
        }
        Update: {
          created_at?: string
          hoster_id?: string
          id?: string
          is_active?: boolean
          matchmaking_mode?: string | null
          pending_draft?: Json | null
          pin?: string | null
          summary_data?: Json | null
          target_score?: number
          tie_breaker_rule?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_match_score_delta: {
        Args: {
          p_match_id: string
          p_team: string
          p_delta: number
          p_expected_a: number
          p_expected_b: number
        }
        Returns: {
          applied: boolean
          team_a_score: number
          team_b_score: number
        }[]
      }
    }
    Enums: {
      court_position:
        | "Setter"
        | "Outside Hitter"
        | "Middle Blocker"
        | "Libero"
        | "Opposite Hitter"
      mmr_tier: "Beginner" | "Intermediate" | "Advanced"
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
      court_position: [
        "Setter",
        "Outside Hitter",
        "Middle Blocker",
        "Libero",
        "Opposite Hitter",
      ],
      mmr_tier: ["Beginner", "Intermediate", "Advanced"],
    },
  },
} as const
