# Guía de Configuración de APIs Externas

## 🎯 Problema: yt-dlp no funciona en Edge Functions

**Por qué NO podemos usar yt-dlp directamente:**
- Supabase Edge Functions corren en **Deno Deploy** (runtime JavaScript/TypeScript)
- `yt-dlp` es un **binario de Python** que requiere instalación del sistema
- Edge Functions **no permiten ejecutar binarios externos**

## ✅ Solución: RapidAPI

Para extraer videos automáticamente de TikTok, Instagram y YouTube, usamos **RapidAPI** que proporciona servicios equivalentes a yt-dlp.

### 📋 Paso 1: Crear cuenta en RapidAPI

1. Ve a [RapidAPI](https://rapidapi.com/)
2. Crea una cuenta gratuita
3. Busca y suscríbete a estas APIs (tienen plan gratuito):
   - **TikTok Downloader** - [Ver API](https://rapidapi.com/yi005/api/tiktok-downloader-download-tiktok-videos-without-watermark)
   - **Instagram Scraper API** - [Ver API](https://rapidapi.com/social-api1-instagram/api/instagram-scraper-api2)
   - **YouTube MP3** - [Ver API](https://rapidapi.com/ytjar/api/youtube-mp36)

### 📋 Paso 2: Obtener tu API Key

1. Una vez suscrito a las APIs, ve a tu [Dashboard de RapidAPI](https://rapidapi.com/developer/dashboard)
2. Copia tu **X-RapidAPI-Key**
3. Guárdala de forma segura

### 📋 Paso 3: Configurar en Supabase

#### Opción A: Usando Lovable (Recomendado)
```
Dile a Lovable: "Agrega un secreto llamado RAPIDAPI_KEY"
```
Lovable te mostrará un botón para agregar el secreto de forma segura.

#### Opción B: Manualmente en Supabase
1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a: **Settings → Edge Functions → Secrets**
3. Agrega un nuevo secreto:
   - **Name**: `RAPIDAPI_KEY`
   - **Value**: Tu API key de RapidAPI

### 🧪 Paso 4: Probar

Una vez configurado, prueba pegando un link de:
- ✅ TikTok: `https://www.tiktok.com/@user/video/123456789`
- ✅ Instagram: `https://www.instagram.com/reel/ABC123/`
- ✅ YouTube: `https://www.youtube.com/watch?v=ABC123`

El sistema:
1. Extraerá el audio automáticamente
2. Lo transcribirá con Whisper
3. Mostrará el guión + thumbnail

---

## 🆓 Planes Gratuitos de RapidAPI

Cada API en RapidAPI tiene un plan gratuito con límites:
- **TikTok Downloader**: ~500 requests/mes gratis
- **Instagram Scraper**: ~100 requests/mes gratis
- **YouTube MP3**: ~500 requests/mes gratis

Para más requests, puedes actualizar a un plan de pago.

---

## 🔄 Alternativa: Self-Hosted yt-dlp

Si prefieres usar yt-dlp directamente, necesitas:

1. **Crear un servicio separado** (no edge function) que:
   - Corra en un servidor con Python instalado
   - Ejecute yt-dlp como subprocess
   - Exponga una API REST

2. **Opciones de hosting:**
   - Railway.app
   - Render.com
   - Digital Ocean App Platform
   - AWS Lambda con Python runtime

3. **Arquitectura:**
```
Edge Function → Tu servicio yt-dlp → Whisper
```

Este enfoque es más complejo pero te da control total.

---

## ❓ Preguntas Frecuentes

**P: ¿Por qué no simplemente instalar yt-dlp en el edge function?**
R: Las edge functions de Supabase no permiten instalar paquetes del sistema ni ejecutar binarios.

**P: ¿Hay alguna otra alternativa gratuita?**
R: Puedes usar servicios públicos de descarga (como SnapTik para TikTok) y hacer que los usuarios descarguen el video primero.

**P: ¿Qué pasa si no configuro RAPIDAPI_KEY?**
R: El sistema te mostrará un mensaje indicando que descargues el video manualmente y lo subas.

---

## 📚 Referencias

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [RapidAPI Documentation](https://docs.rapidapi.com/)
- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp)
