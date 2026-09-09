ALTER TABLE public.error_reviews
  ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS error_reviews_user_resolved_idx
  ON public.error_reviews (user_id, resolved_at);