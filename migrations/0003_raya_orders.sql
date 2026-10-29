CREATE TABLE IF NOT EXISTS raya_orders (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS raya_orders_created_at_idx ON raya_orders (created_at DESC);
