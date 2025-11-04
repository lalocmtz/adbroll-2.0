## masterplan.md

### 🎯 Elevator Pitch (30 segundos)

AdBroll convierte tu B-roll sin editar en variantes de anuncios que venden. Ideal para marcas DTC, agencias y creadores en TikTok, AdBroll analiza tu metraje, aplica estructuras ganadoras y te devuelve múltiples anuncios editados con voz, ritmo y copy persuasivo—en minutos.

---

### 🧩 Problema & Misión

- **Problema:** Las marcas tienen toneladas de contenido sin editar que nunca se convierte en anuncios. Editar es lento, caro y requiere saber qué funciona.
- **Misión:** Empoderar a creadores y marketers para escalar campañas sin esfuerzo, usando IA para transformar material existente en anuncios performantes, estructurados y atractivos.

---

### 👥 Público Objetivo

- **Marcas e-commerce:** Con metraje sin usar en Google Drive.
- **Agencias de rendimiento:** Que necesitan muchas variantes por campaña.
- **Creadores/TikTok sellers:** Que quieren escalar sin volver a grabar.

---

### 🧠 Funciones Clave

- 📥 **Dashboard:** Pega un link, inicia el pipeline automático.
- 🎨 **Plantillas:** Estructuras de anuncio probadas con bloques arrastrables.
- 🎞 **Studio:** Editor visual por slots (Hook → CTA).
- 📂 **Mis Marcas:** Organización por clips, colores, identidad visual.
- 📚 **B-roll Library:** Clips clasificados con previews suaves.
- 📈 **Resultados:** Descarga, duplica y gestiona variantes generadas.
- 💡 **Asistente Creativo (IA):** Sugiere estructuras, cambios de orden, tips—siempre en silencio, jamás invasivo.

---

### 🧪 Tech Stack (y por qué)

- **Frontend:** Vite + React + Tailwind + shadcn/ui  
  → Velocidad, componibilidad y estética moderna.
- **Backend:** Lovable Cloud  
  → Infraestructura optimizada para apps centradas en UX emocional.
- **Auth:** Email/password + Google OAuth opcional  
  → Rápido acceso con opción de escalabilidad B2B.

---

### 🗃 Modelo de Datos Conceptual (ERD en palabras)

- **User**
  - `id`, `email`, `role`
- **Brand**
  - `id`, `user_id`, `name`, `color_palette`, `logo_url`
- **Clip**
  - `id`, `brand_id`, `slot_type`, `video_url`, `transcription`
- **Template**
  - `id`, `name`, `slots[]`, `duration_by_block`
- **Project**
  - `id`, `user_id`, `brand_id`, `template_id`, `status`, `voice`, `created_at`
- **Variant**
  - `id`, `project_id`, `video_url`, `srt_url`, `json_url`, `status`

---

### 🖼 Principios de Diseño de UI

Inspirado por las reglas de Krug y Lovable:

- **No me hagas pensar:** Microcopy directo y acciones claras (“Pega tu link”).
- **Espacios generosos:** Evocan calma y orden visual.
- **Interacciones suaves:** `ease-in-out`, `spring`, y feedback sutil (toasts, hover).
- **Claridad emocional:** Tipografía, ritmo y color alineados con propósito y tono.
- **Estructura modular:** Plantillas como bloques de construcción, fáciles de entender.

---

### 🔐 Seguridad & Compliance

- Almacenamiento privado por usuario
- Accesos compartidos (futuros) con permisos de lectura
- Descargas firmadas por tiempo limitado
- Cumplimiento básico de GDPR desde MVP
- IA solo procesa contenido del usuario; sin entrenamiento cruzado

---

### 🗺 Roadmap por Fases

#### ✅ MVP
- Dashboard funcional (pegar link, flujo IA)
- Mis Marcas + B-roll Library básica
- Plantillas predefinidas sin editor visual
- Studio simple (arrastrar clips → render)
- Resultados descargables

#### 🚀 V1
- Editor visual de plantillas
- Organización avanzada de clips
- IA contextual silenciosa (sugerencias al editar)
- Onboarding de marca vía URL scrape

#### 🌱 V2
- Colaboración multiusuario
- Análisis de rendimiento de variantes
- Exportación directa a Meta/TikTok Ads
- IA adaptativa basada en rendimiento real

---

### ⚠️ Riesgos y Mitigaciones

- **Riesgo:** Saturación de herramientas AI →  
  **Mitigación:** Diferenciar por claridad emocional + enfoque B-roll.
- **Riesgo:** Calidad inconsistente en generación de videos →  
  **Mitigación:** Curaduría de plantillas y bloqueos por estructura.
- **Riesgo:** Latencia en renderizado →  
  **Mitigación:** Priorizar colas y feedback visual en tiempo real.

---

### 🔮 Ideas Futuras

- Reentrenamiento de IA con datos propios del usuario (privado)
- Plugin Chrome: convertir clips desde Drive o TikTok en 1 clic
- Integración con plataformas UGC para sourcing automático
- Auto-test A/B dentro de Ads Manager conectado

---
