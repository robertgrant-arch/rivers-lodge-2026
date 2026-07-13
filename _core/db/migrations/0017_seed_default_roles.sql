-- Seed roles table with default role definitions
-- Idempotent: uses ON CONFLICT to allow re-running

INSERT INTO roles (key, label, sort_order, created_at, updated_at)
VALUES
  ('admin', 'Admin', 0, NOW(), NOW()),
  ('employee', 'Employee', 1, NOW(), NOW()),
  ('designated', 'Designated', 2, NOW(), NOW()),
  ('silver', 'Silver', 3, NOW(), NOW()),
  ('social', 'Social', 4, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
