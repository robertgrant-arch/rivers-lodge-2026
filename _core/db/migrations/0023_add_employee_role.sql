-- Convert all 'member' roles to 'employee' (idempotent)
-- The enum now only includes ['admin', 'employee'] - no 'member'
UPDATE users
SET role = 'employee'::user_role
WHERE role = 'member'::user_role;
