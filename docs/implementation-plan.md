## implementation-plan.md

### 🧱 Secuencia de Construcción (microtareas paso a paso)

#### Fase 1: MVP (Dashboard + Flujo básico)

1. ✅ Crear proyecto Vite + Tailwind + shadcn/ui
2. ✅ Implementar login y registro (email/password)
3. ✅ Configurar base de datos con modelos: User, Brand, Clip, Project, Variant
4. ✅ Crear pantalla de Dashboard con CTA: “Pega tu link”
5. ✅ Al pegar link:
   - Extraer metadatos (nombre, duración)
   - Lanzar pipeline: transcribir → analizar → crear estructura
6. ✅ Agregar loading state con mensaje: “Detectando estructura mágica…”
7. ✅ Mostrar “Mis Marcas” con clips organizados por slot
8. ✅ Implementar estructura fija de slots: Hook → Problema → Prueba social → Demo → CTA
9. ✅ Montar B-roll Library con tabs por tipo + hover previews
10. ✅ Crear Studio básico:
    - Selector de plantilla
    - Selector de voz
    - Timeline de slots con arrastrar clips
11. ✅ Renderizar variantes (mock al inicio) + mostrar estado en “Resultados”
12. ✅ Permitir descarga de MP4, SRT, JSON desde resultados

---

### 📆 Timeline con Checkpoints

| Semana | Hitos Principales |
|--------|--------------------|
| 1      | Setup técnico + login + modelo de datos |
| 2      | Dashboard funcional + flujo de pegar link |
| 3      | Mis Marcas + B-roll Library básica |
| 4      | Studio MVP + renderizado inicial |
| 5      | Resultados + descargas |
| 6      | QA + soft launch (test cerrado con 3 usuarios) |

---

### 🧑‍💻 Roles y Rituales

- **CTO / Builder:** Fullstack execution
- **PM + UX lead:** Define flujos y copy emocional
- **1 tester externo semanal:** Guerrilla test → log de fricción
- **Rituales clave:**
  - Lunes: Kickoff semanal con 3 tareas clave
  - Miércoles: Checkpoint funcional
  - Viernes: Test emocional de la semana + retrospectiva corta

---

### 🧰 Integraciones Opcionales y Stretch Goals

- 🧠 **Whisper API** para transcripción de voz
- 🎤 **ElevenLabs o Play.ht** para voces realistas
- 📺 **ffmpeg.wasm** para render en el cliente (stretch)
- 🌐 **Google Drive API** para importar clips desde Drive
- 📤 **Meta Ads Export API** para push directo a campañas

---
