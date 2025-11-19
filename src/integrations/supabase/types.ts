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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      game_hubs: {
        Row: {
          banner_url: string | null
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          member_count: number | null
          name: string
          slug: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          member_count?: number | null
          name: string
          slug: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          member_count?: number | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      hub_members: {
        Row: {
          hub_id: string | null
          id: string
          joined_at: string | null
          user_id: string | null
        }
        Insert: {
          hub_id?: string | null
          id?: string
          joined_at?: string | null
          user_id?: string | null
        }
        Update: {
          hub_id?: string | null
          id?: string
          joined_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_members_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "game_hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          hub_id: string | null
          id: string
          image_url: string | null
          likes_count: number | null
          user_id: string | null
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          hub_id?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          user_id?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          hub_id?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_posts_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "game_hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_games: {
        Row: {
          condition: Database["public"]["Enums"]["game_condition"]
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          includes_box: boolean | null
          includes_manual: boolean | null
          is_available: boolean | null
          is_sealed: boolean | null
          location: string | null
          platform: Database["public"]["Enums"]["game_platform"]
          price: number
          seller_id: string | null
          shipping_method: Database["public"]["Enums"]["shipping_method"] | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          condition: Database["public"]["Enums"]["game_condition"]
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          includes_box?: boolean | null
          includes_manual?: boolean | null
          is_available?: boolean | null
          is_sealed?: boolean | null
          location?: string | null
          platform: Database["public"]["Enums"]["game_platform"]
          price: number
          seller_id?: string | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          condition?: Database["public"]["Enums"]["game_condition"]
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          includes_box?: boolean | null
          includes_manual?: boolean | null
          is_available?: boolean | null
          is_sealed?: boolean | null
          location?: string | null
          platform?: Database["public"]["Enums"]["game_platform"]
          price?: number
          seller_id?: string | null
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "physical_games_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          total_earnings: number | null
          total_sales: number | null
          trader_level: number | null
          trader_xp: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          total_earnings?: number | null
          total_sales?: number | null
          trader_level?: number | null
          trader_xp?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          total_earnings?: number | null
          total_sales?: number | null
          trader_level?: number | null
          trader_xp?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      user_game_libraries: {
        Row: {
          added_at: string | null
          for_sale: boolean | null
          for_trade: boolean | null
          game_title: string
          id: string
          platform: Database["public"]["Enums"]["game_platform"]
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          for_sale?: boolean | null
          for_trade?: boolean | null
          game_title: string
          id?: string
          platform: Database["public"]["Enums"]["game_platform"]
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          for_sale?: boolean | null
          for_trade?: boolean | null
          game_title?: string
          id?: string
          platform?: Database["public"]["Enums"]["game_platform"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_game_libraries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_parties: {
        Row: {
          created_at: string
          current_video_time: number | null
          description: string | null
          host_id: string
          hub_id: string | null
          id: string
          is_playing: boolean | null
          scheduled_time: string | null
          status: string
          title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          current_video_time?: number | null
          description?: string | null
          host_id: string
          hub_id?: string | null
          id?: string
          is_playing?: boolean | null
          scheduled_time?: string | null
          status?: string
          title: string
          video_url: string
        }
        Update: {
          created_at?: string
          current_video_time?: number | null
          description?: string | null
          host_id?: string
          hub_id?: string | null
          id?: string
          is_playing?: boolean | null
          scheduled_time?: string | null
          status?: string
          title?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_parties_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_parties_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "game_hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_events: {
        Row: {
          created_at: string
          created_by: string
          event_type: string
          id: string
          party_id: string
          video_time: number
        }
        Insert: {
          created_at?: string
          created_by: string
          event_type: string
          id?: string
          party_id: string
          video_time: number
        }
        Update: {
          created_at?: string
          created_by?: string
          event_type?: string
          id?: string
          party_id?: string
          video_time?: number
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_party_events_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "watch_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          party_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          party_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_messages_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "watch_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_party_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_participants: {
        Row: {
          id: string
          joined_at: string
          party_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          party_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_participants_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "watch_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_party_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      game_condition: "mint" | "excellent" | "good" | "fair" | "poor"
      game_platform:
        | "ps5"
        | "ps4"
        | "xbox_series"
        | "xbox_one"
        | "switch"
        | "pc"
        | "other"
      shipping_method: "local_pickup" | "courier" | "both"
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
      game_condition: ["mint", "excellent", "good", "fair", "poor"],
      game_platform: [
        "ps5",
        "ps4",
        "xbox_series",
        "xbox_one",
        "switch",
        "pc",
        "other",
      ],
      shipping_method: ["local_pickup", "courier", "both"],
    },
  },
} as const
