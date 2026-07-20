-- Profiles are used as the employee registry, so employee rows do not always
-- have matching auth.users records. Keep the primary key, but remove the auth FK.

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;
