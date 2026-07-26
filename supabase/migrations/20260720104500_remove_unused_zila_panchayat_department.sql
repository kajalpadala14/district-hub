-- Remove the seeded Zila Panchayat department only when nothing references it.

DELETE FROM public.departments
WHERE lower(trim(name)) = lower('Zila Panchayat')
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(trim(department)) = lower('Zila Panchayat')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE lower(trim(department)) = lower('Zila Panchayat')
  );
