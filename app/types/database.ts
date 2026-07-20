// Typed database definitions for the Supabase client.
//
// Shape mirrors `supabase gen types typescript` output for
// supabase/migrations/20260719000000_project_workspace.sql. Regenerate against
// the live project once credentials are configured (see
// specs/001-project-workspace/quickstart.md) — the generated file replaces
// this one wholesale.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      corpora: {
        Row: {
          id: string
          uid: string
          name: string
          description: string | null
          version: string
          language: string | null
          language_code: string | null
          type: string | null
          category: string | null
          hf_path: string | null
          available: boolean
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          uid: string
          name: string
          description?: string | null
          version?: string
          language?: string | null
          language_code?: string | null
          type?: string | null
          category?: string | null
          hf_path?: string | null
          available?: boolean
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          uid?: string
          name?: string
          description?: string | null
          version?: string
          language?: string | null
          language_code?: string | null
          type?: string | null
          category?: string | null
          hf_path?: string | null
          available?: boolean
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_corpora: {
        Row: {
          project_id: string
          corpus_id: string
          linked_at: string
        }
        Insert: {
          project_id: string
          corpus_id: string
          linked_at?: string
        }
        Update: {
          project_id?: string
          corpus_id?: string
          linked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_corpora_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_corpora_corpus_id_fkey"
            columns: ["corpus_id"]
            isOneToOne: false
            referencedRelation: "corpora"
            referencedColumns: ["id"]
          },
        ]
      }
      project_references: {
        Row: {
          id: string
          project_id: string
          title: string
          authors: string | null
          year: number | null
          publication: string | null
          url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          authors?: string | null
          year?: number | null
          publication?: string | null
          url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          authors?: string | null
          year?: number | null
          publication?: string | null
          url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
