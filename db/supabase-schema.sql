-- ContentFlow Database Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query

-- PROFILES (one per user)
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name  text    DEFAULT 'ContentFlow B.V.',
  website       text,
  vision        text,
  mission       text,
  services      text,
  tone_nl       text,
  paragraph_length text DEFAULT 'medium',
  algo_settings jsonb   DEFAULT '{}',
  trust_level   int     DEFAULT 0,
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN INSERT INTO profiles (id) VALUES (NEW.id); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- CONTENT ITEMS
CREATE TABLE IF NOT EXISTS content_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        text NOT NULL,
  slug         text,
  keyword      text,
  status       text DEFAULT 'draft' CHECK (status IN ('draft','review','live')),
  word_count   int  DEFAULT 0,
  seo_score    int  DEFAULT 0,
  body         text,
  meta_description text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own content" ON content_items FOR ALL USING (auth.uid() = user_id);

-- CONTENT JOBS (generatie queue)
CREATE TABLE IF NOT EXISTS content_jobs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword    text,
  status     text DEFAULT 'pending',
  result     jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE content_jobs ENABLE ROW LEVEL SECURITY;
-- Gebruiker ziet en beheert eigen jobs
CREATE POLICY "Own jobs" ON content_jobs FOR ALL USING (auth.uid() = user_id);
-- n8n (anon key) mag resultaat terugschrijven — veilig omdat het UUID bekend moet zijn
CREATE POLICY "Service can update jobs" ON content_jobs FOR UPDATE USING (true);

-- KNOWLEDGE BASE
CREATE TABLE IF NOT EXISTS knowledge_base (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       text NOT NULL CHECK (type IN ('persona','tone','topical_map','source','guide')),
  title      text NOT NULL,
  content    text,
  tags       text[],
  created_at timestamptz DEFAULT now()
);
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own knowledge" ON knowledge_base FOR ALL USING (auth.uid() = user_id);
