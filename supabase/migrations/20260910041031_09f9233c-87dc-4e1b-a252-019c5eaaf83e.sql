CREATE TABLE public.essay_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  essay_id uuid NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  trecho text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT '',
  gravidade text NOT NULL DEFAULT 'media',
  problema text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX essay_marks_essay_idx ON public.essay_marks (essay_id);
CREATE INDEX essay_marks_user_idx ON public.essay_marks (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.essay_marks TO authenticated;
GRANT ALL ON public.essay_marks TO service_role;
ALTER TABLE public.essay_marks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own essay marks" ON public.essay_marks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);