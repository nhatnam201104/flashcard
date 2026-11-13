-- The live `cards` table has RLS enabled but no policies, so signed-in users read
-- zero rows: the Cards page was empty and choice mode had no distractors.
-- Cards are written only by the daily ingest pipeline (service role), so grant
-- read access only; signed-in users still cannot insert/update/delete cards.
-- Additive only: no data or existing policy is touched.
create policy "cards_select_authenticated" on public.cards
  for select to authenticated using (true);
