export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: number;
          title: string;
          short_title?: string | null;
          date: string;
          location: string;
          seats: string;
          seats_left: number;
          status: "open" | "full" | "closed";
          image: string;
          image_alt: string | null;
          warning_message: string | null;
          target_quotas?: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          title: string;
          short_title?: string | null;
          date: string;
          location: string;
          seats: string;
          seats_left?: number;
          status?: "open" | "full" | "closed";
          image: string;
          image_alt?: string | null;
          warning_message?: string | null;
          target_quotas?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          title?: string;
          short_title?: string | null;
          date?: string;
          location?: string;
          seats?: string;
          seats_left?: number;
          status?: "open" | "full" | "closed";
          image?: string;
          image_alt?: string | null;
          warning_message?: string | null;
          target_quotas?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: number;
          ref: string;
          receipt_no: string;
          course_id: number;
          course: string;
          course_title: string;
          name: string;
          id_card: string;
          email: string;
          phone: string;
          affiliation: string;
          position: string;
          status: "pending" | "approved" | "rejected" | "reserve" | "action_required" | string;
          reserve_order: number | null;
          review_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          file_size: number | null;
          ai: Json;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          ref: string;
          receipt_no: string;
          course_id: number;
          course: string;
          course_title: string;
          name: string;
          id_card: string;
          email: string;
          phone: string;
          affiliation?: string;
          position?: string;
          status?: "pending" | "approved" | "rejected" | "reserve" | "action_required" | string;
          reserve_order?: number | null;
          review_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          file_size?: number | null;
          ai?: Json;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          ref?: string;
          receipt_no?: string;
          course_id?: number;
          course?: string;
          course_title?: string;
          name?: string;
          id_card?: string;
          email?: string;
          phone?: string;
          affiliation?: string;
          position?: string;
          status?:
            | "pending"
            | "approved"
            | "rejected"
            | "reserve"
            | "action_required"
            | string;
          reserve_order?: number | null;
          review_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          file_size?: number | null;
          ai?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      application_documents: {
        Row: {
          id: string;
          application_ref: string;
          kind: "photo" | "cover" | "certificate" | "idcard" | "saka" | string;
          name: string;
          size: string;
          file_type: string | null;
          storage_path: string | null;
          data_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_ref: string;
          kind: "photo" | "cover" | "certificate" | "idcard" | "saka" | string;
          name: string;
          size: string;
          file_type?: string | null;
          storage_path?: string | null;
          data_url?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          size?: string;
          file_type?: string | null;
          storage_path?: string | null;
          data_url?: string | null;
        };
        Relationships: [];
      };
      review_notes: {
        Row: {
          id: string;
          application_ref: string;
          author: string;
          kind: "created" | "note" | "approved" | "rejected" | "reserve" | "action_required" | string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_ref: string;
          author: string;
          kind?: "created" | "note" | "approved" | "rejected" | "reserve" | "action_required" | string;
          text: string;
          created_at?: string;
        };
        Update: {
          author?: string;
          kind?: "created" | "note" | "approved" | "rejected" | "reserve";
          text?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
