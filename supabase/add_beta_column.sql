-- Migration: Add beta column for BWD calculations
ALTER TABLE pmcc_campaigns ADD COLUMN IF NOT EXISTS beta DECIMAL DEFAULT 1.0;

-- Comment for documentation
COMMENT ON COLUMN pmcc_campaigns.beta IS 'Beta weighting value relative to SPY for Greek calculations';
