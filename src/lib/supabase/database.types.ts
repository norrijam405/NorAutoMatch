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
      customer_secure_documents: {
        Row: {
          id: string; user_id: string; opportunity_id: string | null; kind: string; storage_path: string;
          original_filename: string; mime_type: string; byte_size: number; sha256: string; status: string;
          retention_state: string; delete_after: string | null; reviewed_at: string | null; reviewed_by: string | null;
          raw_deleted_at: string | null; received_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; opportunity_id?: string | null; kind: string; storage_path: string;
          original_filename: string; mime_type: string; byte_size: number; sha256: string; status?: string;
          retention_state?: string; delete_after?: string | null; reviewed_at?: string | null; reviewed_by?: string | null;
          raw_deleted_at?: string | null; received_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_secure_documents"]["Row"]>;
        Relationships: [];
      };
      customer_secure_document_access_events: {
        Row: { id: string; document_id: string; actor_user_id: string; action: string; created_at: string };
        Insert: { id?: string; document_id: string; actor_user_id: string; action: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      video_hub_entries: {
        Row: {
          id: string; title: string; summary: string; canonical_url: string; visibility: string;
          vehicle_vins: string[]; topics: string[]; channels: Json; created_by: string;
          created_at: string; updated_at: string;
        };
        Insert: {
          id: string; title: string; summary?: string; canonical_url: string; visibility: string;
          vehicle_vins?: string[]; topics?: string[]; channels?: Json; created_by: string;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["video_hub_entries"]["Row"]>;
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
    Functions: {
      norautomatch_register_customer_secure_document: {
        Args: {
          p_id: string;
          p_kind: string;
          p_storage_path: string;
          p_original_filename: string;
          p_mime_type: string;
          p_byte_size: number;
          p_sha256: string;
        };
        Returns: string;
      };
      norautomatch_register_customer_secure_document_v2: {
        Args: {
          p_id: string;
          p_kind: string;
          p_storage_path: string;
          p_original_filename: string;
          p_mime_type: string;
          p_byte_size: number;
          p_sha256: string;
          p_retention_days: number;
        };
        Returns: string;
      };
      norautomatch_finalize_customer_secure_document: {
        Args: { p_id: string };
        Returns: undefined;
      };
      norautomatch_abandon_pending_customer_secure_document: {
        Args: { p_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
