-- ═══════════════════════════════════════════════════════════════════════════════
-- 0039 — Database file storage
-- ═══════════════════════════════════════════════════════════════════════════════
-- Uploaded files (property cover photos and maps, Member File photos, waiver
-- documents) are kept here when the Forge storage service isn't configured on
-- the server. See _core/server/storage.ts. Additive and repeat-safe.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stored_files (
  key           varchar(600) PRIMARY KEY,
  content_type  varchar(120) NOT NULL,
  size          integer      NOT NULL,
  data          bytea        NOT NULL,
  created_at    timestamp    NOT NULL DEFAULT now()
);
