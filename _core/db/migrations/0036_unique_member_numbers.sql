-- ═══════════════════════════════════════════════════════════════════════════════
-- 0036 — Unique member numbers
-- ═══════════════════════════════════════════════════════════════════════════════
-- Adds a unique index on members."memberNumber" (trimmed, case-insensitive,
-- blanks/NULLs ignored) so two members can't share a number.
--
-- Does NOT change any existing member number. Numbers already shared by more
-- than one member when this runs (e.g. RL-2026-PREVIEW from the old admin
-- preview helper) are grandfathered: excluded from the index and left exactly as
-- they are until the owner approves renumbering them. Application code
-- (features/membership/server/memberNumbers.ts) also refuses to assign a
-- grandfathered value to anyone else.
--
-- Additive and repeat-safe: no-op if the index already exists.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  dupes text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'members_member_number_unique') THEN
    RETURN;
  END IF;

  SELECT string_agg(quote_literal(k), ', ' ORDER BY k) INTO dupes
  FROM (
    SELECT upper(btrim("memberNumber")) AS k
    FROM members
    WHERE nullif(btrim("memberNumber"), '') IS NOT NULL
    GROUP BY 1
    HAVING count(*) > 1
  ) d;

  IF dupes IS NULL THEN
    EXECUTE 'CREATE UNIQUE INDEX members_member_number_unique ON members (upper(btrim("memberNumber"))) '
         || 'WHERE nullif(btrim("memberNumber"), '''') IS NOT NULL';
  ELSE
    RAISE NOTICE 'members_member_number_unique: grandfathering already-shared member numbers: %', dupes;
    EXECUTE 'CREATE UNIQUE INDEX members_member_number_unique ON members (upper(btrim("memberNumber"))) '
         || 'WHERE nullif(btrim("memberNumber"), '''') IS NOT NULL '
         || 'AND upper(btrim("memberNumber")) NOT IN (' || dupes || ')';
  END IF;
END $$;
