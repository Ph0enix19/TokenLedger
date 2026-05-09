CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS request_log (
  id            BIGSERIAL PRIMARY KEY,
  prompt_hash   TEXT NOT NULL,
  model_used    TEXT NOT NULL,
  input_tokens  INT,
  output_tokens INT,
  cost_myr      NUMERIC(10, 6),
  latency_ms    INT,
  cache_hit     BOOLEAN DEFAULT FALSE,
  route_reason  TEXT,
  tool_calls    JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id              BIGSERIAL PRIMARY KEY,
  request_id      BIGINT REFERENCES request_log(id),
  user_id         TEXT,
  prompt_redacted TEXT,
  pii_flags       JSONB DEFAULT '[]',
  outcome         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cache_entries (
  id          BIGSERIAL PRIMARY KEY,
  embedding   vector(768),
  prompt      TEXT,
  response    TEXT,
  hits        INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id         BIGSERIAL PRIMARY KEY,
  source     TEXT,
  chunk      TEXT,
  embedding  vector(768)
);