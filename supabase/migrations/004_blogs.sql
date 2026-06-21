-- supabase/migrations/004_blogs.sql
-- Create Blogs / User Experiences table

CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    place_name TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow anyone to view blog posts
CREATE POLICY "Blogs are viewable by everyone" ON public.blogs
    FOR SELECT USING (true);

-- Insert policy: Allow anyone (registered or guest) to write a blog post
CREATE POLICY "Anyone can insert blogs" ON public.blogs
    FOR INSERT WITH CHECK (true);
