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
      ai_settings: {
        Row: {
          created_at: string
          groq_api_key: string | null
          groq_model: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          groq_api_key?: string | null
          groq_model?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          groq_api_key?: string | null
          groq_model?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_lessons: {
        Row: {
          created_at: string
          date: string
          frente: string
          id: string
          professor: string
          subject: string
          subject_id: string | null
          title: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          frente?: string
          id?: string
          professor?: string
          subject: string
          subject_id?: string | null
          title: string
          url?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          frente?: string
          id?: string
          professor?: string
          subject?: string
          subject_id?: string | null
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      edital_topics: {
        Row: {
          board: string | null
          created_at: string
          id: string
          material_id: string | null
          position: number
          subject_id: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          board?: string | null
          created_at?: string
          id?: string
          material_id?: string | null
          position?: number
          subject_id: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          board?: string | null
          created_at?: string
          id?: string
          material_id?: string | null
          position?: number
          subject_id?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edital_topics_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edital_topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      error_reviews: {
        Row: {
          concept: string | null
          correct_reasoning: string | null
          created_at: string
          error_type: string | null
          id: string
          misstep_step: number | null
          option_analysis: Json
          question_id: string
          resolved_at: string | null
          statement_clues: Json
          steps: Json
          user_explanation: string
          user_id: string
          visual_caption: string | null
          visual_svg: string | null
          was_correct: boolean
          why_wrong: string | null
        }
        Insert: {
          concept?: string | null
          correct_reasoning?: string | null
          created_at?: string
          error_type?: string | null
          id?: string
          misstep_step?: number | null
          option_analysis?: Json
          question_id: string
          resolved_at?: string | null
          statement_clues?: Json
          steps?: Json
          user_explanation?: string
          user_id: string
          visual_caption?: string | null
          visual_svg?: string | null
          was_correct?: boolean
          why_wrong?: string | null
        }
        Update: {
          concept?: string | null
          correct_reasoning?: string | null
          created_at?: string
          error_type?: string | null
          id?: string
          misstep_step?: number | null
          option_analysis?: Json
          question_id?: string
          resolved_at?: string | null
          statement_clues?: Json
          steps?: Json
          user_explanation?: string
          user_id?: string
          visual_caption?: string | null
          visual_svg?: string | null
          was_correct?: boolean
          why_wrong?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_reviews_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      essays: {
        Row: {
          board: string
          created_at: string
          criteria: Json
          feedback: string
          id: string
          improvements: Json
          max_score: number
          minutes: number
          mode: string
          part: string
          rewritten: string
          score: number | null
          status: string
          strengths: Json
          submitted_at: string | null
          text: string
          theme_prompt: string
          theme_title: string
          user_id: string
        }
        Insert: {
          board?: string
          created_at?: string
          criteria?: Json
          feedback?: string
          id?: string
          improvements?: Json
          max_score?: number
          minutes?: number
          mode?: string
          part?: string
          rewritten?: string
          score?: number | null
          status?: string
          strengths?: Json
          submitted_at?: string | null
          text?: string
          theme_prompt?: string
          theme_title?: string
          user_id: string
        }
        Update: {
          board?: string
          created_at?: string
          criteria?: Json
          feedback?: string
          id?: string
          improvements?: Json
          max_score?: number
          minutes?: number
          mode?: string
          part?: string
          rewritten?: string
          score?: number | null
          status?: string
          strengths?: Json
          submitted_at?: string | null
          text?: string
          theme_prompt?: string
          theme_title?: string
          user_id?: string
        }
        Relationships: []
      }
      exam_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          exam_id: string
          generation_sources: Json | null
          has_visual: boolean
          id: string
          is_correct: boolean | null
          number: number
          options: Json | null
          page_number: number | null
          source_type: string
          statement: string | null
          subject: string | null
          subject_id: string | null
          topic: string | null
          user_answer: string | null
          user_id: string
          visual_summary: string | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          exam_id: string
          generation_sources?: Json | null
          has_visual?: boolean
          id?: string
          is_correct?: boolean | null
          number: number
          options?: Json | null
          page_number?: number | null
          source_type?: string
          statement?: string | null
          subject?: string | null
          subject_id?: string | null
          topic?: string | null
          user_answer?: string | null
          user_id: string
          visual_summary?: string | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          exam_id?: string
          generation_sources?: Json | null
          has_visual?: boolean
          id?: string
          is_correct?: boolean | null
          number?: number
          options?: Json | null
          page_number?: number | null
          source_type?: string
          statement?: string | null
          subject?: string | null
          subject_id?: string | null
          topic?: string | null
          user_answer?: string | null
          user_id?: string
          visual_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          board: string | null
          correct_count: number
          created_at: string
          exam_date: string
          exam_file_path: string | null
          id: string
          status: string
          subject_id: string | null
          title: string
          total_questions: number
          user_id: string
        }
        Insert: {
          board?: string | null
          correct_count?: number
          created_at?: string
          exam_date?: string
          exam_file_path?: string | null
          id?: string
          status?: string
          subject_id?: string | null
          title: string
          total_questions?: number
          user_id: string
        }
        Update: {
          board?: string | null
          correct_count?: number
          created_at?: string
          exam_date?: string
          exam_file_path?: string | null
          id?: string
          status?: string
          subject_id?: string | null
          title?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_list_items: {
        Row: {
          correct_answer: string | null
          created_at: string
          done: boolean
          has_visual: boolean
          id: string
          is_correct: boolean | null
          list_id: string
          number: number
          options: Json | null
          page_number: number | null
          statement: string | null
          user_answer: string | null
          user_id: string
          visual_summary: string | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          done?: boolean
          has_visual?: boolean
          id?: string
          is_correct?: boolean | null
          list_id: string
          number: number
          options?: Json | null
          page_number?: number | null
          statement?: string | null
          user_answer?: string | null
          user_id: string
          visual_summary?: string | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          done?: boolean
          has_visual?: boolean
          id?: string
          is_correct?: boolean | null
          list_id?: string
          number?: number
          options?: Json | null
          page_number?: number | null
          statement?: string | null
          user_answer?: string | null
          user_id?: string
          visual_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "exercise_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_lists: {
        Row: {
          created_at: string
          file_path: string | null
          id: string
          lesson_id: string
          lesson_title: string | null
          subject: string | null
          title: string
          total_questions: number
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          id?: string
          lesson_id: string
          lesson_title?: string | null
          subject?: string | null
          title: string
          total_questions?: number
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          id?: string
          lesson_id?: string
          lesson_title?: string | null
          subject?: string | null
          title?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          box: number
          created_at: string
          front: string
          id: string
          lesson_id: string | null
          next_review: string
          reviews: number
          source_question_id: string | null
          subject_id: string
          user_id: string
        }
        Insert: {
          back: string
          box?: number
          created_at?: string
          front: string
          id?: string
          lesson_id?: string | null
          next_review?: string
          reviews?: number
          source_question_id?: string | null
          subject_id: string
          user_id: string
        }
        Update: {
          back?: string
          box?: number
          created_at?: string
          front?: string
          id?: string
          lesson_id?: string | null
          next_review?: string
          reviews?: number
          source_question_id?: string | null
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_source_question_id_fkey"
            columns: ["source_question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      import_claims: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          code: string
          created_at: string
          legacy_user_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          code: string
          created_at?: string
          legacy_user_id: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          code?: string
          created_at?: string
          legacy_user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
          watched: boolean
        }
        Insert: {
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
          watched?: boolean
        }
        Update: {
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
          watched?: boolean
        }
        Relationships: []
      }
      lesson_summaries: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          lesson_title: string | null
          subject: string | null
          subject_id: string | null
          summary: string
          transcript: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          lesson_title?: string | null
          subject?: string | null
          subject_id?: string | null
          summary?: string
          transcript?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          lesson_title?: string | null
          subject?: string | null
          subject_id?: string | null
          summary?: string
          transcript?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_summaries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          course: string | null
          created_at: string
          external_id: string | null
          file_path: string | null
          file_size: number | null
          id: string
          kind: string
          lesson_id: string | null
          lesson_ids: string[]
          link_url: string | null
          read: boolean
          source: string
          subject_id: string | null
          tags: string[]
          title: string
          topic: string | null
          user_id: string
        }
        Insert: {
          course?: string | null
          created_at?: string
          external_id?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: string
          lesson_id?: string | null
          lesson_ids?: string[]
          link_url?: string | null
          read?: boolean
          source?: string
          subject_id?: string | null
          tags?: string[]
          title: string
          topic?: string | null
          user_id: string
        }
        Update: {
          course?: string | null
          created_at?: string
          external_id?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: string
          lesson_id?: string | null
          lesson_ids?: string[]
          link_url?: string | null
          read?: boolean
          source?: string
          subject_id?: string | null
          tags?: string[]
          title?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          goal: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          goal?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          goal?: string | null
          id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          lesson_id: string | null
          options: Json
          question: string
          subject_id: string
          user_id: string
        }
        Insert: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          lesson_id?: string | null
          options?: Json
          question: string
          subject_id: string
          user_id: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          lesson_id?: string | null
          options?: Json
          question?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          content: string
          created_at: string
          exam_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          exam_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          exam_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          cards_reviewed: number
          correct: number
          created_at: string
          day: string
          id: string
          minutes: number
          subject_id: string | null
          total: number
          user_id: string
        }
        Insert: {
          cards_reviewed?: number
          correct?: number
          created_at?: string
          day?: string
          id?: string
          minutes?: number
          subject_id?: string | null
          total?: number
          user_id: string
        }
        Update: {
          cards_reviewed?: number
          correct?: number
          created_at?: string
          day?: string
          id?: string
          minutes?: number
          subject_id?: string | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          area: string
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          position: number
          user_id: string
        }
        Insert: {
          area?: string
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          position?: number
          user_id: string
        }
        Update: {
          area?: string
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_sessions: {
        Row: {
          created_at: string
          error: string | null
          exam_question_id: string | null
          id: string
          photo_path: string | null
          status: string
          transcript: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          exam_question_id?: string | null
          id?: string
          photo_path?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          exam_question_id?: string | null
          id?: string
          photo_path?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_sessions_exam_question_id_fkey"
            columns: ["exam_question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_imported_data: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
