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
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          street: string
          suite: string | null
          updated_at: string | null
          zipcode: string
        }
        Insert: {
          city: string
          country: string
          created_at?: string
          id?: string
          street: string
          suite?: string | null
          updated_at?: string | null
          zipcode: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          street?: string
          suite?: string | null
          updated_at?: string | null
          zipcode?: string
        }
        Relationships: []
      }
      authors: {
        Row: {
          biography: string | null
          created_at: string
          date_of_birth: string | null
          date_of_death: string | null
          first_name: string | null
          id: string
          image_url: string | null
          last_name: string | null
          name: string
          origin: string | null
          period: string | null
          updated_at: string | null
        }
        Insert: {
          biography?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_death?: string | null
          first_name?: string | null
          id?: string
          image_url?: string | null
          last_name?: string | null
          name: string
          origin?: string | null
          period?: string | null
          updated_at?: string | null
        }
        Update: {
          biography?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_death?: string | null
          first_name?: string | null
          id?: string
          image_url?: string | null
          last_name?: string | null
          name?: string
          origin?: string | null
          period?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          category: string
          corpus_id: string | null
          credits: string | null
          description: string | null
          id: string
          language: string | null
          licence: string | null
          period: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          category?: string
          corpus_id?: string | null
          credits?: string | null
          description?: string | null
          id: string
          language?: string | null
          licence?: string | null
          period?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          category?: string
          corpus_id?: string | null
          credits?: string | null
          description?: string | null
          id?: string
          language?: string | null
          licence?: string | null
          period?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_corpus_id_fkey"
            columns: ["corpus_id"]
            isOneToOne: false
            referencedRelation: "corpora"
            referencedColumns: ["id"]
          },
        ]
      }
      corpora: {
        Row: {
          author_id: string | null
          available: boolean
          category: string | null
          created_at: string
          description: string | null
          hf_path: string | null
          id: string
          language: string | null
          language_code: string | null
          name: string
          owner_id: string | null
          type: string | null
          uid: string
          updated_at: string
          version: string
        }
        Insert: {
          author_id?: string | null
          available?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          hf_path?: string | null
          id?: string
          language?: string | null
          language_code?: string | null
          name: string
          owner_id?: string | null
          type?: string | null
          uid: string
          updated_at?: string
          version?: string
        }
        Update: {
          author_id?: string | null
          available?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          hf_path?: string | null
          id?: string
          language?: string | null
          language_code?: string | null
          name?: string
          owner_id?: string | null
          type?: string | null
          uid?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "corpora_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      corpora_log: {
        Row: {
          created_at: string
          id: string
          log_timestamp: string
          message: string
          metadata: Json | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_timestamp: string
          message: string
          metadata?: Json | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          log_timestamp?: string
          message?: string
          metadata?: Json | null
          type?: string
        }
        Relationships: []
      }
      corpus_commits: {
        Row: {
          author_email: string | null
          author_name: string | null
          branch: string | null
          committed_at: string | null
          created_at: string
          document_id: string
          id: string
          message: string
          sha: string
        }
        Insert: {
          author_email?: string | null
          author_name?: string | null
          branch?: string | null
          committed_at?: string | null
          created_at?: string
          document_id: string
          id?: string
          message: string
          sha: string
        }
        Update: {
          author_email?: string | null
          author_name?: string | null
          branch?: string | null
          committed_at?: string | null
          created_at?: string
          document_id?: string
          id?: string
          message?: string
          sha?: string
        }
        Relationships: [
          {
            foreignKeyName: "corpus_commits_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "corpus_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      corpus_documents: {
        Row: {
          converted_at: string | null
          corpus_type: string | null
          created_at: string
          description: string | null
          docs_count: number | null
          filename: string | null
          id: string
          job_id: string | null
          language: string | null
          licence: string | null
          name: string
          nodes: number | null
          path: string
          size_bytes: number | null
          source: string
          source_format: string | null
          status: string | null
          toc: Json | null
          uploaded_at: string
          words: number | null
        }
        Insert: {
          converted_at?: string | null
          corpus_type?: string | null
          created_at?: string
          description?: string | null
          docs_count?: number | null
          filename?: string | null
          id?: string
          job_id?: string | null
          language?: string | null
          licence?: string | null
          name: string
          nodes?: number | null
          path: string
          size_bytes?: number | null
          source: string
          source_format?: string | null
          status?: string | null
          toc?: Json | null
          uploaded_at?: string
          words?: number | null
        }
        Update: {
          converted_at?: string | null
          corpus_type?: string | null
          created_at?: string
          description?: string | null
          docs_count?: number | null
          filename?: string | null
          id?: string
          job_id?: string | null
          language?: string | null
          licence?: string | null
          name?: string
          nodes?: number | null
          path?: string
          size_bytes?: number | null
          source?: string
          source_format?: string | null
          status?: string | null
          toc?: Json | null
          uploaded_at?: string
          words?: number | null
        }
        Relationships: []
      }
      devices: {
        Row: {
          created_at: string
          has_data: boolean
          id: string
          is_app_installed: boolean
          name: string
          os: string
          system_uuid: string
          updated_at: string | null
          version: string
        }
        Insert: {
          created_at?: string
          has_data?: boolean
          id?: string
          is_app_installed?: boolean
          name: string
          os: string
          system_uuid: string
          updated_at?: string | null
          version: string
        }
        Update: {
          created_at?: string
          has_data?: boolean
          id?: string
          is_app_installed?: boolean
          name?: string
          os?: string
          system_uuid?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      licences: {
        Row: {
          created_at: string
          domain_content: boolean
          domain_data: boolean
          domain_software: boolean
          family: string | null
          full_text: string | null
          id: string
          is_generic: boolean
          legacy_ids: string[] | null
          maintainer: string | null
          od_conformance:
            | Database["public"]["Enums"]["licence_conformance"]
            | null
          osd_conformance:
            | Database["public"]["Enums"]["licence_conformance"]
            | null
          status: Database["public"]["Enums"]["licence_status"]
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          domain_content?: boolean
          domain_data?: boolean
          domain_software?: boolean
          family?: string | null
          full_text?: string | null
          id: string
          is_generic?: boolean
          legacy_ids?: string[] | null
          maintainer?: string | null
          od_conformance?:
            | Database["public"]["Enums"]["licence_conformance"]
            | null
          osd_conformance?:
            | Database["public"]["Enums"]["licence_conformance"]
            | null
          status?: Database["public"]["Enums"]["licence_status"]
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          domain_content?: boolean
          domain_data?: boolean
          domain_software?: boolean
          family?: string | null
          full_text?: string | null
          id?: string
          is_generic?: boolean
          legacy_ids?: string[] | null
          maintainer?: string | null
          od_conformance?:
            | Database["public"]["Enums"]["licence_conformance"]
            | null
          osd_conformance?:
            | Database["public"]["Enums"]["licence_conformance"]
            | null
          status?: Database["public"]["Enums"]["licence_status"]
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          level: Database["public"]["Enums"]["logs_level"]
          message: string
          product: string
          source: string
          timestamp: string
          type: Database["public"]["Enums"]["logs_category"]
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: Database["public"]["Enums"]["logs_level"]
          message: string
          product: string
          source: string
          timestamp: string
          type?: Database["public"]["Enums"]["logs_category"]
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: Database["public"]["Enums"]["logs_level"]
          message?: string
          product?: string
          source?: string
          timestamp?: string
          type?: Database["public"]["Enums"]["logs_category"]
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          website?: string | null
        }
        Relationships: []
      }
      project_corpora: {
        Row: {
          corpus_id: string
          linked_at: string
          project_id: string
        }
        Insert: {
          corpus_id: string
          linked_at?: string
          project_id: string
        }
        Update: {
          corpus_id?: string
          linked_at?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_corpora_corpus_id_fkey"
            columns: ["corpus_id"]
            isOneToOne: false
            referencedRelation: "corpora"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_corpora_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_licences: {
        Row: {
          agreed_at: string | null
          agreed_by_user_id: string | null
          created_at: string
          id: string
          licence_id: string
          project_id: string
        }
        Insert: {
          agreed_at?: string | null
          agreed_by_user_id?: string | null
          created_at?: string
          id?: string
          licence_id: string
          project_id: string
        }
        Update: {
          agreed_at?: string | null
          agreed_by_user_id?: string | null
          created_at?: string
          id?: string
          licence_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_licences_agreed_by_user_id_fkey"
            columns: ["agreed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_licences_licence_id_fkey"
            columns: ["licence_id"]
            isOneToOne: false
            referencedRelation: "licences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_licences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_references: {
        Row: {
          authors: string | null
          created_at: string
          id: string
          project_id: string
          publication: string | null
          title: string
          updated_at: string
          url: string | null
          year: number | null
        }
        Insert: {
          authors?: string | null
          created_at?: string
          id?: string
          project_id: string
          publication?: string | null
          title: string
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Update: {
          authors?: string | null
          created_at?: string
          id?: string
          project_id?: string
          publication?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          year?: number | null
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
      projects: {
        Row: {
          category: string | null
          corpus_document_id: string | null
          created_at: string
          description: string | null
          id: string
          language: string[] | null
          name: string
          organization_id: string | null
          owner_id: string | null
          status: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          corpus_document_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          language?: string[] | null
          name: string
          organization_id?: string | null
          owner_id?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          corpus_document_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          language?: string[] | null
          name?: string
          organization_id?: string | null
          owner_id?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_corpus_document_id_fkey"
            columns: ["corpus_document_id"]
            isOneToOne: false
            referencedRelation: "corpus_documents"
            referencedColumns: ["id"]
          },
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
      repositories: {
        Row: {
          category: Database["public"]["Enums"]["category_type"][]
          created_at: string
          credits: string | null
          date: string | null
          description: string | null
          download_uri: string | null
          format: Database["public"]["Enums"]["format_type"] | null
          image_url: string | null
          language: Database["public"]["Enums"]["language_type"]
          licence: string | null
          name: string
          period: string
          repository: string
          size: string | null
          type: Database["public"]["Enums"]["book_type"] | null
          updated_at: string | null
          uuid: string
          version: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["category_type"][]
          created_at?: string
          credits?: string | null
          date?: string | null
          description?: string | null
          download_uri?: string | null
          format?: Database["public"]["Enums"]["format_type"] | null
          image_url?: string | null
          language: Database["public"]["Enums"]["language_type"]
          licence?: string | null
          name: string
          period: string
          repository: string
          size?: string | null
          type?: Database["public"]["Enums"]["book_type"] | null
          updated_at?: string | null
          uuid?: string
          version?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["category_type"][]
          created_at?: string
          credits?: string | null
          date?: string | null
          description?: string | null
          download_uri?: string | null
          format?: Database["public"]["Enums"]["format_type"] | null
          image_url?: string | null
          language?: Database["public"]["Enums"]["language_type"]
          licence?: string | null
          name?: string
          period?: string
          repository?: string
          size?: string | null
          type?: Database["public"]["Enums"]["book_type"] | null
          updated_at?: string | null
          uuid?: string
          version?: number | null
        }
        Relationships: []
      }
      user_directory: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_street: string | null
          address_suite: string | null
          address_zipcode: string | null
          auth_id: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          operating_system: string | null
          organization_id: string | null
          phone: string | null
          system_path: string | null
          username: string
          website: string | null
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_street?: string | null
          address_suite?: string | null
          address_zipcode?: string | null
          auth_id?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          operating_system?: string | null
          organization_id?: string | null
          phone?: string | null
          system_path?: string | null
          username: string
          website?: string | null
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_street?: string | null
          address_suite?: string | null
          address_zipcode?: string | null
          auth_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          operating_system?: string | null
          organization_id?: string | null
          phone?: string | null
          system_path?: string | null
          username?: string
          website?: string | null
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
      users: {
        Row: {
          address_id: string | null
          auth_id: string | null
          avatar_url: string | null
          created_at: string
          device_id: string | null
          display_name: string
          email: string | null
          id: string
          name: string | null
          operating_system: string | null
          organization_id: string | null
          phone: string | null
          system_path: string | null
          updated_at: string
          user_type: string
          username: string | null
          website: string | null
        }
        Insert: {
          address_id?: string | null
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string
          device_id?: string | null
          display_name?: string
          email?: string | null
          id: string
          name?: string | null
          operating_system?: string | null
          organization_id?: string | null
          phone?: string | null
          system_path?: string | null
          updated_at?: string
          user_type?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          address_id?: string | null
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string
          device_id?: string | null
          display_name?: string
          email?: string | null
          id?: string
          name?: string | null
          operating_system?: string | null
          organization_id?: string | null
          phone?: string | null
          system_path?: string | null
          updated_at?: string
          user_type?: string
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      book_type:
        | "bible"
        | "commentary"
        | "lexicon"
        | "biography"
        | "review"
        | "manuscript"
        | "tanakh"
        | "quran"
        | "apocrypha"
      category_type:
        | "biblical"
        | "religious"
        | "literary"
        | "historical"
        | "paratext"
      format_type:
        | "application/xml"
        | "application/json"
        | "text/html"
        | "text/plain"
        | "application/pdf"
        | "application/tei+xml"
        | "application/tf+xml"
        | "application/cfm+xml"
        | "application/epub+xml"
      language_type:
        | "hebrew"
        | "greek"
        | "syriac"
        | "arabic"
        | "aramaic"
        | "proto-cuneiform"
        | "akkadian"
        | "ugaritic"
        | "pali"
        | "latin"
        | "dutch"
        | "french"
        | "italian"
        | "english"
      licence_conformance: "not reviewed" | "approved" | "rejected"
      licence_status: "active" | "retired" | "superseded"
      logs_category:
        | "auth"
        | "database"
        | "storage"
        | "docker"
        | "mcp"
        | "other"
      logs_level: "debug" | "info" | "warning" | "error"
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
      book_type: [
        "bible",
        "commentary",
        "lexicon",
        "biography",
        "review",
        "manuscript",
        "tanakh",
        "quran",
        "apocrypha",
      ],
      category_type: [
        "biblical",
        "religious",
        "literary",
        "historical",
        "paratext",
      ],
      format_type: [
        "application/xml",
        "application/json",
        "text/html",
        "text/plain",
        "application/pdf",
        "application/tei+xml",
        "application/tf+xml",
        "application/cfm+xml",
        "application/epub+xml",
      ],
      language_type: [
        "hebrew",
        "greek",
        "syriac",
        "arabic",
        "aramaic",
        "proto-cuneiform",
        "akkadian",
        "ugaritic",
        "pali",
        "latin",
        "dutch",
        "french",
        "italian",
        "english",
      ],
      licence_conformance: ["not reviewed", "approved", "rejected"],
      licence_status: ["active", "retired", "superseded"],
      logs_category: ["auth", "database", "storage", "docker", "mcp", "other"],
      logs_level: ["debug", "info", "warning", "error"],
    },
  },
} as const
