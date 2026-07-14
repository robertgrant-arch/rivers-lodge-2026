-- Create employees table and employee_skill_groups join table
-- Employees have skill groups (Admin, Employee) for role-based access
-- This is separate from members which have membership types (Designated, Silver, Social)

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS employees_user_id_idx ON employees(user_id);
CREATE INDEX IF NOT EXISTS employees_email_idx ON employees(email);
CREATE INDEX IF NOT EXISTS employees_active_idx ON employees(active);

-- Create employee_skill_groups join table
CREATE TABLE IF NOT EXISTS employee_skill_groups (
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_group_id INTEGER NOT NULL REFERENCES skill_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (employee_id, skill_group_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS esg_employee_idx ON employee_skill_groups(employee_id);
CREATE INDEX IF NOT EXISTS esg_skill_group_idx ON employee_skill_groups(skill_group_id);
