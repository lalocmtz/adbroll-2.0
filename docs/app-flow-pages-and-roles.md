## app-flow-pages-and-roles.md

### 🗺️ Mapa del Sitio (Top-Level Pages)

1. **/dashboard** → Panel de inicio con CTA para pegar link
2. **/marcas** → Gestión de marcas y sus clips
3. **/plantillas** → Selección y edición de estructuras de anuncio
4. **/b-roll** → Biblioteca de clips organizados por tipo
5. **/proyectos/:id** → Studio (editor visual por slots)
6. **/resultados** → Historial de variantes renderizadas
7. **/pricing** → Comparativa de planes y CTA de upgrade
8. **/** → Landing page (marketing)

---

### 📄 Propósito de Cada Página

- **Dashboard:** Inicio rápido del flujo → input de video
- **Mis Marcas:** Organizar y acceder a clips por marca
- **Plantillas:** Crear o usar estructuras de anuncio performantes
- **B-roll Library:** Acceder y previsualizar clips por tipo/slot
- **Studio:** Armar variantes en timeline visual + selección de voz
- **Resultados:** Ver, duplicar o descargar variantes generadas
- **Pricing:** Comparar planes; impulsar conversión
- **Landing:** Atraer y convertir nuevos usuarios

---

### 👥 Roles de Usuario y Accesos

| Rol        | Permisos                                                        |
|------------|-----------------------------------------------------------------|
| Invitado   | Ver landing, pricing, registrarse                              |
| Usuario    | Crear marcas, subir clips, generar variantes, descargar        |
| Admin (futuro) | Gestionar usuarios dentro de un equipo, compartir proyectos |

---

### 🔁 User Journeys Principales (máx 3 pasos cada uno)

#### 🧪 Journey 1: Crear primer anuncio
1. Pega link de video en Dashboard  
2. Espera estructura automática (transcripción + slots)  
3. Entra a Studio, elige plantilla y voz → genera variantes

#### 🎨 Journey 2: Crear marca nueva
1. Entra a “Mis Marcas”  
2. Haz clic en “Crear nueva marca” o pega URL para scraping  
3. Sube clips organizados por slot (Hook, CTA, etc.)

#### 🧠 Journey 3: Usar una plantilla inteligente
1. Ve a “Plantillas”  
2. Selecciona o edita una estructura  
3. Aplica al proyecto activo con sugerencias IA silenciosas

---
