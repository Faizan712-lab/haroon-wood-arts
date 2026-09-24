ALTER TABLE users
  MODIFY COLUMN phone VARCHAR(30) NULL;

UPDATE users
SET phone = NULL
WHERE phone LIKE 'google:%'
  AND google_id IS NOT NULL;
