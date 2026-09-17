export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; display_name?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      app_memberships: {
        Row: { user_id: string; app_id: string; role: string; active: boolean; created_at: string; updated_at: string };
        Insert: { user_id: string; app_id: string; role?: string; active?: boolean; created_at?: string; updated_at?: string };
        Update: { user_id?: string; app_id?: string; role?: string; active?: boolean; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      saved_vehicles: {
        Row: { user_id: string; vin: string; created_at: string };
        Insert: { user_id: string; vin: string; created_at?: string };
        Update: { user_id?: string; vin?: string; created_at?: string };
        Relationships: [];
      };
      match_dna_events: {
        Row: {
          id: number; user_id: string; vin: string; action: string; surface: string;
          year: number | null; make: string | null; model: string | null; trim: string | null;
          condition: string | null; body_type: string | null; drivetrain: string | null;
          price: number | null; mileage: number | null; created_at: string;
        };
        Insert: {
          id?: number; user_id: string; vin: string; action: string; surface?: string;
          year?: number | null; make?: string | null; model?: string | null; trim?: string | null;
          condition?: string | null; body_type?: string | null; drivetrain?: string | null;
          price?: number | null; mileage?: number | null; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["match_dna_events"]["Row"]>;
        Relationships: [];
      };
      market_scout_jobs: {
        Row: { id: number; user_id: string; vin: string; status: string; requested_at: string; updated_at: string; last_error: string | null };
        Insert: { id?: number; user_id: string; vin: string; status?: string; requested_at?: string; updated_at?: string; last_error?: string | null };
        Update: Partial<Database["public"]["Tables"]["market_scout_jobs"]["Row"]>;
        Relationships: [];
      };
      vehicle_scout_dossiers: {
        Row: { vin: string; status: string; research_version: string; summary: string | null; pros: Json; cons: Json; watch_items: Json; sources: Json; researched_at: string | null; updated_at: string };
        Insert: { vin: string; status?: string; research_version?: string; summary?: string | null; pros?: Json; cons?: Json; watch_items?: Json; sources?: Json; researched_at?: string | null; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["vehicle_scout_dossiers"]["Row"]>;
        Relationships: [];
      };
      vehicle_photo_overrides: {
        Row: {
          id: string; vin: string; storage_path: string; sort_order: number; is_cover: boolean;
          active: boolean; uploaded_by: string; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; vin: string; storage_path: string; sort_order?: number; is_cover?: boolean;
          active?: boolean; uploaded_by: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehicle_photo_overrides"]["Row"]>;
        Relationships: [];
      };
      inventory_vehicles: {
        Row: {
          vin: string; workspace_id: string; dealer_id: number; provider: string; source_url: string;
          source_vehicle_id: string | null; stock_number: string | null; source_stock_status: string | null; in_transit: boolean | null;
          year: number | null; make: string | null; model: string | null; trim: string | null; condition: string | null;
          price: number | null; market_price: number | null; discount_amount: number | null; doc_fee: number | null;
          service_handling_fee: number | null; other_dealer_fees: number | null; displayed_dealer_subtotal: number | null; msrp: number | null;
          mileage: number | null; exterior_color: string | null; interior_color: string | null; drivetrain: string | null;
          transmission: string | null; engine: string | null; fuel_type: string | null; city_mpg: number | null; highway_mpg: number | null;
          body_type: string | null; photos: Json; features: Json; incentives: Json; availability_state: string;
          first_seen_at: string; last_seen_at: string; fetched_at: string; source_hash: string; parser_version: string;
          consecutive_healthy_misses: number; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["inventory_vehicles"]["Row"]> & { vin: string; workspace_id: string; dealer_id: number; provider: string; source_url: string; availability_state: string; first_seen_at: string; last_seen_at: string; fetched_at: string; source_hash: string; parser_version: string };
        Update: Partial<Database["public"]["Tables"]["inventory_vehicles"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
