# 🎬 Implementación de Extracción Automática de Videos

## 📋 Resumen

Se implementó un sistema completo de extracción automática de audio y transcripción desde links públicos de redes sociales.

---

## ✅ Lo que se implementó

### 1. **Edge Function: `extract-audio-from-link`**

**Ubicación:** `supabase/functions/extract-audio-from-link/index.ts`

**Funcionalidad:**
- ✅ Detecta automáticamente la plataforma (TikTok, Instagram, YouTube, Facebook)
- ✅ Extrae el audio del video usando APIs de terceros (RapidAPI)
- ✅ Obtiene el thumbnail del video
- ✅ Transcribe el audio con OpenAI Whisper
- ✅ Guarda el resultado en la base de datos

**Plataformas soportadas:**
- 🎵 **TikTok** - Usando RapidAPI TikTok Downloader
- 📸 **Instagram** - Usando RapidAPI Instagram Scraper
- 📺 **YouTube** - Usando RapidAPI YouTube MP3 Converter
- 📱 **Facebook** - Pendiente de implementar

### 2. **Componente UI: `VideoLinkInput`**

**Ubicación:** `src/components/dashboard/VideoLinkInput.tsx`

**Funcionalidad:**
- ✅ Campo de entrada para pegar links
- ✅ Validación de URLs de plataformas soportadas
- ✅ Mensaje informativo sobre requisitos de RapidAPI
- ✅ Loading states durante el proceso
- ✅ Manejo de errores amigable

### 3. **Documentación**

**Guía de configuración:** `docs/api-setup-guide.md`
- ✅ Explicación de por qué no se puede usar yt-dlp directamente
- ✅ Instrucciones paso a paso para configurar RapidAPI
- ✅ Links a las APIs necesarias
- ✅ Alternativas self-hosted

---

## ⚠️ Limitación Técnica Importante

### **yt-dlp NO funciona en Supabase Edge Functions**

**¿Por qué?**
```
Supabase Edge Functions (Deno Deploy)
  ├─ Solo ejecuta JavaScript/TypeScript
  ├─ No permite instalar paquetes del sistema
  └─ No puede ejecutar binarios como yt-dlp (Python)
```

**Solución implementada:**
```
RapidAPI (equivalente a yt-dlp como servicio)
  ├─ TikTok Downloader API
  ├─ Instagram Scraper API
  └─ YouTube MP3 API
```

---

## 🔧 Configuración Requerida

### Paso 1: Configurar RapidAPI

1. **Crear cuenta en RapidAPI:**
   - Ve a https://rapidapi.com/
   - Regístrate gratis

2. **Suscribirte a las APIs necesarias:**
   
   **Para TikTok:**
   - API: [TikTok Downloader](https://rapidapi.com/yi005/api/tiktok-downloader-download-tiktok-videos-without-watermark)
   - Plan: Gratuito (~500 requests/mes)
   
   **Para Instagram:**
   - API: [Instagram Scraper API](https://rapidapi.com/social-api1-instagram/api/instagram-scraper-api2)
   - Plan: Gratuito (~100 requests/mes)
   
   **Para YouTube:**
   - API: [YouTube MP3](https://rapidapi.com/ytjar/api/youtube-mp36)
   - Plan: Gratuito (~500 requests/mes)

3. **Obtener tu API Key:**
   - Ve a tu [Dashboard](https://rapidapi.com/developer/dashboard)
   - Copia tu `X-RapidAPI-Key`

### Paso 2: Configurar en Supabase

**Opción A: Usando Lovable AI** ⭐ (Recomendado)
```
Pídele a Lovable: "Agrega el secreto RAPIDAPI_KEY"
```

**Opción B: Manualmente**
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Tu proyecto → Settings → Edge Functions → Secrets
3. Agrega:
   - **Name:** `RAPIDAPI_KEY`
   - **Value:** [Tu API key de RapidAPI]

---

## 🚀 Cómo Usar

### Desde el Dashboard

1. **Selecciona una marca** en el selector de marcas
2. **Pega un link** de video:
   ```
   https://www.tiktok.com/@user/video/123456789
   https://www.instagram.com/reel/ABC123/
   https://www.youtube.com/watch?v=ABC123
   ```
3. **Haz clic en "Analizar"**
4. **Espera el resultado** (15-30 segundos):
   - ✅ Transcripción completa del guion
   - ✅ Thumbnail del video
   - ✅ Análisis de narrativa estructurada

### Flujo Técnico

```
Usuario pega link
      ↓
Edge Function: extract-audio-from-link
      ↓
  ┌─────────────────────────┐
  │ 1. Detectar plataforma  │
  │ 2. Llamar RapidAPI      │
  │ 3. Obtener audio URL    │
  │ 4. Descargar audio      │
  │ 5. Enviar a Whisper     │
  │ 6. Guardar transcripción│
  └─────────────────────────┘
      ↓
Edge Function: analyze-video
      ↓
  ┌─────────────────────────┐
  │ 1. Leer transcripción   │
  │ 2. Analizar con AI      │
  │ 3. Detectar secciones   │
  │ 4. Guardar estructura   │
  └─────────────────────────┘
      ↓
UI muestra resultado
```

---

## 🧪 Testing

### Test sin RapidAPI configurado

Si no has configurado `RAPIDAPI_KEY`, recibirás un mensaje:

```
❌ Error: Para extraer videos de TikTok automáticamente, 
necesitas configurar RAPIDAPI_KEY.

Alternativa: descarga el video manualmente usando 
SnapTik (snaptik.app) y súbelo.
```

### Test con RapidAPI configurado

```javascript
// Video de prueba
const testUrl = "https://www.tiktok.com/@feelink.tatuajes/video/7568881593432001813";

// Resultado esperado
{
  "success": true,
  "analysis_id": "uuid",
  "transcription": "Adivina cuál de estos tatuajes es falso...",
  "thumbnail_url": "https://...",
  "duration": 15.4
}
```

---

## 📊 Costos

### RapidAPI - Plan Gratuito
- **TikTok Downloader:** 500 requests/mes
- **Instagram Scraper:** 100 requests/mes  
- **YouTube MP3:** 500 requests/mes

### OpenAI Whisper
- **Costo:** ~$0.006 USD por minuto de audio
- **Ejemplo:** 100 videos de 30 segundos = ~$0.30 USD

---

## 🔄 Alternativa: Self-Hosted yt-dlp

Si prefieres usar yt-dlp directamente (más control, sin límites):

### Arquitectura Recomendada

```
Edge Function
      ↓
Tu servidor yt-dlp (Railway, Render, etc.)
      ↓
Whisper API
```

### Pasos:

1. **Crear servicio separado:**
   ```python
   # app.py
   from flask import Flask, request
   import yt_dlp
   
   app = Flask(__name__)
   
   @app.route('/extract', methods=['POST'])
   def extract():
       url = request.json['url']
       # Usar yt-dlp aquí
       return {"audio_url": "..."}
   ```

2. **Desplegar en:**
   - Railway.app (gratis)
   - Render.com (gratis)
   - Fly.io (gratis)

3. **Actualizar edge function** para llamar tu servicio

---

## ❓ FAQ

**P: ¿Por qué no puedo usar yt-dlp directamente?**
R: Edge Functions no soportan binarios externos. Solo JavaScript/TypeScript.

**P: ¿Qué pasa si no configuro RapidAPI?**
R: El sistema te pedirá descargar el video manualmente.

**P: ¿Hay límite de requests en plan gratuito?**
R: Sí, ~100-500 requests/mes por API. Para más, usa plan de pago.

**P: ¿Puedo usar otras APIs?**
R: Sí, puedes modificar `extract-audio-from-link/index.ts` para usar cualquier API.

---

## 🎯 Próximos Pasos

1. ✅ **Configurar RapidAPI** siguiendo la guía
2. ✅ **Probar con un video de prueba**
3. ⏭️ **Escalar:** Si necesitas más volumen, considera self-hosted yt-dlp
4. ⏭️ **Optimizar:** Cachear resultados de videos ya procesados

---

## 📚 Referencias

- [Guía de configuración de APIs](./api-setup-guide.md)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [RapidAPI](https://rapidapi.com/)
- [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text)
- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp)
