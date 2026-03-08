-- Create Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id),
    class_id UUID REFERENCES public.classes(id), -- Optional: target a specific class
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Notifications are viewable by everyone" 
ON public.notifications FOR SELECT USING (true);

CREATE POLICY "Teachers can insert notifications" 
ON public.notifications FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);

CREATE POLICY "Sender can delete own notifications" 
ON public.notifications FOR DELETE USING (auth.uid() = sender_id);
