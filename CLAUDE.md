# CopyFlow — Contexto del proyecto

Plataforma SaaS **multi-fotocopiadora** (multi-tenant): cada fotocopiadora suscripta opera aislada dentro de la misma aplicación. Profesores suben cartillas (PDF), la fotocopiadora las aprueba, los estudiantes las reservan y pagan, la fotocopiadora gestiona los pedidos por estados. UNA SOLA web, UNA base de datos, UNA autenticación; lo que cambia por rol son los permisos y las vistas, y lo que cambia por tenant son los datos.

## Multi-tenancy (regla número uno)
Toda tabla de negocio lleva `fotocopiadoraId`. Ninguna fotocopiadora puede ver, tocar ni deducir datos de otra bajo ninguna circunstancia.
- El `fotocopiadoraId` viaja **dentro del JWT firmado**; jamás se acepta del cliente.
- Cada consulta filtra por el tenant del usuario autenticado. Para buscar por id se usa `findFirst({ where: { id, fotocopiadoraId } })`, nunca `findUnique({ where: { id } })`: un recurso de otro tenant debe responder 404, no 403 (no se confirma ni que existe).
- La numeración de pedidos `P-0001` es **por fotocopiadora**, no global.
- El email de usuario es único en toda la plataforma: cada persona pertenece a una sola fotocopiadora, y así el login resuelve el tenant sin pedirlo.

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

## Registro y filtro anti-fraude docente
Cualquiera puede registrarse desde `/registro` indicando el **código (slug)** de su fotocopiadora. El rol de profesor exige DOS filtros, verificados en el servidor:
1. **Dominio institucional**: el email debe pertenecer al `dominioDocente` que configuró esa fotocopiadora.
2. **PIN de 4 dígitos**: lo genera el dueño desde Ajustes → PINes docentes. Es de un solo uso, vence, y pertenece a esa fotocopiadora.
Si falta cualquiera de los dos, la cuenta se crea como ESTUDIANTE. Como un PIN de 4 dígitos tiene poca entropía, la defensa real es el rate limiting (5 intentos por IP y bloqueo creciente), el uso único y el vencimiento.

## Modelo de datos (Prisma)
Fotocopiadora(id, nombre, slug único, dominioDocente?, activa, creadoEn) — el tenant · PinProfesor(id, codigo, etiqueta?, usado, expiraEn, usadoPorId?, fotocopiadoraId) · Usuario(id, nombre, email único, hashContrasena, rol enum, fotocopiadoraId, creadoEn) · Curso(id, nombre) · Materia(id, nombre, cursoId) · Cartilla(id, titulo, paginas, observaciones, archivoPdf, estado enum[REVISION, APROBADA, RECHAZADA], profesorId, materiaId, creadoEn) · Pedido(id, numero "P-0001" autoincremental formateado, cartillaId, estudianteId, estado enum[PENDIENTE, PREPARANDO, LISTA, ENTREGADA], metodoPago enum[EFECTIVO, TRANSFERENCIA], pagoConfirmado bool, comprobante string?, precioCongelado int, creadoEn) · Configuracion(precioPorPagina, alias, horario) · Auditoria(id, usuarioId, accion, creadoEn — solo inserción, nunca update/delete).
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
- Aislamiento multi-tenant verificado en el servidor: probar siempre el ataque cruzado (tenant A pidiendo recursos de B por id) además de los permisos por rol

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
- DOS fotocopiadoras para poder demostrar el aislamiento: `central` (Fotocopiadora Central, dominio docente escuela.edu) y `norte` (Copias del Norte, dominio institutonorte.edu.ar)
- Usuarios demo con contraseña `demo1234`. En `central`: marta@copyflow.app (admin), diego@copyflow.app (empleado), gomez@escuela.edu y rios@escuela.edu (profesores), lucia@mail.com y mateo@mail.com (estudiantes). En `norte`: ana@norte.app (admin), molina@institutonorte.edu.ar (profesor), sofia@mail.com (estudiante)
- PINes docentes de prueba: central 4821 y 7390 · norte 1234
- 6 cartillas (5 aprobadas, 1 en revisión), 5 pedidos en distintos estados con fechas de la última semana, materias por curso, registros de auditoría

## Reglas de trabajo
- No agregar funcionalidades fuera de este documento
- Commits chicos y descriptivos en español
- `npm run dev` debe levantar todo con un solo comando tras `npm install && npx prisma migrate dev && npx prisma db seed`
- Al terminar cada bloque, invocar a los subagentes: `auditor-seguridad` tras tocar auth/endpoints, `disenador-ui` tras tocar pantallas, `qa-tester` antes de dar por terminado
