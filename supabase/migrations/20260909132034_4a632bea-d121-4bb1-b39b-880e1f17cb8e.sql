CREATE TABLE public.ai_settings (
  user_id uuid PRIMARY KEY,
  groq_api_key text,
  groq_model text NOT NULL DEFAULT 'llama-3.3-70b-versatile',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai settings" ON public.ai_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.edital_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  board text,
  topic text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.edital_topics TO authenticated;
GRANT ALL ON public.edital_topics TO service_role;
ALTER TABLE public.edital_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own edital topics" ON public.edital_topics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX edital_topics_user_subject_idx ON public.edital_topics (user_id, subject_id, position);

CREATE TABLE public.exercise_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id text NOT NULL,
  lesson_title text,
  subject text,
  title text NOT NULL,
  file_path text,
  total_questions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_lists TO authenticated;
GRANT ALL ON public.exercise_lists TO service_role;
ALTER TABLE public.exercise_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exercise lists" ON public.exercise_lists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX exercise_lists_user_lesson_idx ON public.exercise_lists (user_id, lesson_id);

CREATE TABLE public.exercise_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  list_id uuid NOT NULL REFERENCES public.exercise_lists(id) ON DELETE CASCADE,
  number integer NOT NULL,
  statement text,
  options jsonb,
  correct_answer text,
  user_answer text,
  is_correct boolean,
  done boolean NOT NULL DEFAULT false,
  has_visual boolean NOT NULL DEFAULT false,
  page_number integer,
  visual_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_list_items TO authenticated;
GRANT ALL ON public.exercise_list_items TO service_role;
ALTER TABLE public.exercise_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exercise list items" ON public.exercise_list_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX exercise_list_items_list_idx ON public.exercise_list_items (list_id, number);

ALTER TABLE public.exam_questions
  ADD COLUMN IF NOT EXISTS has_visual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS page_number integer,
  ADD COLUMN IF NOT EXISTS visual_summary text;

ALTER TABLE public.error_reviews
  ADD COLUMN IF NOT EXISTS misstep_step integer,
  ADD COLUMN IF NOT EXISTS option_analysis jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS statement_clues jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS was_correct boolean NOT NULL DEFAULT false;

ALTER TABLE public.materials ALTER COLUMN subject_id DROP NOT NULL;