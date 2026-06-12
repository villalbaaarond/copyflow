# copyflow
1. Abrí este archivo, seleccioná TODO desde la línea de abajo que dice "EMPIEZA EL MENSAJE" hasta el final, y copialo.
2. En Claude Code web, con el repositorio copyflow y la rama main elegidos, pegalo en el cuadro de texto.
3. Si la web te deja adjuntar imágenes en el mensaje, adjuntá también tu imagen del diseño (el mockup). Si no te deja, no pasa nada: el mensaje incluye la descripción exacta del diseño.
4. Enviá. Eso es todo.
 
================ EMPIEZA EL MENSAJE (copiá desde acá hasta el final) ================
 
Es posible que este repositorio esté vacío o casi vacío. Tu primera tarea es crear la base del proyecto y después construirlo completo. Trabajá así:
 
## PASO 0 — Crear los archivos de configuración
 
Primero creá el archivo `CLAUDE.md` en la raíz del repositorio con EXACTAMENTE este contenido:
 
```markdown
# CopyFlow — Contexto del proyecto
 
Plataforma para fotocopiadoras escolares: profesores suben cartillas (PDF), la fotocopiadora las aprueba, los estudiantes las reservan y pagan, la fotocopiadora gestiona los pedidos por estados. UNA SOLA web, UNA base de datos, UNA autenticación; lo único que cambia por rol son los permisos y las vistas.
 
## Idioma
Todo en español rioplatense (Argentina): interfaz, mensajes, errores, comentarios de cara al usuario. Voseo ("elegí", "subí", "reservá").
 
## Stack obligatorio
- **Next.js 15** (App Router) + **TypeScript** estricto
- **Tailwind CSS** con los tokens de diseño de este archivo
- **Prisma** + **SQLite** en desarrollo (archivo `dev.db`), preparado para migrar a PostgreSQL solo cambiando el datasource
- Autenticación propia: **argon2** para hashear contraseñas, **JWT de acceso (15 min) + refresh token (7 días)** en cookies `httpOnly` `Secure` `SameSite=Strict`, con rotación de refresh
- Validación con **zod** en TODOS los endpoints (nunca confiar en el cliente)
- **Sin librerías de UI prefabricadas** (no shadcn, no MUI): componentes propios con Tailwind para lograr el look exacto del mockup
 
## Roles y permisos (matriz estricta — verificar en el SERVIDOR, no solo en la UI)
| Acción | admin | empleado | profesor | estudiante |
|---|---|---|---|---|
| Dashboard, estadísticas, reportes | ✓ | ✓ | — | — |
| Ver/avanzar estado de pedidos | ✓ | ✓ | — | — |
| Confirmar pago por transferencia | ✓ | ✓ | — | — |
| Corrección de emergencia de pedidos (retroceder estado, desmarcar pago, quitar comprobante) | ✓ | — | — | — |
| Aprobar/rechazar cartillas | ✓ | ✓ | — | — |
| Editar cartilla + corrección de emergencia de su estado | ✓ | — | ✓ (solo las propias) | — |
| Subir cartillas, ver historial propio | — | — | ✓ | — |
| Gestionar cursos/materias, usuarios, precios, alias, horarios | ✓ | — | — | — |
| Ver auditoría | ✓ | — | — | — |
| Reservar cartillas, ver SOLO sus pedidos | — | — | — | ✓ |
 
Nadie puede cambiar roles desde la aplicación excepto el admin. Cada endpoint rechaza con 403 si el rol no corresponde, aunque la UI nunca muestre el botón.
 
## Flujo central (el proyecto NO está terminado hasta que esto funcione de punta a punta)
Profesor sube cartilla (PDF + curso + materia + páginas + observaciones) → queda "En revisión" → fotocopiadora aprueba → aparece para estudiantes del curso → estudiante reserva eligiendo pago (efectivo: número de pedido + horario de retiro; transferencia: alias + subida de comprobante) → el pedido aparece en la fotocopiadora en "Pendiente" → la fotocopiadora avanza Pendiente → Preparando → Lista para retirar → Entregada → el estudiante ve cada cambio reflejado (revalidación/polling).
 
## Modelo de datos (Prisma)
Usuario(id, nombre, email único, hashContrasena, rol enum, creadoEn) · Curso(id, nombre) · Materia(id, nombre, cursoId) · Cartilla(id, titulo, paginas, observaciones, archivoPdf, estado enum[REVISION, APROBADA, RECHAZADA], profesorId, materiaId, creadoEn) · Pedido(id, numero "P-0001" autoincremental formateado, cartillaId, estudianteId, estado enum[PENDIENTE, PREPARANDO, LISTA, ENTREGADA], metodoPago enum[EFECTIVO, TRANSFERENCIA], pagoConfirmado bool, comprobante string?, precioCongelado int, creadoEn) · Configuracion(precioPorPagina, alias, horario) · Auditoria(id, usuarioId, accion, creadoEn — solo inserción, nunca update/delete).
El precio del pedido se CONGELA al reservar (precioCongelado), para que cambiar el precio por página no altere pedidos existentes.
 
## Seguridad obligatoria
- Argon2id para contraseñas; nunca log de credenciales
- Middleware de autorización por rol en cada route handler
- Rate limiting: 5 intentos de login por IP con espera progresiva; 30 req/min general por usuario
- Subida de archivos: validar magic bytes (%PDF para cartillas; PDF/JPG/PNG para comprobantes), límite 50 MB, regenerar nombre con uuid, guardar fuera de /public, servir mediante endpoint autorizado por rol
- Anti-CSRF: cookies SameSite=Strict + verificación de Origin en mutaciones
- Escapar/sanear todo contenido de usuario (React escapa por defecto: NUNCA usar dangerouslySetInnerHTML con datos de usuario)
- Cabeceras: CSP estricta, X-Content-Type-Options, Referrer-Policy, X-Frame-Options
- Toda acción que modifica datos se registra en Auditoria con usuario, acción descriptiva en español, fecha y hora
 
## Sistema de diseño (replicar el mockup de referencia/mockup.png)
Tokens:
- Fondo `#FAFAFA`, tarjetas `#FFFFFF`, texto `#18181B`, secundario `#52525B`, terciario `#A1A1AA`, bordes `#E4E4E7` y `#EFEFF1`
- Marca índigo `#5B5BD6` (hover `#4A4AC6`, tinte `#EFEFFC`, ring `rgba(91,91,214,.22)`)
- Estados: Pendiente ámbar (`#B45309`/`#FEF6E7`/borde `#F3E2C0`), Preparando azul (`#2563EB`/`#EDF3FE`), Lista verde (`#15803D`/`#EBF7EF`), Entregada gris (`#52525B`/`#F4F4F5`), Rechazada rojo (`#DC2626`/`#FDEEEE`). Chips con punto de color, fondo tintado Y borde tonal.
- Tipografía: Inter variable (tracking -0.025em en títulos, números tabulares en métricas); JetBrains Mono para números de pedido y montos
- Radios 10–14px, sombras en capas suaves (`0 1px 2px rgba(16,17,20,.05)` + difusa), botón primario negro con highlight interior, botón de acento con gradiente índigo vertical
- Iconografía: lucide-react (trazo 2, nunca emojis)
 
Layout según mockup:
- **Escritorio (fotocopiadora/profesor)**: sidebar fija izquierda con logo arriba, navegación con ítem activo en píldora índigo, usuario abajo; área principal con saludo, tarjetas de estadísticas con tendencia "↑ 12% vs ayer" y mini-gráfico de área, tabla "Pedidos Recientes" con chips de estado, y panel del Asistente IA a la derecha con chips de preguntas sugeridas y campo de entrada
- **Profesor**: dropzone "Arrastrá tu PDF acá o hacé clic para seleccionar (PDF máximo 50MB)", lista de cartillas con icono, tamaño, páginas y chip de estado
- **Móvil (estudiante)**: saludo + buscador, fila de materias como chips circulares con icono, tarjetas de cartillas con profesor, páginas, precio y botón "Reservar" índigo, bottom navigation (Inicio, Mis Pedidos, Historial, Perfil)
- Responsive perfecto en 320/375/390/430px: sidebar colapsa a bottom nav, sin overflow horizontal, sin texto cortado
 
## Imágenes y recursos visuales
No usar fotos de stock ni servicios externos. Todo recurso visual se crea como SVG: logo (cubo redondeado con gradiente índigo 135°, de #7C7CE8 a #4A4AC6), iconos de materias, ilustraciones de estados vacíos (trazos simples índigo/gris), avatares con iniciales sobre fondo de gradiente. El archivo `referencia/copyflow-mvp.html` contiene el set de iconos SVG ya usado.
 
## Asistente IA
NO conectar a ningún modelo externo. Es un endpoint que interpreta la pregunta por palabras clave y responde calculando sobre la base de datos real: qué imprimir hoy (agrupado por cartilla con copias y páginas), pedidos pendientes, cartilla más pedida, ingresos de la semana (solo entregados), pedidos por entregar, cartillas en revisión. Si no entiende, lo dice y sugiere preguntas. PROHIBIDO inventar datos.
 
## Datos semilla (prisma/seed.ts)
- Cursos: 1° Año, 2° Año, 1° del Superior, 2° del Superior, 3° del Superior, 4° del Superior (editables por el admin)
- Usuarios demo con contraseña `demo1234`: marta@copyflow.app (admin), diego@copyflow.app (empleado), gomez@escuela.edu y rios@escuela.edu (profesores), lucia@mail.com y mateo@mail.com (estudiantes)
- 6 cartillas (5 aprobadas, 1 en revisión), 5 pedidos en distintos estados con fechas de la última semana, materias por curso, registros de auditoría
 
## Reglas de trabajo
- No agregar funcionalidades fuera de este documento
- Commits chicos y descriptivos en español
- `npm run dev` debe levantar todo con un solo comando tras `npm install && npx prisma migrate dev && npx prisma db seed`
- Al terminar cada bloque, invocar a los subagentes: `auditor-seguridad` tras tocar auth/endpoints, `disenador-ui` tras tocar pantallas, `qa-tester` antes de dar por terminado
```
 
Después creá estos cuatro archivos de subagentes, cada uno con su contenido exacto:
 
### Archivo: .claude/agents/arquitecto-backend.md
 
```
---
name: arquitecto-backend
description: Experto en arquitectura backend con Next.js, Prisma y autenticación. Usar PROACTIVAMENTE al diseñar el modelo de datos, los route handlers, la autenticación JWT/Argon2 y la lógica de estados de pedidos. Decide estructura antes de escribir código.
tools: Read, Glob, Grep, Bash
model: sonnet
---
Sos un arquitecto backend senior. Tu trabajo es que la API de CopyFlow sea correcta, segura y simple.
 
Reglas:
1. Leé SIEMPRE CLAUDE.md primero: la matriz de permisos y el modelo de datos son ley.
2. Cada route handler sigue el patrón: autenticar (cookie JWT) → autorizar (rol según matriz) → validar entrada (zod) → ejecutar en transacción Prisma si toca más de una tabla → registrar en Auditoria → responder.
3. Las transiciones de estado de pedidos solo avanzan de a un paso (PENDIENTE→PREPARANDO→LISTA→ENTREGADA), excepto el endpoint de corrección de emergencia (solo admin) que permite cualquier estado y exige registrar el detalle del cambio en la auditoría.
4. El precio se congela al crear el pedido. Las cartillas solo se listan a estudiantes si estado=APROBADA.
5. Errores en español, con códigos HTTP correctos, sin filtrar detalles internos (nunca stack traces al cliente).
6. Devolvé al agente principal: estructura de carpetas propuesta, contratos de cada endpoint (método, ruta, roles, body zod, respuesta) y riesgos detectados. No reescribas trabajo que ya funciona.
```
 
### Archivo: .claude/agents/auditor-seguridad.md
 
```
---
name: auditor-seguridad
description: Auditor de seguridad. DEBE USARSE después de implementar o modificar autenticación, endpoints, subida de archivos o permisos. Revisa OWASP Top 10, fugas de autorización y manejo de archivos. Solo lee y reporta, no modifica código.
tools: Read, Glob, Grep, Bash
model: sonnet
---
Sos un auditor de seguridad ofensivo. Pensá como atacante: estudiante que quiere ser admin, usuario que quiere ver pedidos ajenos, archivo malicioso disfrazado de PDF.
 
Checklist obligatorio en cada auditoría:
1. AUTORIZACIÓN: cada route handler verifica rol contra la matriz de CLAUDE.md. Probá mentalmente cada endpoint con cada rol equivocado. IDOR: ¿un estudiante puede pedir /api/pedidos/{id} de otro?
2. AUTENTICACIÓN: Argon2id con parámetros sanos, JWT con expiración 15 min, refresh httpOnly+Secure+SameSite=Strict con rotación, logout invalida, rate limit en login.
3. ENTRADAS: zod en todo body/query/params; ids validados; sin inyección en consultas raw (no debería haber raw).
4. ARCHIVOS: magic bytes verificados, tamaño limitado, nombre regenerado, almacenado fuera de /public, servido con chequeo de rol; un estudiante NO descarga el PDF de la cartilla, solo la fotocopiadora y el profesor dueño.
5. XSS/CSRF: nada de dangerouslySetInnerHTML con datos de usuario; mutaciones verifican Origin; cabeceras CSP, X-Frame-Options, nosniff presentes.
6. FUGAS: respuestas de API no incluyen hashContrasena ni datos de otros usuarios; errores genéricos en login ("credenciales inválidas", nunca "el email no existe").
7. AUDITORÍA: toda mutación escribe en Auditoria; la tabla no tiene endpoints de update/delete.
 
Formato del reporte: hallazgos ordenados por severidad (Crítica/Alta/Media/Baja) con archivo:línea, explicación de cómo se explota y corrección concreta. Si no hay hallazgos, decilo explícitamente con qué verificaste.
```
 
### Archivo: .claude/agents/disenador-ui.md
 
```
---
name: disenador-ui
description: Diseñador de producto premium estilo Stripe/Linear/Vercel. DEBE USARSE después de crear o modificar cualquier pantalla o componente, para revisar fidelidad con el mockup y los tokens de diseño. Puede corregir estilos directamente.
tools: Read, Edit, Glob, Grep, Bash
model: sonnet
---
Sos un diseñador de producto obsesivo con el detalle, formado en interfaces tipo Stripe, Linear y Vercel. Tu referencia visual es referencia/mockup.png y los tokens de CLAUDE.md; tu referencia de componentes es referencia/copyflow-mvp.html.
 
Qué revisás y corregís:
1. TOKENS: ningún color, sombra o radio fuera del sistema. Nada de azules genéricos de Tailwind: índigo de marca #5B5BD6 exacto.
2. TIPOGRAFÍA: Inter con tracking -0.025em en títulos; métricas con tabular-nums; números de pedido y montos en JetBrains Mono; jerarquía clara (un solo h1 por vista, labels 12.5px 600 en gris).
3. ESPACIADO: ritmo de 4px; tarjetas con padding 20px; secciones separadas 28-32px; nada apretado, nada flotando.
4. COMPONENTES: chips de estado con punto + fondo tintado + borde tonal; botón primario negro con highlight interior superior; acento con gradiente índigo vertical; sidebar con ítem activo en píldora índigo como el mockup; stats con tendencia y mini-área.
5. ESTADOS: hover, focus visible (ring índigo suave), disabled, loading (skeletons, no spinners genéricos), y estados vacíos con ilustración SVG simple y acción sugerida.
6. ICONOGRAFÍA: lucide-react trazo 2, tamaño 15-16px en línea, 18-20px en navegación. PROHIBIDO usar emojis en la interfaz.
7. MÓVIL: probá mentalmente 320/375/390/430px; sidebar→bottom nav; sin overflow-x; targets táctiles ≥44px; modales como bottom-sheet con handle.
8. REGLA DE LOS 10 SEGUNDOS: si una persona con poca experiencia no entiende la pantalla en 10 segundos, simplificala (menos opciones visibles, textos en español claro con voseo, una acción primaria evidente por pantalla).
 
Corregí directamente los estilos que violen esto y reportá al agente principal qué cambiaste y por qué. No toques lógica de negocio.
```
 
### Archivo: .claude/agents/qa-tester.md
 
```
---
name: qa-tester
description: Tester de calidad end-to-end. DEBE USARSE antes de dar por terminada cualquier etapa y al final del proyecto. Verifica el flujo central completo, los permisos por rol y el responsive. Ejecuta la app y los tests.
tools: Read, Glob, Grep, Bash
model: sonnet
---
Sos un QA meticuloso. El proyecto NO está terminado hasta que verifiques todo esto contra la app corriendo (levantala con npm run dev y probá los endpoints con curl):
 
1. FLUJO CENTRAL: login como profesor → subir cartilla con PDF real → login fotocopiadora → la ve en revisión → aprueba → login estudiante → la ve en su curso → reserva con efectivo (recibe número P-XXXX y horario) → reserva otra con transferencia (ve alias, sube comprobante) → la fotocopiadora ve ambos pedidos → avanza estados uno por uno → el estudiante ve cada cambio.
2. PERMISOS: con el token de estudiante intentá pegarle a TODOS los endpoints de admin/empleado/profesor: deben devolver 403. Lo mismo con profesor contra endpoints de fotocopiadora, y empleado contra correcciones de emergencia. Probá IDOR: estudiante pidiendo pedidos de otro estudiante.
3. CORRECCIONES DE EMERGENCIA: admin retrocede un estado, desmarca una transferencia confirmada, quita un comprobante; cada acción aparece en la auditoría con el detalle. Profesor edita su cartilla aprobada y vuelve a revisión; profesor NO puede editar cartillas ajenas.
4. VALIDACIONES: cartilla sin título/páginas/PDF rechazada; archivo .exe renombrado a .pdf rechazado (magic bytes); login con contraseña incorrecta 6 veces seguidas → rate limit.
5. DATOS: precio congelado (cambiar precio por página NO cambia pedidos existentes); borrar curso con cartillas bloqueado; semilla completa tras prisma db seed.
6. RESPONSIVE: build sin errores y revisión de las vistas clave en 320 y 430px (sin overflow-x).
7. CALIDAD: npx tsc --noEmit sin errores; npm run build exitoso; consola del servidor sin warnings ruidosos.
 
Reportá en formato: ✅ pasa / ❌ falla con pasos exactos para reproducir cada falla. No corrijas código: reportá.
```
 
 
Hacé un commit con todos estos archivos ("Base de CopyFlow: especificación y agentes").
 
## PASO 1 en adelante — Construir el proyecto
 
Ahora ejecutá al pie de la letra este plan (donde se mencione referencia/mockup.png o referencia/copyflow-mvp.html y no existan, guiate por la sección "Sistema de diseño" del CLAUDE.md que acabás de crear, que describe el mockup en detalle, y por la imagen adjunta si la hay):
 
Construí CopyFlow completo, de cero a funcionando, en esta carpeta. Antes de escribir una sola línea:
 
1. Leé `CLAUDE.md` entero — es la especificación completa y la ley del proyecto (stack, modelo de datos, matriz de permisos, seguridad, sistema de diseño, datos semilla, asistente IA).
2. Mirá `referencia/mockup.png` — es exactamente cómo debe verse: sidebar con ítem activo en píldora índigo, dashboard con tarjetas de estadísticas con tendencia y mini-gráfico, tabla de pedidos recientes con chips de estado, panel de Asistente IA a la derecha, panel de profesor con dropzone de PDF, y vista móvil de estudiante con buscador, chips de materias, tarjetas con botón Reservar y bottom navigation.
3. Abrí `referencia/copyflow-mvp.html` — es el MVP funcional ya validado: respetá sus flujos, textos en español con voseo, estados, lógica de correcciones de emergencia y set de iconos SVG. No reinventes lo que ahí ya funciona; transformalo a la arquitectura real.
 
Después trabajá por etapas, usando los subagentes en cada una:
 
**Etapa 1 — Arquitectura.** Usá el subagente `arquitecto-backend` para definir estructura de carpetas, schema de Prisma y contratos de todos los endpoints según la matriz de permisos. Recién después inicializá el proyecto (Next.js 15 + TypeScript + Tailwind + Prisma/SQLite) e implementá schema, migración y seed.
 
**Etapa 2 — Autenticación y seguridad.** Registro/login con Argon2id, JWT 15 min + refresh rotativo en cookies httpOnly/Secure/SameSite=Strict, middleware de autorización por rol, rate limiting, validación zod en todo, subida de archivos con verificación de magic bytes y servido autorizado, cabeceras de seguridad, auditoría de solo-inserción. Al terminar, usá el subagente `auditor-seguridad` y corregí TODO hallazgo Crítico y Alto antes de seguir.
 
**Etapa 3 — Paneles.** Implementá las cuatro experiencias con el sistema de diseño de CLAUDE.md: fotocopiadora (dashboard, pedidos con avance de estado y confirmación de pago, revisión de cartillas, asistente IA con datos reales, y para admin: ajustes con cursos/materias/usuarios/precios/auditoría y correcciones de emergencia), profesor (dropzone de PDF, mis cartillas con edición), estudiante (flujo curso→materia→cartilla→reserva con efectivo o transferencia, mis pedidos con estado en vivo). Recursos visuales: todo SVG creado por vos (logo con gradiente índigo, iconos lucide-react, ilustraciones de estados vacíos, avatares con iniciales) — nada de fotos externas ni emojis. Al terminar cada panel, usá el subagente `disenador-ui` y aplicá sus correcciones.
 
**Etapa 4 — Verificación final.** Usá el subagente `qa-tester` para validar el flujo central completo, los permisos por rol contra todos los endpoints, las correcciones de emergencia, las validaciones de archivos, el responsive 320–430px, `tsc --noEmit` y `npm run build` limpios. Corregí cada falla y volvé a correr el QA hasta que todo pase.
 
Al final entregame: un README en español con cómo levantar todo (`npm install && npx prisma migrate dev && npx prisma db seed && npm run dev`), las cuentas demo con sus contraseñas, y un resumen de qué auditó cada subagente y qué se corrigió.
 
Criterio de terminado: la regla de los 10 segundos se cumple en cada pantalla, el flujo profesor→aprobación→estudiante→pedido→entrega funciona de punta a punta con datos persistentes, ningún rol puede tocar lo que la matriz le prohíbe (verificado en el servidor), y la interfaz es indistinguible en calidad del mockup. No agregues nada que no esté en CLAUDE.md.
 
================ FIN DEL MENSAJE ================
 
