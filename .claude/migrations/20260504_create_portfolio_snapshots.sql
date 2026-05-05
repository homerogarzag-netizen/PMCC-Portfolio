CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_realized NUMERIC NOT NULL,
  total_unrealized_leap NUMERIC NOT NULL,
  total_unrealized_short NUMERIC NOT NULL,
  total_net_pl NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- Habilitar RLS
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own snapshots"
  ON portfolio_snapshots
  FOR ALL
  USING (auth.uid() = user_id);
