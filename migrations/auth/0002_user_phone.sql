-- Customer mobile number, used to link orders to an account.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS user_phone_unique ON "user" (phone) WHERE phone IS NOT NULL;
