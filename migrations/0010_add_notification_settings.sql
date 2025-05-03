-- Migration: 0010_add_notification_settings.sql
-- Generated at: 2023-11-28T14:00:00
-- Description: add_notification_settings

-- Create user_notification_settings table
CREATE TABLE IF NOT EXISTS "user_notification_settings" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL CHECK ("type" IN ('payment', 'maintenance', 'lease', 'visit')),
  "channel" TEXT NOT NULL CHECK ("channel" IN ('app', 'email', 'both')) DEFAULT 'both',
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "frequency" TEXT NOT NULL CHECK ("frequency" IN ('immediate', 'daily', 'weekly')) DEFAULT 'immediate',
  "importance" TEXT NOT NULL CHECK ("importance" IN ('all', 'high', 'medium', 'none')) DEFAULT 'all',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_notification_settings_user_id ON user_notification_settings(user_id);
CREATE INDEX idx_user_notification_settings_type ON user_notification_settings(type);

-- Add comment for the table
COMMENT ON TABLE "user_notification_settings" IS 'Stores user preferences for notification deliveries';

-- Add initial settings for existing users
INSERT INTO "user_notification_settings" ("user_id", "type")
SELECT "id", 'payment' FROM "users";

INSERT INTO "user_notification_settings" ("user_id", "type")
SELECT "id", 'maintenance' FROM "users";

INSERT INTO "user_notification_settings" ("user_id", "type")
SELECT "id", 'lease' FROM "users";

INSERT INTO "user_notification_settings" ("user_id", "type")
SELECT "id", 'visit' FROM "users"; 