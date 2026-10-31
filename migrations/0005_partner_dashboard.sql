CREATE TABLE IF NOT EXISTS raya_ref_clicks (
  id BIGSERIAL PRIMARY KEY,
  ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS raya_ref_clicks_ref_idx ON raya_ref_clicks (ref);

CREATE TABLE IF NOT EXISTS raya_withdrawals (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS raya_withdrawals_ref_idx ON raya_withdrawals ((data->>'ref'));
