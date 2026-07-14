-- Migrate all 'member' roles to 'employee' (idempotent)
-- This runs after 0023a_add_employee_enum_value.sql has committed the enum change.
-- Safe to re-run: only affects rows that still have role='member'.
UPDATE users
SET role = 'employee'::user_role
WHERE role = 'member'::user_role;
