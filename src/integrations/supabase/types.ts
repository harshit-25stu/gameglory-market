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
      digital_items: {
        Row: {
          created_at: string
          description: string | null
          game_title: string | null
          id: string
          is_available: boolean | null
          item_type: string
          key_code: string | null
          platform: Database["public"]["Enums"]["game_platform"]
          price: number
          seller_id: string
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          game_title?: string | null
          id?: string
          is_available?: boolean | null
          item_type: string
          key_code?: string | null
          platform: Database["public"]["Enums"]["game_platform"]
          price: number
          seller_id: string
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          game_title?: string | null
          id?: string
          is_available?: boolean | null
          item_type?: string
          key_code?: string | null
          platform?: Database["public"]["Enums"]["game_platform"]
          price?: number
          seller_id?: string
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      esports_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          event_type: string
          game_title: string
          hub_id: string | null
          id: string
          participant_count: number | null
          prize_pool: string | null
          start_time: string
          status: string
          stream_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          game_title: string
          hub_id?: string | null
          id?: string
          participant_count?: number | null
          prize_pool?: string | null
          start_time: string
          status?: string
          stream_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          game_title?: string
          hub_id?: string | null
          id?: string
          participant_count?: number | null
          prize_pool?: string | null
          start_time?: string
          status?: string
          stream_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "esports_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esports_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esports_events_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "game_hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      esports_matches: {
        Row: {
          created_at: string
          event_id: string
          id: string
          match_number: number
          round_number: number
          scheduled_time: string | null
          status: string
          team_a_name: string
          team_a_score: number | null
          team_b_name: string
          team_b_score: number | null
          winner: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          match_number?: number
          round_number?: number
          scheduled_time?: string | null
          status?: string
          team_a_name: string
          team_a_score?: number | null
          team_b_name: string
          team_b_score?: number | null
          winner?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          match_number?: number
          round_number?: number
          scheduled_time?: string | null
          status?: string
          team_a_name?: string
          team_a_score?: number | null
          team_b_name?: string
          team_b_score?: number | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esports_matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "esports_events"
            referencedColumns: ["id"]
          },
        ]
      }
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
      game_skins: {
        Row: {
          condition: string
          created_at: string
          description: string | null
          game: string
          id: string
          image_url: string | null
          is_available: boolean | null
          price: number
          rarity: string
          seller_id: string
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          condition?: string
          created_at?: string
          description?: string | null
          game: string
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          price: number
          rarity?: string
          seller_id: string
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          condition?: string
          created_at?: string
          description?: string | null
          game?: string
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          price?: number
          rarity?: string
          seller_id?: string
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: []
      }
      hangout_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hangout_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hangout_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hangout_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hangout_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hangout_participants: {
        Row: {
          id: string
          is_muted: boolean | null
          is_speaking: boolean | null
          joined_at: string
          last_seen: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_muted?: boolean | null
          is_speaking?: boolean | null
          joined_at?: string
          last_seen?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_muted?: boolean | null
          is_speaking?: boolean | null
          joined_at?: string
          last_seen?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hangout_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hangout_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hangout_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hangout_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hangout_rooms: {
        Row: {
          created_at: string
          description: string | null
          game_title: string | null
          host_id: string
          hub_id: string | null
          id: string
          max_participants: number | null
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          game_title?: string | null
          host_id: string
          hub_id?: string | null
          id?: string
          max_participants?: number | null
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          game_title?: string | null
          host_id?: string
          hub_id?: string | null
          id?: string
          max_participants?: number | null
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hangout_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hangout_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hangout_rooms_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "game_hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_members: {
        Row: {
          hub_id: string | null
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          hub_id?: string | null
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          hub_id?: string | null
          id?: string
          joined_at?: string | null
          user_id?: string
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
          {
            foreignKeyName: "hub_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          hub_id?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          hub_id?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number | null
          user_id?: string
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
          {
            foreignKeyName: "hub_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          host_id: string
          hub_id: string | null
          id: string
          is_live: boolean | null
          started_at: string
          stream_platform: string
          stream_url: string
          title: string
          viewer_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id: string
          hub_id?: string | null
          id?: string
          is_live?: boolean | null
          started_at?: string
          stream_platform?: string
          stream_url: string
          title: string
          viewer_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id?: string
          hub_id?: string | null
          id?: string
          is_live?: boolean | null
          started_at?: string
          stream_platform?: string
          stream_url?: string
          title?: string
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "game_hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          carrier: string | null
          created_at: string
          delivered_at: string | null
          delivery_notes: string | null
          id: string
          item_id: string
          item_type: string
          seller_id: string
          shipped_at: string | null
          shipping_address: string | null
          status: string
          total_price: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_notes?: string | null
          id?: string
          item_id: string
          item_type: string
          seller_id: string
          shipped_at?: string | null
          shipping_address?: string | null
          status?: string
          total_price: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_notes?: string | null
          id?: string
          item_id?: string
          item_type?: string
          seller_id?: string
          shipped_at?: string | null
          shipping_address?: string | null
          status?: string
          total_price?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          seller_id: string
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
          seller_id: string
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
          seller_id?: string
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
          {
            foreignKeyName: "physical_games_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "stream_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_entries: {
        Row: {
          created_at: string
          id: string
          points_wagered: number
          prediction_id: string
          selected_option: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_wagered?: number
          prediction_id: string
          selected_option: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_wagered?: number
          prediction_id?: string
          selected_option?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_entries_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "stream_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediction_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          wallet_balance: number | null
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
          wallet_balance?: number | null
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
          wallet_balance?: number | null
        }
        Relationships: []
      }
      seller_ratings: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          order_id: string | null
          rating: number
          review: string | null
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          rating: number
          review?: string | null
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          rating?: number
          review?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_polls: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          options: Json
          question: string
          stream_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json
          question: string
          stream_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json
          question?: string
          stream_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_polls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "esports_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_polls_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_predictions: {
        Row: {
          created_at: string
          created_by: string
          event_id: string | null
          id: string
          is_active: boolean | null
          match_id: string | null
          option_a: string
          option_b: string
          stream_id: string | null
          title: string
          winning_option: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          match_id?: string | null
          option_a: string
          option_b: string
          stream_id?: string | null
          title: string
          winning_option?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          match_id?: string | null
          option_a?: string
          option_b?: string
          stream_id?: string | null
          title?: string
          winning_option?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_predictions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_predictions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_predictions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "esports_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "esports_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_predictions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_reactions: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          reaction_type: string
          stream_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          reaction_type: string
          stream_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          reaction_type?: string
          stream_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_reactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "esports_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_reactions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_ins: {
        Row: {
          ai_estimated_price: number | null
          ai_price_reasoning: string | null
          condition: Database["public"]["Enums"]["game_condition"]
          created_at: string
          description: string | null
          final_price: number | null
          game_title: string
          id: string
          images: string[] | null
          includes_box: boolean | null
          includes_manual: boolean | null
          platform: Database["public"]["Enums"]["game_platform"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_estimated_price?: number | null
          ai_price_reasoning?: string | null
          condition: Database["public"]["Enums"]["game_condition"]
          created_at?: string
          description?: string | null
          final_price?: number | null
          game_title: string
          id?: string
          images?: string[] | null
          includes_box?: boolean | null
          includes_manual?: boolean | null
          platform: Database["public"]["Enums"]["game_platform"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_estimated_price?: number | null
          ai_price_reasoning?: string | null
          condition?: Database["public"]["Enums"]["game_condition"]
          created_at?: string
          description?: string | null
          final_price?: number | null
          game_title?: string
          id?: string
          images?: string[] | null
          includes_box?: boolean | null
          includes_manual?: boolean | null
          platform?: Database["public"]["Enums"]["game_platform"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_game_libraries: {
        Row: {
          added_at: string | null
          for_sale: boolean | null
          for_trade: boolean | null
          game_title: string
          id: string
          platform: Database["public"]["Enums"]["game_platform"]
          user_id: string
        }
        Insert: {
          added_at?: string | null
          for_sale?: boolean | null
          for_trade?: boolean | null
          game_title: string
          id?: string
          platform: Database["public"]["Enums"]["game_platform"]
          user_id: string
        }
        Update: {
          added_at?: string | null
          for_sale?: boolean | null
          for_trade?: boolean | null
          game_title?: string
          id?: string
          platform?: Database["public"]["Enums"]["game_platform"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_game_libraries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_game_libraries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          acquired_at: string
          acquisition_type: string
          id: string
          skin_id: string | null
          user_id: string
        }
        Insert: {
          acquired_at?: string
          acquisition_type?: string
          id?: string
          skin_id?: string | null
          user_id: string
        }
        Update: {
          acquired_at?: string
          acquisition_type?: string
          id?: string
          skin_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_skin_id_fkey"
            columns: ["skin_id"]
            isOneToOne: false
            referencedRelation: "game_skins"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
            foreignKeyName: "watch_parties_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "watch_party_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "watch_party_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "watch_party_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      digital_items_public: {
        Row: {
          created_at: string | null
          description: string | null
          game_title: string | null
          id: string | null
          is_available: boolean | null
          item_type: string | null
          platform: Database["public"]["Enums"]["game_platform"] | null
          price: number | null
          seller_id: string | null
          title: string | null
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          game_title?: string | null
          id?: string | null
          is_available?: boolean | null
          item_type?: string | null
          platform?: Database["public"]["Enums"]["game_platform"] | null
          price?: number | null
          seller_id?: string | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          game_title?: string | null
          id?: string | null
          is_available?: boolean | null
          item_type?: string | null
          platform?: Database["public"]["Enums"]["game_platform"] | null
          price?: number | null
          seller_id?: string | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          trader_level: number | null
          trader_xp: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          trader_level?: number | null
          trader_xp?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          trader_level?: number | null
          trader_xp?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refund_escrow_funds: {
        Args: { p_escrow_id: string; p_refunded_by?: string }
        Returns: boolean
      }
      release_escrow_funds: {
        Args: { p_escrow_id: string; p_released_by?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
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
