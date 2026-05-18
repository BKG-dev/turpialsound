-- Add slug column to referral links for direct listing redirect
ALTER TABLE mp_referral_links ADD COLUMN IF NOT EXISTS slug TEXT NOT NULL DEFAULT '';
