-- Add is_required column to membership_questions table
ALTER TABLE membership_questions 
ADD COLUMN is_required BOOLEAN NOT NULL DEFAULT 0;
