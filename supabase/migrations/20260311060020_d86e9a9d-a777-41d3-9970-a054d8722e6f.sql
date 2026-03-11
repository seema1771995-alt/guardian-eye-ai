
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT NOT NULL,
  camera_id TEXT NOT NULL,
  camera_name TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'safe',
  description TEXT NOT NULL,
  risk_level TEXT,
  persons_detected INTEGER DEFAULT 0,
  alert_type TEXT,
  video_filename TEXT,
  frame_index INTEGER,
  frame_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read incidents" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert incidents" ON public.incidents FOR INSERT WITH CHECK (true);

CREATE TABLE public.frame_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  video_filename TEXT NOT NULL,
  frame_index INTEGER NOT NULL,
  persons_detected INTEGER DEFAULT 0,
  behaviors JSONB DEFAULT '[]'::jsonb,
  overall_status TEXT NOT NULL DEFAULT 'safe',
  risk_level TEXT NOT NULL DEFAULT 'LOW',
  alert_type TEXT,
  summary TEXT NOT NULL,
  frame_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.frame_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read frame_analyses" ON public.frame_analyses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert frame_analyses" ON public.frame_analyses FOR INSERT WITH CHECK (true);
