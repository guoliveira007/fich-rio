INSERT INTO public.user_roles (user_id, role)
SELECT '46b136bc-7458-4d0d-98d6-9a3a27f4995c'::uuid, 'admin'::public.app_role
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role);