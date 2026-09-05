-- Lets a business pick its own accent color, applied to their kitchen
-- display and business portal instead of everyone sharing the one
-- platform-default red. NULL means "use the platform default."
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS theme_color TEXT;

ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_theme_color_hex;

ALTER TABLE businesses
  ADD CONSTRAINT businesses_theme_color_hex
  CHECK (theme_color IS NULL OR theme_color ~* '^#[0-9a-f]{6}$');

NOTIFY pgrst, 'reload schema';
