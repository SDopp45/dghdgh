-- Add new columns to visits table
ALTER TABLE "visits" 
ADD COLUMN IF NOT EXISTS "agent_id" integer REFERENCES "users"("id"),
ADD COLUMN IF NOT EXISTS "source" text CHECK (source IN ('website', 'agency', 'partner', 'manual')) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS "documents" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "reminder_sent" boolean DEFAULT false;

-- Set default values for existing records
UPDATE "visits"
SET "source" = 'manual',
    "documents" = '[]'::jsonb,
    "reminder_sent" = false
WHERE "source" IS NULL 
   OR "documents" IS NULL 
   OR "reminder_sent" IS NULL;
