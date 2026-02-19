-- LinkedIn company profiles enriched via AI web search
CREATE TABLE IF NOT EXISTS company_linkedin_profiles (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       text        NOT NULL,
  found            boolean     NOT NULL DEFAULT false,
  linkedin_url     text,
  company_size     text,
  industry         text,
  founded          text,
  about            text,
  specialties      text[]      DEFAULT '{}',
  key_people       jsonb       DEFAULT '[]'::jsonb,
  followers        text,
  headquarters     text,
  not_found_reason text,
  model            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_linkedin_company_id
  ON company_linkedin_profiles (company_id);
