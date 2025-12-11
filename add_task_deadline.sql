-- Add deadline column to tasks table
-- This migration adds a deadline field to track task due dates

-- Add deadline column (nullable, as it's optional)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS deadline DATE;

-- Add index for deadline for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_deadline 
ON tasks(deadline);

-- Optional: Add comment to describe the column
COMMENT ON COLUMN tasks.deadline IS 'Optional deadline/due date for the task (termin tarihi)';
