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
          status: string
          type: string | null
          language: string | null
          category: string | null
          organization_id: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id?: string | null
          status?: string
          type?: string | null
          language?: string | null
          category?: string | null
          organization_id?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string | null
          status?: string
          type?: string | null
          language?: string | null
          category?: string | null
          organization_id?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      user_directory: {
        Row: {
          id: string
          name: string | null
          username: string
          email: string
          phone: string | null
          website: string | null
          system_path: string | null
          operating_system: string | null
          address_street: string | null
          address_suite: string | null
          address_city: string | null
          address_zipcode: string | null
          address_country: string | null
          organization_id: string | null
          auth_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          name?: string | null
          username: string
          email: string
          phone?: string | null
          website?: string | null
          system_path?: string | null
          operating_system?: string | null
          address_street?: string | null
          address_suite?: string | null
          address_city?: string | null
          address_zipcode?: string | null
          address_country?: string | null
          organization_id?: string | null
          auth_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          username?: string
          email?: string
          phone?: string | null
          website?: string | null
          system_path?: string | null
          operating_system?: string | null
          address_street?: string | null
          address_suite?: string | null
          address_city?: string | null
          address_zipcode?: string | null
          address_country?: string | null
          organization_id?: string | null
          auth_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_directory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          id: string
          name: string
          website: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          website?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          website?: string | null
          created_at?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          id: string
          title: string
          url: string | null
          domain_content: boolean
          domain_data: boolean
          domain_software: boolean
          family: string | null
          maintainer: string | null
          is_generic: boolean | null
          license_text: string | null
          status: string
        }
        Insert: {
          id: string
          title: string
          url?: string | null
          domain_content?: boolean
          domain_data?: boolean
          domain_software?: boolean
          family?: string | null
          maintainer?: string | null
          is_generic?: boolean | null
          license_text?: string | null
          status: string
        }
        Update: {
          id?: string
          title?: string
          url?: string | null
          domain_content?: boolean
          domain_data?: boolean
          domain_software?: boolean
          family?: string | null
          maintainer?: string | null
          is_generic?: boolean | null
          license_text?: string | null
          status?: string
        }
        Relationships: []
      }
      project_licenses: {
        Row: {
          project_id: string
          license_id: string
          agreed_at: string
          agreed_by_user_id: string
        }
        Insert: {
          project_id: string
          license_id: string
          agreed_at?: string
          agreed_by_user_id: string
        }
        Update: {
          project_id?: string
          license_id?: string
          agreed_at?: string
          agreed_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_licenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_licenses_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_licenses_agreed_by_user_id_fkey"
            columns: ["agreed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
        ]
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
