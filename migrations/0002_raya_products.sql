CREATE TABLE IF NOT EXISTS raya_products (
  slug TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS raya_products_updated_at_idx ON raya_products (updated_at DESC);
