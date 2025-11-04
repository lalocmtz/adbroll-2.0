## design-guidelines.md

### 🎨 Tesis Emocional

Se siente como un **estratega creativo en flow**: estructurado, inteligente y cálido. No hay caos, hay guía. El usuario nunca se siente torpe—se siente capaz.

> “Como Linear, pero con sonrisas sutiles.”

---

### ✍️ Tipografía

| Estilo   | Fuente      | Peso  | Tamaño | Uso principal |
|----------|-------------|-------|--------|----------------|
| H1       | Inter       | 800   | 56–64px | Títulos de secciones |
| H2       | Inter       | 700   | 32–40px | Subtítulos y secciones secundarias |
| Body     | Inter       | 400   | 16–18px | Texto principal |
| CTA      | Inter       | 600+  | 16–18px | Botones, acciones |

- Tracking ajustado para claridad.
- Line-height ≥ 1.5x.
- Refleja confianza sin rigidez.

---

### 🌈 Sistema de Color

| Rol       | Color / Valor                                 | Emoción              |
|-----------|-----------------------------------------------|----------------------|
| Primario  | `#000000`                                     | Confianza, claridad  |
| Fondo     | `#FFFFFF`                                     | Neutral, espacio     |
| Texto suave | `#4B5563`                                   | Apoyo sin ruido      |
| Gradiente de impacto | `#6AA6FF → #B79CFF` (linear)       | Creatividad, impulso |
| Estados   | Rendering: `#FBBF24` (amarillo)               | Proceso activo       |
|           | Éxito: `#10B981` (verde)                      | Listo                |
|           | Error: `#EF4444` (rojo)                       | Amable pero claro    |

---

### 📐 Espaciado & Layout

- **Sistema de 8pt grid**.
- **Espacios generosos** en Dashboard y B-roll para evocar calma.
- **Compresión táctica** en Studio para flujo enfocado.
- Layout mobile-first con puntos de quiebre:
  - `sm`: ≥640px
  - `md`: ≥768px
  - `lg`: ≥1024px
- Clústers apretados = foco; aire abierto = exploración.

---

### 🎞 Motion & Interacciones

- **Transiciones:** `ease-in-out`, 200–300ms
- **Drag & drop:** efecto `spring` suave
- **Microinteracciones**:
  - Hover suave en bins de clip (`scale-up`)
  - Pulsación sutil en botones (`opacity + pulse`)
  - Toasts con mensajes empáticos:
    - “¡Detectamos 5 bloques! Ya casi está.”

---

### 🗣 Voz & Tono

**Confianza serena + brillo casual**

Ejemplos:
- Éxito: “Tu video sabe más de ventas que tú.”
- Carga: “Detectando magia en ese link…”
- Sugerencia: “¿Te muestro una estructura que vendió 30k esta semana?”

---

### ♻️ Consistencia de Sistema

- Todas las plantillas siguen el flujo:  
  **Hook → Problema → Prueba social → Demo → Beneficio → CTA**
- Tipografía, microcopy y color mantienen coherencia emocional entre vistas.
- Layouts reusables: misma lógica visual en Dashboard y Resultados.

---

### ♿ Accesibilidad

- Contraste mínimo WCAG AA+: ≥ 4.5:1
- Navegación por teclado completa (especialmente en Studio)
- Roles ARIA en inputs, botones y navegación
- Indicadores de foco visibles

---

### ✅ Emotional Audit Checklist

- ¿Evoca claridad, flow y autoconfianza?
- ¿Las microinteracciones elevan sin distraer?
- ¿El tono apoya, no juzga?
- ¿Permite errores sin castigo? (Siempre “Deshacer”)

---

### 🛠 Technical QA Checklist

- ✅ Escala tipográfica sigue ritmo de 8pt
- ✅ Contraste cumple WCAG AA+
- ✅ Estados interactivos perceptibles y amigables
- ✅ Transiciones entre 200–300ms (excepto efectos cinematográficos)

---

### 🧠 Adaptive System Memory

> ¿Te gustaría mantener el gradiente `#6AA6FF → #B79CFF` como ancla visual para futuras apps o campañas?

(Se sugiere mantener para identidad emocional consistente.)

---

### 🖼 Visual Snapshot

#### 🎨 Paleta de Color

```css
/* Primario */      #000000
/* Fondo */         #FFFFFF
/* Texto suave */   #4B5563
/* Gradiente CTA */ #6AA6FF → #B79CFF
/* Renderizando */  #FBBF24
/* Éxito */         #10B981
/* Error */         #EF4444
