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