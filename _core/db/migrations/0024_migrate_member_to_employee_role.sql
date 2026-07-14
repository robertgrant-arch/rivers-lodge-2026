-- Migrate legacy 'member' role to 'employee' for staff users (idempotent)
-- Only updates rows that have 'member' role and exist in employees table
UPDATE users
SET role = 'employee'
WHERE role = 'member'
  AND id IN (SELECT user_id FROM employees WHERE active = true);
