CREATE OR REPLACE FUNCTION public.claim_imported_data(_code text, _user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := _user_id;
  legacy uuid;
BEGIN
  IF me IS NULL THEN
    RETURN 'nao_logado';
  END IF;

  SELECT legacy_user_id INTO legacy
  FROM public.import_claims
  WHERE code = _code AND claimed_by IS NULL
  FOR UPDATE;

  IF legacy IS NULL THEN
    RETURN 'codigo_invalido';
  END IF;

  IF legacy = me THEN
    RETURN 'ok';
  END IF;

  DELETE FROM public.profiles WHERE id = me;
  UPDATE public.profiles SET id = me WHERE id = legacy;
  UPDATE public.subjects SET user_id = me WHERE user_id = legacy;
  UPDATE public.materials SET user_id = me WHERE user_id = legacy;
  UPDATE public.custom_lessons SET user_id = me WHERE user_id = legacy;
  UPDATE public.lesson_progress SET user_id = me WHERE user_id = legacy;
  UPDATE public.lesson_summaries SET user_id = me WHERE user_id = legacy;
  UPDATE public.exams SET user_id = me WHERE user_id = legacy;
  UPDATE public.exam_questions SET user_id = me WHERE user_id = legacy;
  UPDATE public.error_reviews SET user_id = me WHERE user_id = legacy;
  UPDATE public.exercise_lists SET user_id = me WHERE user_id = legacy;
  UPDATE public.exercise_list_items SET user_id = me WHERE user_id = legacy;
  UPDATE public.flashcards SET user_id = me WHERE user_id = legacy;
  UPDATE public.quiz_questions SET user_id = me WHERE user_id = legacy;
  UPDATE public.study_sessions SET user_id = me WHERE user_id = legacy;
  UPDATE public.study_plans SET user_id = me WHERE user_id = legacy;
  UPDATE public.edital_topics SET user_id = me WHERE user_id = legacy;
  UPDATE public.upload_sessions SET user_id = me WHERE user_id = legacy;
  UPDATE public.ai_settings SET user_id = me WHERE user_id = legacy;

  UPDATE public.import_claims
  SET claimed_by = me, claimed_at = now()
  WHERE legacy_user_id = legacy;

  RETURN 'ok';
END;
$function$;

DROP FUNCTION IF EXISTS public.claim_imported_data(text);

REVOKE ALL ON FUNCTION public.claim_imported_data(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_imported_data(text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;