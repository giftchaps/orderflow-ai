-- ============================================================
-- Staff email integrity guards
-- 1) Remove duplicate staff rows per business/email
-- 2) Enforce normalized, case-insensitive uniqueness by business
-- 3) Prevent duplicate user_id entries within the same business
-- ============================================================

-- Normalize existing email values before deduping
UPDATE businesses_staff
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email));

-- Keep the best row per (business_id, normalized email)
-- Priority: super admin first, then owner > manager > staff, then newest row
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY business_id, lower(trim(email))
      ORDER BY
        is_super_admin DESC,
        CASE role
          WHEN 'owner' THEN 3
          WHEN 'manager' THEN 2
          ELSE 1
        END DESC,
        created_at DESC,
        id DESC
    ) AS rn
  FROM businesses_staff
  WHERE email IS NOT NULL
)
DELETE FROM businesses_staff bs
USING ranked r
WHERE bs.id = r.id
  AND r.rn > 1;

-- Add expression unique index for case-insensitive email uniqueness per business
CREATE UNIQUE INDEX IF NOT EXISTS uniq_businesses_staff_business_email_ci
  ON businesses_staff (business_id, lower(trim(email)))
  WHERE email IS NOT NULL;

-- Add uniqueness for linked users per business
CREATE UNIQUE INDEX IF NOT EXISTS uniq_businesses_staff_business_user
  ON businesses_staff (business_id, user_id)
  WHERE user_id IS NOT NULL;

-- Trigger to normalize email on insert/update
CREATE OR REPLACE FUNCTION normalize_businesses_staff_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_businesses_staff_email ON businesses_staff;

CREATE TRIGGER trg_normalize_businesses_staff_email
BEFORE INSERT OR UPDATE OF email ON businesses_staff
FOR EACH ROW
EXECUTE FUNCTION normalize_businesses_staff_email();
