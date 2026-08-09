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
- **Prisma** + **PostgreSQL** (misma base en desarrollo y produccion). Los PDF se guardan en disco local en desarrollo y en la nube (Vercel Blob) en produccion, eligiendo el motor solo segun BLOB_READ_WRITE_TOKEN; siempre servidos por endpoint autorizado
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

## Sistema de diseño (ultra-minimalista oscuro, estilo premium)
Estética: negro carbón, tipografía blanco roto, mucho aire, tarjetas con bordes redondeados
suaves, sombras realistas muy sutiles y toques de glassmorphism. El acento es un **verde
esmeralda** (`#4CA95E`), tomado de las imágenes de referencia de la identidad. La marca y los
saludos van en **serif** (Playfair Display): "Copy" en redonda + "Flow" en itálica. El logo son
tres cuadrados redondeados superpuestos (hojas apiladas) en verde.
El MISMO estilo aplica a escritorio y a móvil: no hay dos identidades.

Tokens:
- Fondo `#101416`, superficie `#15191C`, tarjetas `#1A1F22` (con blur de vidrio), vidrio `rgba(255,255,255,.035)`
- Texto blanco roto `#F2F4F3`, secundario `#9BA1A4`, terciario `#6B7276`, bordes `#252B2D` y `#1E2426`
- Acento verde `#4CA95E` (hover `#5CBB6E`, fuerte `#3E8B4D`, tinte `rgba(76,169,94,.12)`, ring `rgba(76,169,94,.22)`)
- Estados como tintes translúcidos (texto vivo + fondo al 10% + borde al 22%): Pendiente `#E0B270`,
  Preparando `#84AEDC`, Lista/Aprobada `#6DC47F` (verde de marca), Entregada `#9AA0A6`, Rechazada `#E08C8C`. Chips con punto de color.
- Tipografía: Inter para interfaz; **Playfair Display** (clase `.display`) para logo y saludos; JetBrains Mono para números de pedido y montos; números tabulares en métricas
- Radios 10–18px; sombras `0 1px 2px rgba(0,0,0,.4)` + difusa; botón primario y de acento en verde esmeralda con texto oscuro y highlight interior; botón secundario de vidrio con borde
- Iconografía: lucide-react (trazo 2, nunca emojis)

Layout:
- **Escritorio (fotocopiadora/profesor)**: sidebar fija izquierda con logo arriba, ítem activo en píldora verde, usuario abajo; área principal con saludo, tarjetas de estadísticas con mini-gráfico de área, tabla de pedidos recientes con chips de estado, y asistente IA
- **Profesor**: dropzone "Arrastrá tu PDF acá o hacé clic para seleccionar (PDF máximo 50MB)", lista de cartillas con icono, tamaño, páginas y chip de estado
- **Móvil (estudiante)**: saludo + buscador, fila de materias como chips circulares con icono, tarjetas de cartillas con profesor, páginas, precio y botón "Reservar", bottom navigation (Inicio, Mis Pedidos, Historial, Perfil)
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

## Trabajos propios del estudiante
Además de reservar cartillas aprobadas, el estudiante puede subir SU PROPIO PDF para imprimir. Ese trabajo entra en la MISMA cola de pedidos de la fotocopiadora (una sola lista para el empleado), no en una pantalla aparte.
- En `Pedido`, `cartillaId` es opcional: cuando el pedido nace de un archivo propio viajan `archivoPropio`, `tituloPropio` y `paginasPropio`.
- Mismas reglas que siempre: magic bytes `%PDF`, 50 MB, nombre uuid, fuera de /public y servido por `/api/pedidos/[id]/trabajo`, que solo autoriza a la fotocopiadora y al estudiante dueño.
- El precio se congela al subirlo, igual que en una reserva.

## Estadísticas del dashboard (sin datos de adorno)
Cada gráfico mide algo distinto y sale de la base real; ninguna serie se repite entre tarjetas ni se rellena con valores inventados.
- `serieVentas`: ingresos por día de los últimos 14 días, contando SOLO pedidos entregados.
- `seriePedidos`: pedidos recibidos por día (reservas + trabajos propios), incluidos los días en cero.
- La variación porcentual compara los últimos 7 días contra los 7 anteriores; si no hay base de comparación se omite en vez de inventar un número.
- Si no hubo movimiento, el gráfico lo dice en texto en vez de dibujar una línea plana.

## Suscripción de la fotocopiadora (modelo SaaS)
Cada fotocopiadora le paga a la plataforma una suscripción mensual.
- `Suscripcion(estado[PRUEBA, ACTIVA, VENCIDA, CANCELADA], precioMensual congelado, vigenteHasta, fotocopiadoraId único)` · `PagoSuscripcion(monto, meses, referencia, periodoHasta)` — historial de solo inserción.
- Una fotocopiadora nueva arranca con 15 días de PRUEBA.
- El **login verifica la vigencia**: si venció, TODOS los usuarios de ese tenant reciben 403 (no solo el dueño). El resto de las fotocopiadoras no se ve afectado.
- Hay **5 días de gracia** tras el vencimiento: se entra igual, con aviso, para no cortarle el servicio a quien paga con demora.
- Cobro: hoy es **manual** (transferencia + registro del pago en Ajustes → Suscripción, que extiende el período). Al integrar una pasarela, su webhook debe llamar a `registrarPago()`; no se duplica lógica.
- Solo el admin ve y gestiona la suscripción de SU fotocopiadora.

## Panel de dueño de la plataforma (`/dueno`)
El mantenimiento de TODAS las fotocopiadoras lo hace una sola persona. Ese acceso **no es un rol más**: es un mundo aparte que no se toca con el de los tenants.
- Tabla propia `DuenoPlataforma` (no es un `Usuario`), **secreto de firma propio** (`JWT_SECRET_DUENO`) y **cookie propia** (`cf_dueno`). Como el secreto es distinto, ningún token de fotocopiadora puede valer como token de plataforma, ni aunque alguien lograra cambiarse el rol en la base.
- **Triple filtro para entrar**: (1) el email tiene que ser exactamente `EMAIL_DUENO`, que vive en las variables de entorno y no en la base — tomar el panel exige acceso al servidor, no sólo a PostgreSQL; (2) contraseña Argon2id; (3) **segundo factor TOTP obligatorio**. La contraseña sola nunca abre el panel: emite un token corto de 10 minutos que sólo sirve para presentar el código. Un código ya usado no se puede repetir (se guarda el paso consumido).
- Si `EMAIL_DUENO` o `JWT_SECRET_DUENO` no están definidas, `/dueno` y `/api/plataforma/*` responden **404**. Sin sesión válida también responden 404, nunca 401 ni 403: no se confirma que el panel exista.
- Rate limiting propio y más duro: 3 intentos por IP y bloqueo creciente de hasta 24 horas. Todo queda en `AuditoriaPlataforma` (sólo inserción), **incluidos los intentos fallidos**, con IP y fecha.
- **Mínimo privilegio incluso para el dueño**: el panel muestra suscripciones y CANTIDADES agregadas (usuarios, pedidos, cartillas, facturado, último uso). Nunca nombres de alumnos, títulos de cartillas ni archivos. Puede dar de alta una fotocopiadora con su admin, suspenderla/reactivarla y registrar pagos de suscripción reusando `registrarPago()`.
- La cuenta se crea sólo desde el servidor con `npm run dueno`, que lee `CLAVE_DUENO_INICIAL` del entorno. Volver a correrlo resetea el segundo factor (es la vía de recuperación si se pierde el teléfono) y borra cualquier otra cuenta de dueño: existe una sola.

## Reglas de trabajo
- No agregar funcionalidades fuera de este documento
- Commits chicos y descriptivos en español
- `npm run dev` debe levantar todo tras `npm install && npx prisma migrate dev && npx prisma db seed`, con DATABASE_URL apuntando a un PostgreSQL
- Al terminar cada bloque, invocar a los subagentes: `auditor-seguridad` tras tocar auth/endpoints, `disenador-ui` tras tocar pantallas, `qa-tester` antes de dar por terminado
