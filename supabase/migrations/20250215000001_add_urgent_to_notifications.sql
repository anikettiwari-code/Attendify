-- Add is_urgent column to notifications table
ALTER TABLE public.notifications ADD COLUMN is_urgent BOOLEAN DEFAULT false;
