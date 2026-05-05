-- Add display_pin to businesses table for kitchen display PIN gate
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS display_pin TEXT;
