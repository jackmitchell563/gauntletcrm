-- Drop the not null constraint from user_id
ALTER TABLE satisfaction_ratings
ALTER COLUMN user_id DROP NOT NULL; 