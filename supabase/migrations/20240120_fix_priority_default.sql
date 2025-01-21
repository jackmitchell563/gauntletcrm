-- Set default value for priority column
ALTER TABLE tickets 
ALTER COLUMN priority SET DEFAULT 'medium';

-- Update any existing NULL priorities to 'medium'
UPDATE tickets 
SET priority = 'medium' 
WHERE priority IS NULL; 