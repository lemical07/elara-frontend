# ELARA Frontend

Interfaz web de ELARA para explorar películas, series y anime, consultar reseñas y utilizar las operaciones disponibles de la API.

## Tecnologías

- HTML5, CSS3 y JavaScript nativo con módulos ES.
- `fetch` para consumir la API.
- Servidor y proxy local con módulos nativos de Node.js; no requiere dependencias adicionales.

## Estructura

```text
elara-frontend/
├── assets/
│   ├── icons/          # Logo, perfiles e iconos de reacciones
│   └── images/         # Fondos visuales por tipo de experiencia
├── js/
│   ├── components/     # Navegación, sesión y modales reutilizables
│   ├── config/         # Configuración de la API
│   ├── pages/          # Lógica de catálogo, detalle, perfil y administración
│   ├── services/       # Cliente HTTP, JWT y manejo de errores
│   └── utils/          # Utilidades DOM y formato
├── pages/              # Documentos HTML de las secciones de la aplicación
├── styles/             # Estilos globales y componentes responsive
├── tests/              # Pruebas nativas del cliente API y del proxy
├── index.html          # Pantalla de bienvenida y entrada a ELARA
└── server.mjs          # Servidor estático y proxy de desarrollo
```

## Ejecución local

Requiere Node.js. Inicia el backend por separado en `http://localhost:3000`. Desde la raíz de este repositorio, ejecuta:

```powershell
node server.mjs
```

Abre `http://localhost:5500`. Para seleccionar otro puerto:

```powershell
$env:PORT = "5501"
node server.mjs
```

El frontend consume `/elara/...`; el servidor local reenvía esas solicitudes a `http://localhost:3000/api/...`. Esto permite usar la API bajo el mismo origen sin cambiar CORS ni los contratos del backend. Live Server sirve archivos estáticos, pero no incluye este proxy.

`window.ELARA_API_BASE_URL` permite definir otra URL base. En localhost, el valor predeterminado es `/elara`; fuera de desarrollo local, es `/api` bajo el origen actual.

## Sesión y permisos

- El JWT se guarda en `sessionStorage` y se envía en `Authorization: Bearer <JWT>`.
- La interfaz consulta `/auth/me`; el rol confirmado por el backend determina las opciones administrativas.
- Cerrar sesión elimina el token local. No revoca el JWT en el servidor.
- Las solicitudes incluyen credenciales para preservar la cookie HttpOnly de visitante.

## Alcance y limitaciones

- La interfaz utiliza las operaciones existentes para autenticación, usuarios, categorías, catálogo, detalles, personajes, reseñas, reacciones y propuestas.
- No se simulan rankings, paginación, moderación de reseñas ni operaciones sin endpoint.
- El backend no ofrece una ruta para listar las propuestas del usuario; por eso «Mis contenidos» no muestra listado ni contador.
- Algunas lecturas de catálogo devolvieron texto con caracteres mal codificados, como `Ciencia FicciÃ³n`. La corrección corresponde a la codificación de datos/conexión del backend o MySQL, que no se modifica desde este repositorio.
- En producción, el servidor web o proxy debe publicar la URL base configurada y servir el frontend bajo el origen correspondiente.
