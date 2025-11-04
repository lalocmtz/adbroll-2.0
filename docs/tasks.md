# 📋 AdBroll — Tasks & Implementation Guide

> **Source of Truth** for feature implementation order, backend specs, and code snippets.

---

## 🎯 Core Product Logic

**The platform requires TWO things before generating ads:**
1. ✅ Brand created (context: product, promise, avatar, benefits, objections)
2. ✅ B-roll uploaded and organized (folders like frame.io)

**Flow:** Brand → B-roll → Paste viral link → AI extracts → Generate variants → Approve script → Render → Download

---

## 📊 Database Schema Updates Needed

### 1. B-roll Files Table

```sql
-- Create broll_files table for organizing video clips
CREATE TABLE public.broll_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  folder TEXT NOT NULL DEFAULT 'General', -- frame.io style folders
  name TEXT NOT NULL,
  duration INTEGER, -- in seconds
  file_size BIGINT, -- in bytes
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.broll_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own broll"
  ON public.broll_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own broll"
  ON public.broll_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own broll"
  ON public.broll_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own broll"
  ON public.broll_files FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_broll_files_updated_at
  BEFORE UPDATE ON public.broll_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_broll_files_user_id ON public.broll_files(user_id);
CREATE INDEX idx_broll_files_brand_id ON public.broll_files(brand_id);
CREATE INDEX idx_broll_files_folder ON public.broll_files(folder);
```

### 2. Video Analysis Results Table

```sql
-- Store extracted structure from viral videos
CREATE TABLE public.video_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL, -- Original TikTok/Reel URL
  transcription TEXT,
  structure JSONB NOT NULL, -- {sections: [{type: 'hook', text: '...', start: 0, end: 3}]}
  metadata JSONB DEFAULT '{}', -- Duration, format, etc.
  status TEXT DEFAULT 'processing', -- processing, completed, failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.video_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own analyses"
  ON public.video_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create analyses"
  ON public.video_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_video_analyses_user_id ON public.video_analyses(user_id);
CREATE INDEX idx_video_analyses_status ON public.video_analyses(status);
```

### 3. Update Projects Table

```sql
-- Add analysis reference to projects
ALTER TABLE public.projects
ADD COLUMN analysis_id UUID REFERENCES public.video_analyses(id) ON DELETE SET NULL,
ADD COLUMN script_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN generated_script TEXT;
```

### 4. Storage Buckets

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('broll', 'broll', false),
  ('renders', 'renders', false);

-- RLS for broll bucket
CREATE POLICY "Users can upload own broll"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'broll' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own broll"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'broll' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own broll"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'broll' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS for renders bucket
CREATE POLICY "Users can view own renders"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'renders' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 🏗️ Phase 1: Foundation & Onboarding

### Task 1.1: Authentication System
**Priority:** HIGH  
**Status:** ⏳ Not Started

#### Subtasks:
- [ ] Implement auth pages (login/signup) at `/auth`
- [ ] Add email/password signup flow
- [ ] Implement `supabase.auth.onAuthStateChange` listener
- [ ] Create protected route wrapper for authenticated pages
- [ ] Add logout functionality to Layout component
- [ ] Redirect logged-in users from `/` to `/dashboard`

#### Code Snippets:

```tsx
// src/hooks/useAuth.tsx
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
```

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
}
```

---

### Task 1.2: Brand Creation Flow
**Priority:** HIGH  
**Status:** ⏳ Not Started

#### Subtasks:
- [ ] Create brand form component with fields from screenshot
- [ ] Implement brand creation mutation
- [ ] Add brand selection in dashboard
- [ ] Create brand context/state management
- [ ] Force brand creation on first login (onboarding)

#### Fields Required:
```typescript
interface BrandForm {
  name: string;
  website_url?: string;
  logo_url?: string;
  
  // Core context for AI
  product_description: string; // "¿Qué vendes?"
  main_promise: string; // "Promesa principal"
  ideal_customer: string; // "Cliente ideal"
  main_benefit: string; // "Beneficio clave"
  main_objection: string; // "Objeción principal"
  tone_of_voice: string; // "Tono de voz" (e.g., "Confiable y juvenil")
  
  color_palette?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}
```

#### SQL Update:
```sql
-- Add AI context fields to brands table
ALTER TABLE public.brands
ADD COLUMN product_description TEXT,
ADD COLUMN main_promise TEXT,
ADD COLUMN main_benefit TEXT,
ADD COLUMN ideal_customer TEXT,
ADD COLUMN main_objection TEXT,
ADD COLUMN tone_of_voice TEXT DEFAULT 'professional';
```

#### Component Reference:
```tsx
// src/components/brands/BrandForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const brandSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  product_description: z.string().min(10, 'Describe tu producto'),
  main_promise: z.string().min(10, 'Promesa principal requerida'),
  ideal_customer: z.string().min(10, 'Describe tu cliente ideal'),
  main_benefit: z.string().min(10, 'Beneficio clave requerido'),
  main_objection: z.string().min(10, 'Objeción principal requerida'),
  tone_of_voice: z.string().default('professional'),
});

// Form implementation with shadcn/ui components
```

---

### Task 1.3: B-roll Library (Frame.io Style)
**Priority:** HIGH  
**Status:** ⏳ Not Started

#### Subtasks:
- [ ] Create broll_files table (see SQL above)
- [ ] Implement file upload with Supabase Storage
- [ ] Create folder management UI (create, rename, delete folders)
- [ ] Add drag & drop for file organization
- [ ] Generate thumbnails for videos
- [ ] Add video preview modal
- [ ] Implement bulk operations (move, delete)

#### Component Structure:
```tsx
// src/pages/Broll.tsx - Enhanced version
- FolderSidebar (create, select folders)
- FileGrid (thumbnails with hover preview)
- UploadZone (drag & drop area)
- VideoPreviewModal (full preview + metadata)
```

#### Upload Logic:
```typescript
// src/hooks/useBrollUpload.ts
export async function uploadBrollFile(
  file: File,
  userId: string,
  brandId: string,
  folder: string
) {
  // 1. Upload to storage: broll/{userId}/{folder}/{filename}
  const filePath = `${userId}/${folder}/${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('broll')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // 2. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('broll')
    .getPublicUrl(filePath);

  // 3. Create database record
  const { data, error } = await supabase
    .from('broll_files')
    .insert({
      user_id: userId,
      brand_id: brandId,
      file_url: publicUrl,
      folder,
      name: file.name,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  return data;
}
```

---

## 🎬 Phase 2: Video Analysis Pipeline

### Task 2.1: Video Link Ingestion
**Priority:** HIGH  
**Status:** ⏳ Not Started

#### Subtasks:
- [ ] Create "Pegar tu link" UI in Dashboard
- [ ] Validate URL (TikTok, Instagram Reels, YouTube Shorts)
- [ ] Extract video ID from URL
- [ ] Create edge function: `analyze-video`
- [ ] Store analysis in video_analyses table

#### Edge Function Spec:
```typescript
// supabase/functions/analyze-video/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface AnalyzeRequest {
  video_url: string;
  brand_id: string;
  user_id: string;
}

/**
 * Flow:
 * 1. Download video temporarily (or extract audio only)
 * 2. Transcribe with Whisper API / AssemblyAI
 * 3. Send transcription + brand context to GPT-4
 * 4. GPT-4 returns structured JSON with sections
 * 5. Store in video_analyses table
 * 6. Return analysis_id
 */

serve(async (req) => {
  const { video_url, brand_id, user_id } = await req.json();
  
  // Step 1: Extract audio from video URL
  // Use: https://github.com/yt-dlp/yt-dlp (via API service)
  
  // Step 2: Transcribe with Whisper API
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  const transcription = await transcribeAudio(audioUrl, OPENAI_API_KEY);
  
  // Step 3: Analyze structure with GPT-4
  const structure = await analyzeStructure(transcription, brandContext);
  
  // Step 4: Save to database
  const { data } = await supabase
    .from('video_analyses')
    .insert({
      user_id,
      brand_id,
      source_url: video_url,
      transcription,
      structure,
      status: 'completed'
    })
    .select()
    .single();
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

#### GPT-4 Prompt Template:
```typescript
const ANALYSIS_PROMPT = `
Eres un experto en análisis de anuncios de video.

CONTEXTO DE LA MARCA:
- Producto: {{product_description}}
- Promesa: {{main_promise}}
- Cliente ideal: {{ideal_customer}}
- Beneficio: {{main_benefit}}
- Objeción: {{main_objection}}
- Tono: {{tone_of_voice}}

TRANSCRIPCIÓN DEL VIDEO:
{{transcription}}

TAREA:
Analiza este video y extrae su estructura en formato JSON:

{
  "duration": 30,
  "hook": {
    "text": "...",
    "start_time": 0,
    "end_time": 3,
    "type": "curiosity" // curiosity, problem, stat, question
  },
  "sections": [
    {
      "type": "problema",
      "text": "...",
      "start_time": 3,
      "end_time": 8
    },
    {
      "type": "solucion",
      "text": "...",
      "start_time": 8,
      "end_time": 15
    },
    {
      "type": "prueba_social",
      "text": "...",
      "start_time": 15,
      "end_time": 20
    },
    {
      "type": "cta",
      "text": "...",
      "start_time": 20,
      "end_time": 30
    }
  ],
  "key_phrases": ["frase ganadora 1", "frase ganadora 2"],
  "visual_notes": "Qué elementos visuales se usan (texto en pantalla, producto, persona, etc.)"
}

Responde SOLO con el JSON, sin explicaciones.
`;
```

---

### Task 2.2: Script Generation & Approval
**Priority:** HIGH  
**Status:** ⏳ Not Started

#### Subtasks:
- [ ] Create script generation edge function
- [ ] Generate 3 variants with different hooks/CTAs
- [ ] Create UI to show generated scripts side-by-side
- [ ] Allow editing before approval
- [ ] Save approved script to projects table

#### Edge Function:
```typescript
// supabase/functions/generate-script/index.ts

/**
 * Input: analysis_id, brand_id
 * Output: 3 script variants
 * 
 * Uses:
 * - GPT-4 to rewrite sections with brand context
 * - Maintains original structure timing
 * - Generates 3 different hooks and CTAs
 */

const SCRIPT_GENERATION_PROMPT = `
ESTRUCTURA ORIGINAL:
{{original_structure}}

CONTEXTO DE MARCA:
{{brand_context}}

TAREA:
Genera 3 variantes de guion manteniendo la estructura temporal pero adaptando el copy para esta marca.

Variante 1: Hook de curiosidad + CTA directo
Variante 2: Hook de problema + CTA con oferta
Variante 3: Hook de estadística + CTA con urgencia

Formato JSON:
[
  {
    "variant_name": "Curiosidad + Directo",
    "sections": [
      {"type": "hook", "text": "...", "duration": 3},
      {"type": "problema", "text": "...", "duration": 5},
      ...
    ]
  },
  ...
]
`;
```

#### UI Component:
```tsx
// src/components/studio/ScriptApproval.tsx
- Display 3 variants in cards
- Editable text fields
- "Aprobar y Generar" button
- Shows: estimated duration, # of clips needed, credit cost
```

---

## 🎥 Phase 3: Variant Assembly

### Task 3.1: AI Clip Assignment
**Priority:** MEDIUM  
**Status:** ⏳ Not Started

#### Subtasks:
- [ ] Create edge function to match B-roll to script sections
- [ ] Use GPT-4 Vision to analyze clip content
- [ ] Suggest best clips for each section
- [ ] Allow manual override/reorder in UI

#### Logic:
```typescript
// Edge function: assign-clips
/**
 * For each script section:
 * 1. Load user's B-roll from that brand
 * 2. Send clip metadata + thumbnails to GPT-4
 * 3. GPT-4 suggests best matches
 * 4. Return clip assignments
 */

interface ClipAssignment {
  section_type: 'hook' | 'problema' | 'cta';
  section_text: string;
  duration: number;
  suggested_clips: {
    clip_id: string;
    confidence: number;
    reason: string;
  }[];
}
```

---

### Task 3.2: Voice Generation (ElevenLabs)
**Priority:** HIGH  
**Status:** ⏳ Not Started

#### Subtasks:
- [ ] Add ELEVENLABS_API_KEY secret
- [ ] Create edge function: `generate-voiceover`
- [ ] Store generated audio in storage
- [ ] Add voice selection UI (choose from ElevenLabs voices)

#### Edge Function:
```typescript
// supabase/functions/generate-voiceover/index.ts
import { ElevenLabsClient } from 'elevenlabs';

const ELEVEN_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
const client = new ElevenLabsClient({ apiKey: ELEVEN_API_KEY });

async function generateVoiceover(script: string, voiceId: string) {
  const audio = await client.generate({
    voice: voiceId, // e.g., "EXAVITQu4vr4xnSDxMaL" (Sarah)
    text: script,
    model_id: "eleven_multilingual_v2",
  });

  // Convert to buffer and upload to storage
  const audioBuffer = await audio.arrayBuffer();
  
  const filePath = `voiceovers/${crypto.randomUUID()}.mp3`;
  await supabase.storage
    .from('renders')
    .upload(filePath, audioBuffer, {
      contentType: 'audio/mpeg'
    });

  return filePath;
}
```

**Default Voices:**
```typescript
export const ELEVENLABS_VOICES = {
  'Sarah': 'EXAVITQu4vr4xnSDxMaL', // Female, friendly
  'Laura': 'FGY2WhTYpPnrIDTdsKH5', // Female, professional
  'Charlie': 'IKne3meq5aSn9XLyUdCD', // Male, warm
  'George': 'JBFqnCBsd6RMkjVDRZzb', // Male, authoritative
};
```

---

### Task 3.3: Video Rendering Pipeline
**Priority:** HIGH  
**Status:** ⏳ Not Started

#### Subtasks:
- [ ] Create edge function: `render-variant`
- [ ] Use FFmpeg to assemble: clips + voiceover + subtitles
- [ ] Generate SRT file from script timing
- [ ] Burn subtitles into video (TikTok style)
- [ ] Upload final render to storage
- [ ] Update variants table with video_url

#### Rendering Logic:
```typescript
// supabase/functions/render-variant/index.ts

/**
 * Flow:
 * 1. Download assigned clips from storage
 * 2. Download voiceover audio
 * 3. Generate SRT from script sections with timing
 * 4. Concat clips with FFmpeg
 * 5. Overlay voiceover
 * 6. Burn subtitles with TikTok-style formatting
 * 7. Upload to storage.renders
 * 8. Update variants.video_url
 */

// FFmpeg command structure:
const ffmpegCommand = `
ffmpeg -i clip1.mp4 -i clip2.mp4 -i voiceover.mp3 -i subtitles.srt
  -filter_complex "
    [0:v][1:v]concat=n=2:v=1:a=0[outv];
    [outv]subtitles=subtitles.srt:force_style='
      FontName=Inter,FontSize=24,PrimaryColour=&HFFFFFF,
      OutlineColour=&H000000,BorderStyle=3,Outline=2,
      Shadow=0,Alignment=2,MarginV=50'
    [finalv]
  "
  -map [finalv] -map 2:a -c:v libx264 -c:a aac output.mp4
`;
```

#### SRT Generation:
```typescript
function generateSRT(sections: ScriptSection[]): string {
  let srt = '';
  let index = 1;
  
  for (const section of sections) {
    const startTime = formatSRTTime(section.start_time);
    const endTime = formatSRTTime(section.end_time);
    
    srt += `${index}\n`;
    srt += `${startTime} --> ${endTime}\n`;
    srt += `${section.text}\n\n`;
    index++;
  }
  
  return srt;
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
}
```

---

## 💳 Phase 4: Billing & Credits

### Task 4.1: Stripe Integration
**Priority:** MEDIUM  
**Status:** ⏳ Not Started

#### Subtasks:
- [ ] Enable Stripe integration in Lovable
- [ ] Create pricing plans table
- [ ] Implement credits system
- [ ] Add checkout flow
- [ ] Show credits balance in UI
- [ ] Block actions when credits = 0

#### Credit Costs:
```typescript
export const CREDIT_COSTS = {
  video_analysis: 1, // Analyze 1 video = 1 credit
  variant_generation: 3, // Generate 1 variant = 3 credits
  per_minute_broll: 0.5, // Storage per minute of B-roll
};
```

#### Pricing Plans:
```typescript
export const PLANS = {
  starter: {
    name: 'Starter',
    price: 29,
    credits: 50,
    features: ['10 videos/mes', '30 variantes', 'Voces IA básicas'],
  },
  growth: {
    name: 'Growth',
    price: 99,
    credits: 200,
    features: ['50 videos/mes', '150 variantes', 'Voces premium', 'Soporte prioritario'],
    popular: true,
  },
  scale: {
    name: 'Scale',
    price: 299,
    credits: 1000,
    features: ['Ilimitado', 'API access', 'White-label', 'Account manager'],
  },
};
```

---

## 🎨 Phase 5: UI Polish & UX

### Task 5.1: Loading States & Animations
- [ ] Add skeleton loaders for all async operations
- [ ] Implement progress indicators for video processing
- [ ] Add spring animations for drag & drop
- [ ] Toast notifications with microcopy

### Task 5.2: Onboarding Flow
- [ ] Force brand creation on first login
- [ ] Show B-roll upload tutorial
- [ ] Add tooltips for complex features
- [ ] Create demo video

### Task 5.3: Error Handling
- [ ] Graceful errors for failed transcriptions
- [ ] Retry logic for rendering failures
- [ ] User-friendly error messages
- [ ] Error reporting to admin

---

## 🔧 Required Secrets

Add these via Lovable secrets tool:

```
OPENAI_API_KEY          # For GPT-4 and Whisper
ELEVENLABS_API_KEY      # For voice generation
ASSEMBLYAI_API_KEY      # Alternative for transcription (optional)
```

---

## 📚 External Dependencies

```json
{
  "elevenlabs": "^0.8.0",
  "openai": "^4.20.0",
  "zod": "^3.22.0",
  "@tanstack/react-query": "^5.0.0"
}
```

---

## ✅ Definition of Done (MVP)

A user can:
- ✅ Create a brand with full context
- ✅ Upload and organize B-roll in folders
- ✅ Paste a TikTok/Reel link
- ✅ AI extracts structure and generates 3 script variants
- ✅ User approves/edits script
- ✅ System renders video with AI voice + subtitles + assigned clips
- ✅ User downloads final MP4
- ✅ Stripe billing with credits system works

---

## 🚀 Launch Checklist

- [ ] All RLS policies tested
- [ ] Error handling for all edge functions
- [ ] Rate limiting on API calls
- [ ] Credit deduction working correctly
- [ ] Email notifications for completed renders
- [ ] Analytics tracking (video generated, credits used)
- [ ] Terms of service + Privacy policy pages
- [ ] Demo video for landing page

---

**Next Steps:** Start with Phase 1, Task 1.1 (Authentication) → 1.2 (Brand Creation) → 1.3 (B-roll Library)
