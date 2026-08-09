# CopyFlow

Plataforma **SaaS multi-fotocopiadora** para gestión de cartillas escolares. Cada fotocopiadora suscripta opera **completamente aislada** dentro de la misma aplicación: los profesores suben cartillas (PDF), la fotocopiadora las aprueba, los estudiantes las reservan y pagan, y la fotocopiadora gestiona los pedidos por estados.

## Multi-tenancy (aislamiento entre fotocopiadoras)

Toda tabla de negocio lleva `fotocopiadoraId` y **ninguna fotocopiadora puede ver ni tocar datos de otra**:

- El tenant viaja **dentro del JWT firmado**; nunca se acepta del cliente.
- Las búsquedas por id usan `findFirst({ where: { id, fotocopiadoraId } })`, así un recurso de otro tenant responde **404** (ni siquiera se confirma que existe).
- La numeración de pedidos `P-0001` es **por fotocopiadora**, no global.
- Cada fotocopiadora tiene su propio precio por página, alias y horario.

## Registro con filtro anti-fraude docente

Cualquiera se registra en `/registro` con el **código** de su fotocopiadora. Para obtener el rol de **profesor** hacen falta **dos filtros**, verificados en el servidor:

1. **Dominio institucional** — el email debe pertenecer al dominio docente que configuró esa fotocopiadora.
2. **PIN de 4 dígitos** — lo genera el dueño desde *Ajustes → PINes docentes*. Es de **un solo uso**, **vence** y pertenece a **esa** fotocopiadora.

Si falta cualquiera de los dos, la cuenta se crea como **estudiante**. Como un PIN de 4 dígitos tiene poca entropía, la defensa real es el **rate limiting** (5 intentos por IP con bloqueo creciente), el uso único y el vencimiento.

## Stack

- **Next.js 15** (App Router) + **TypeScript** estricto
- **Tailwind CSS** con los tokens de diseño del proyecto (componentes propios, sin librerías de UI prefabricadas)
- **Prisma** + **PostgreSQL** (la misma base en desarrollo y en producción, para que nada falle recién al publicar).
- Autenticación propia: **Argon2id** para contraseñas, **JWT de acceso (15 min) + refresh token rotativo (7 días)** en cookies `httpOnly` `Secure` `SameSite=Strict`.
- Validación con **zod** en todos los endpoints.

## Cómo levantarlo

1. Copiá `.env.example` a `.env` y completá `DATABASE_URL` con tu PostgreSQL.
   La forma más rápida de tener uno gratis y sin instalar nada es crear una base
   en [Neon](https://neon.tech) y pegar la cadena de conexión que te da.

```bash
npm install
npx prisma generate         # genera el cliente de Prisma
npx prisma migrate deploy   # crea las tablas
npx prisma db seed          # carga los datos demo
npm run dev                 # http://localhost:3000
```

> `npx prisma generate` va aparte porque las versiones nuevas de npm bloquean
> los scripts de instalación de los paquetes por seguridad, así que el cliente
> de Prisma no se genera solo al hacer `npm install`.

> **Si usás Neon (o cualquier Postgres con pooler):** la cadena que trae
> `-pooler` en el host pasa por PgBouncer, que reparte las consultas entre
> conexiones distintas. Prisma necesita saberlo (`?pgbouncer=true`) o vas a ver
> errores intermitentes al guardar y mucha lentitud. La app agrega ese parámetro
> sola al detectar el pooler, pero las **migraciones** (`prisma migrate`) tienen
> que correr con la cadena **sin** `-pooler` (la "directa" que muestra Neon).

> **En producción generá tu propio `JWT_SECRET`:**
> `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Para una build de producción:

```bash
npm run build && npm start
```

## Cuentas demo

La semilla crea **dos fotocopiadoras** para poder comprobar el aislamiento. Todas las cuentas usan la contraseña **`demo1234`**.

**Fotocopiadora Central** (código `central`, dominio docente `escuela.edu`)

| Rol | Email | Qué ve |
|---|---|---|
| Admin | `marta@copyflow.app` | Todo: dashboard, pedidos, cartillas, asistente, ajustes, PINes y correcciones |
| Empleado | `diego@copyflow.app` | Dashboard, pedidos, cartillas y asistente (sin ajustes ni correcciones) |
| Profesor | `gomez@escuela.edu` | Subir cartillas y ver/editar las propias |
| Estudiante | `lucia@mail.com` | Reservar cartillas y ver solo sus pedidos |

**Copias del Norte** (código `norte`, dominio docente `institutonorte.edu.ar`, $70/pág)

| Rol | Email |
|---|---|
| Admin | `ana@norte.app` |
| Profesor | `molina@institutonorte.edu.ar` |
| Estudiante | `sofia@mail.com` |

PINes docentes de prueba: **central** `7390` · **norte** `1234`. Entrando con `marta@copyflow.app` en *Ajustes → PINes docentes* podés generar más.

> Probá el aislamiento: entrá como `marta@copyflow.app` y fijate que no existe ningún dato de Copias del Norte, y viceversa.

## Panel de dueño de la plataforma (`/dueno`)

Es el panel para mantener **todas** las fotocopiadoras: quién está al día, quién
venció, cuánto se usa el sistema y alta de clientes nuevos. Lo usa una sola
persona y **no es un rol de la aplicación**: vive en una tabla aparte, con su
propia contraseña, su propio segundo factor y su propia clave de firma.

### Cómo activarlo

1. Generá dos claves distintas:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

2. Ponelas en tu `.env` (y en las variables de entorno del hosting):

```
EMAIL_DUENO="el-unico-email-que-puede-entrar@ejemplo.com"
JWT_SECRET_DUENO="la-clave-larga-que-generaste-recien"
CLAVE_DUENO_INICIAL="una-contrasena-larga-y-unica"
```

3. Creá la cuenta y borrá la contraseña del archivo:

```bash
npm run dueno     # después borrá CLAVE_DUENO_INICIAL del .env
```

4. Entrá a `/dueno/ingresar`. La primera vez te muestra una clave para cargar en
   **Google Authenticator** (opción *Ingresar una clave de configuración*).
   Anotala en un papel: se muestra una sola vez.

### Por qué es difícil de vulnerar

- **Sin `EMAIL_DUENO` y `JWT_SECRET_DUENO`, la ruta no existe**: `/dueno` responde 404. Sin sesión válida, también 404 — nunca 401 ni 403, así que ni siquiera se confirma que el panel exista.
- **La clave de firma es distinta de la de los usuarios comunes.** Una sesión de fotocopiadora no puede valer como sesión de plataforma, ni aunque alguien lograra cambiarse el rol directamente en la base de datos.
- **El email autorizado vive en el entorno, no en la base.** Para tomar el panel no alcanza con escribir en PostgreSQL: hay que poder cambiar variables de entorno del servidor.
- **La contraseña sola no abre nada.** Después de acertarla, todavía falta el código de 6 dígitos del celular. Un código ya usado no se puede repetir.
- **3 intentos por IP** y bloqueo creciente de hasta 24 horas. Todo queda registrado, aciertos y fallos, con IP y hora, en una pantalla dentro del panel.

### Lo que el panel NO muestra

A propósito no muestra nombres de alumnos, títulos de cartillas ni archivos: sólo
suscripciones y cantidades. Vos necesitás saber quién te paga y cuánto se usa el
sistema, no leer los datos de las escuelas.

### Si perdés el celular

Volvé a correr `npm run dueno` con una `CLAVE_DUENO_INICIAL` nueva: eso resetea
el segundo factor y lo volvés a dar de alta al entrar.

## Publicar en internet (deploy)

La app está lista para publicarse. Necesita **tres variables de entorno**:

| Variable | Para qué | Obligatoria |
|---|---|---|
| `DATABASE_URL` | PostgreSQL (Neon, Vercel Postgres, Supabase…) | Sí |
| `JWT_SECRET` | Firma de las sesiones. Una clave larga y propia | Sí |
| `BLOB_READ_WRITE_TOKEN` | Guardar los PDF en la nube | Sí en producción |
| `EMAIL_DUENO` | Único email que entra al panel `/dueno` | Sólo si lo querés |
| `JWT_SECRET_DUENO` | Firma del panel `/dueno`. **Distinta** de `JWT_SECRET` | Sólo si lo querés |

**Sobre los archivos:** un servidor publicado no conserva lo que se escribe en su
disco (se borra en cada despliegue). Por eso el guardado tiene dos motores y
elige solo: si existe `BLOB_READ_WRITE_TOKEN` sube los PDF a la nube; si no,
los guarda en la carpeta local `almacenamiento/`, que es lo correcto para
desarrollo. En los dos casos el archivo **se sigue sirviendo por un endpoint que
valida el rol**, nunca por una URL pública adivinable.

Pasos: crear la base, importar el repo en la plataforma de hosting, cargar esas
tres variables y desplegar. Después, una sola vez:
`npx prisma migrate deploy` y `npx prisma db seed`.

## El flujo central

1. **Profesor** sube una cartilla (PDF + curso + materia + páginas + observaciones) → queda **En revisión**.
2. **Fotocopiadora** (admin/empleado) la **aprueba** → aparece para los estudiantes del curso.
3. **Estudiante** reserva eligiendo el pago:
   - **Efectivo**: recibe número de pedido `P-XXXX` y horario de retiro.
   - **Transferencia**: ve el alias y sube el comprobante.
4. El pedido entra en la fotocopiadora como **Pendiente** y se avanza de a un paso: **Pendiente → Preparando → Lista para retirar → Entregada**.
5. El estudiante ve cada cambio reflejado en vivo (polling).

El **precio se congela** al reservar (`precioCongelado`): cambiar el precio por página no altera pedidos ya hechos.

## Estructura

```
prisma/
  schema.prisma      # modelo de datos
  seed.ts            # datos demo (usuarios, cursos, materias, cartillas, pedidos, auditoría)
src/
  app/
    api/             # route handlers (auth, cartillas, pedidos, cursos, materias,
                     # usuarios, configuracion, auditoria, estadisticas, asistente)
    ingresar/        # login
    registro/        # alta de cuenta con filtro anti-fraude docente
    panel/           # fotocopiadora (dashboard, pedidos, cartillas, asistente, ajustes)
    profesor/        # subir cartilla, mis cartillas
    estudiante/      # inicio (reservar), mis pedidos, historial, perfil
  componentes/       # UI propia (Marca/logo, Chip de estados, Escritorio, Movil, Comunes)
  lib/               # auth, jwt, password, refresh, cookies, rateLimit, archivos,
                     # auditoria, validaciones (zod), asistente, formato
  middleware.ts      # cabeceras de seguridad (CSP, X-Frame-Options, nosniff, etc.)
almacenamiento/      # archivos subidos (fuera de /public), servidos por endpoint autorizado
```

## Seguridad

- **Argon2id** para contraseñas; nunca se loguean credenciales.
- Autorización por rol **verificada en el servidor** en cada endpoint (no solo en la UI): cada handler rechaza con `403` si el rol no corresponde.
- **Anti-IDOR**: un estudiante solo accede a sus propios pedidos; el PDF de una cartilla solo lo descargan la fotocopiadora y el profesor dueño (nunca un estudiante).
- **Subida de archivos**: validación por *magic bytes* (`%PDF` para cartillas; PDF/JPG/PNG para comprobantes), límite de 50 MB, nombre regenerado con UUID, almacenamiento fuera de `/public` y servido por endpoint autorizado.
- **Rate limiting**: 5 intentos de login por IP con espera progresiva; 30 req/min general por usuario; límite dedicado para intentos de PIN docente.
- **Anti-CSRF**: cookies `SameSite=Strict` + verificación de `Origin` en las mutaciones.
- **Cabeceras**: CSP estricta, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`.
- **Auditoría de solo inserción**: toda acción que modifica datos se registra en `Auditoria` con usuario, descripción en español y fecha. No existen endpoints de update/delete sobre la auditoría.

## Asistente IA

No se conecta a ningún modelo externo. Es un endpoint que interpreta la pregunta por palabras clave y responde **calculando sobre la base real**: qué imprimir hoy (agrupado por cartilla), pedidos pendientes, cartilla más pedida, ingresos de la semana (solo entregados), pedidos por entregar y cartillas en revisión. Si no entiende, lo dice y sugiere preguntas. No inventa datos.

## Verificación realizada

El proyecto se validó con el servidor corriendo (`npm run dev`) y pruebas con `curl`:

**Seguridad / permisos:**
- Logins de los 4 roles, error genérico de credenciales y rate limit (el 6.º intento devuelve `429`).
- Matriz de roles: estudiante y profesor reciben `403` en endpoints de fotocopiadora/admin; empleado recibe `403` en endpoints solo-admin (usuarios, auditoría, correcciones de emergencia).
- IDOR: un estudiante no puede ver el pedido de otro (`403`); un estudiante no puede descargar el PDF de una cartilla (`403`).
- Magic bytes: un `.pdf` con bytes `MZ` se rechaza (`400`). Anti-CSRF: mutación con `Origin` ajeno → `403`.
- **Corregido durante el QA**: el header `Content-Disposition` fallaba con títulos que tenían caracteres no-ASCII (em dash); ahora usa nombre ASCII + `filename*` (RFC 5987).

**Flujo y datos:**
- Flujo completo profesor → aprobación → estudiante (reserva en efectivo y en transferencia con comprobante) → avance de estados uno por uno → el estudiante ve `Entregada`.
- Correcciones de emergencia del admin (retroceder estado, desmarcar pago, quitar comprobante) con motivo y registro en auditoría.
- Profesor edita su cartilla (vuelve a revisión) y no puede editar ajenas (`403`).
- Precio congelado: subir el precio por página no cambia pedidos existentes.
- Borrar curso con cartillas → bloqueado (`409`); curso vacío → se borra (`200`).
- Asistente IA respondiendo con datos reales.

**Diseño:**
- Tokens del sistema (índigo de marca `#5B5BD6`, sombras en capas, radios 10–14px), tipografía Inter con `tracking` en títulos y JetBrains Mono para números de pedido y montos, chips de estado con punto + fondo tintado + borde tonal, sidebar con ítem activo en píldora índigo, dashboard con tarjetas de estadística y mini-gráfico de área, dropzone de PDF para el profesor, vista móvil del estudiante con bottom navigation.

**Aislamiento multi-tenant (verificado con la app corriendo):**
- Cada fotocopiadora ve solo sus pedidos, cartillas, cursos, usuarios, auditoría, estadísticas y PINes.
- Ataque cruzado por id desde el admin del tenant A contra recursos del tenant B: ver pedido, avanzar estado, corregir, descargar PDF, aprobar cartilla y reservar → **404 en todos los casos**.
- Filtro anti-fraude probado en 7 escenarios: estudiante común, PIN robado con mail personal, mail institucional sin PIN, PIN inventado, PIN de otra fotocopiadora, registro legítimo y reuso del PIN ya consumido. Solo el legítimo obtiene el rol de profesor.
- Fuerza bruta de PIN: el 6.º intento devuelve `429`.

**Calidad:** `npx tsc --noEmit` sin errores y `npm run build` exitoso. Las páginas de escritorio (`/panel`, `/profesor`) tuvieron un fallo de render por pasar componentes de icono y una función desde Server Components a Client Components; **se corrigió** moviendo `rutaPorRol` a un módulo neutral y pasando los iconos de navegación como claves de texto resueltas en el cliente.
