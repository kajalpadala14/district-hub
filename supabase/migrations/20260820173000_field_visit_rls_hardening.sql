drop policy if exists "Users can manage allowed field visit records" on public.field_visit_records;
create policy "Users can manage allowed field visit records"
on public.field_visit_records for all
to authenticated
using (
  public.has_any_role(auth.uid(), array['admin', 'manager'])
  or (
    recorded_by = auth.uid()
    and exists (
      select 1 from public.field_visit_units u
      where u.id = unit_id
        and (u.owner_id = auth.uid() or u.owner_id is null)
    )
  )
)
with check (
  public.has_any_role(auth.uid(), array['admin', 'manager'])
  or (
    recorded_by = auth.uid()
    and exists (
      select 1 from public.field_visit_units u
      where u.id = unit_id
        and (u.owner_id = auth.uid() or u.owner_id is null)
    )
  )
);

drop policy if exists "Users can manage allowed field visit plan items" on public.field_visit_plan_items;
create policy "Users can manage allowed field visit plan items"
on public.field_visit_plan_items for all
to authenticated
using (
  public.has_any_role(auth.uid(), array['admin', 'manager'])
  or exists (
    select 1
    from public.field_visit_plans p
    join public.field_visit_units u on u.id = unit_id
    where p.id = plan_id
      and p.owner_id = auth.uid()
      and (u.owner_id = auth.uid() or u.owner_id is null)
  )
)
with check (
  public.has_any_role(auth.uid(), array['admin', 'manager'])
  or exists (
    select 1
    from public.field_visit_plans p
    join public.field_visit_units u on u.id = unit_id
    where p.id = plan_id
      and p.owner_id = auth.uid()
      and (u.owner_id = auth.uid() or u.owner_id is null)
  )
);
