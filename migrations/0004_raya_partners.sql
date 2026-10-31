CREATE TABLE IF NOT EXISTS raya_partners (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS raya_partners_created_at_idx ON raya_partners (created_at DESC);
