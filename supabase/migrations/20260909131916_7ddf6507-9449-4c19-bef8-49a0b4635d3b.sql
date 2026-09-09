CREATE TABLE public.custom_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  date text NOT NULL,
  professor text NOT NULL DEFAULT '',
  frente text NOT NULL DEFAULT '',
  title text NOT NULL,
  url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_lessons TO authenticated;
GRANT ALL ON public.custom_lessons TO service_role;
ALTER TABLE public.custom_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own custom lessons" ON public.custom_lessons FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX custom_lessons_user_subject_idx ON public.custom_lessons (user_id, subject);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  goal text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  area text NOT NULL DEFAULT 'geral',
  color text NOT NULL DEFAULT '#888888',
  description text,
  parent_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subjects" ON public.subjects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX subjects_user_idx ON public.subjects (user_id, position);

CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id text NOT NULL,
  watched boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lesson progress" ON public.lesson_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.lesson_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id text NOT NULL,
  lesson_title text,
  subject text,
  summary text NOT NULL DEFAULT '',
  transcript text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_summaries TO authenticated;
GRANT ALL ON public.lesson_summaries TO service_role;
ALTER TABLE public.lesson_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lesson summaries" ON public.lesson_summaries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  board text,
  exam_date date NOT NULL DEFAULT current_date,
  exam_file_path text,
  status text NOT NULL DEFAULT 'pending',
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  total_questions integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exams" ON public.exams FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  number integer NOT NULL,
  statement text,
  options jsonb,
  correct_answer text,
  user_answer text,
  is_correct boolean,
  subject text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_questions TO authenticated;
GRANT ALL ON public.exam_questions TO service_role;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exam questions" ON public.exam_questions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX exam_questions_exam_idx ON public.exam_questions (exam_id, number);

CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  lesson_id text,
  front text NOT NULL,
  back text NOT NULL,
  box integer NOT NULL DEFAULT 1,
  reviews integer NOT NULL DEFAULT 0,
  next_review timestamptz NOT NULL DEFAULT now(),
  source_question_id uuid REFERENCES public.exam_questions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT ALL ON public.flashcards TO service_role;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own flashcards" ON public.flashcards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX flashcards_user_next_idx ON public.flashcards (user_id, next_review);

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  lesson_id text,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer NOT NULL DEFAULT 0,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quiz questions" ON public.quiz_questions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  lesson_id text,
  lesson_ids text[] NOT NULL DEFAULT '{}',
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'pdf',
  source text NOT NULL DEFAULT 'upload',
  course text,
  topic text,
  file_path text,
  file_size bigint,
  external_id text,
  link_url text,
  read boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own materials" ON public.materials FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX materials_user_subject_idx ON public.materials (user_id, subject_id);

CREATE TABLE public.error_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  user_explanation text NOT NULL DEFAULT '',
  why_wrong text,
  correct_reasoning text,
  concept text,
  error_type text,
  visual_svg text,
  visual_caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.error_reviews TO authenticated;
GRANT ALL ON public.error_reviews TO service_role;
ALTER TABLE public.error_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own error reviews" ON public.error_reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own study plans" ON public.study_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  day date NOT NULL DEFAULT current_date,
  minutes integer NOT NULL DEFAULT 0,
  cards_reviewed integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own study sessions" ON public.study_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX study_sessions_user_day_idx ON public.study_sessions (user_id, day DESC);

ALTER TABLE public.custom_lessons
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id);

ALTER TABLE public.lesson_summaries
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id);

CREATE INDEX IF NOT EXISTS custom_lessons_subject_id_idx ON public.custom_lessons (subject_id);
CREATE INDEX IF NOT EXISTS lesson_summaries_subject_id_idx ON public.lesson_summaries (subject_id);

CREATE TABLE public.upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_question_id uuid REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  photo_path text,
  transcript text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.upload_sessions TO authenticated;
GRANT ALL ON public.upload_sessions TO service_role;

ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own upload sessions" ON public.upload_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX upload_sessions_user_idx ON public.upload_sessions (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_upload_sessions_updated_at
  BEFORE UPDATE ON public.upload_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.upload_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_sessions;

ALTER TABLE public.error_reviews DROP CONSTRAINT IF EXISTS error_reviews_user_id_question_id_key;
ALTER TABLE public.error_reviews ADD CONSTRAINT error_reviews_question_id_key UNIQUE (question_id);

ALTER TABLE public.exam_questions
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS generation_sources jsonb;

CREATE INDEX IF NOT EXISTS exam_questions_source_type_idx ON public.exam_questions (user_id, source_type);

ALTER TABLE public.error_reviews
  ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS error_reviews_user_resolved_idx
  ON public.error_reviews (user_id, resolved_at);

CREATE TABLE public.essays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  board text NOT NULL DEFAULT 'FUVEST',
  theme_title text NOT NULL DEFAULT '',
  theme_prompt text NOT NULL DEFAULT '',
  text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'rascunho',
  score numeric,
  max_score numeric NOT NULL DEFAULT 50,
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  feedback text NOT NULL DEFAULT '',
  rewritten text NOT NULL DEFAULT '',
  minutes integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  submitted_at timestamp with time zone
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.essays TO authenticated;
GRANT ALL ON public.essays TO service_role;

ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own essays" ON public.essays
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX essays_user_created_idx ON public.essays (user_id, created_at DESC);

ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'completa',
  ADD COLUMN IF NOT EXISTS part text NOT NULL DEFAULT '';