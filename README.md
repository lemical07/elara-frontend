# ELARA Frontend

**ELARA** es una plataforma web dedicada al entretenimiento audiovisual que permite explorar películas, series y anime, consultar información de cada contenido e interactuar con una comunidad mediante reseñas y calificaciones.

Su interfaz combina una experiencia visual moderna con una arquitectura basada en tecnologías web nativas.

## Tecnologías

- **HTML5:** estructura de las páginas.
- **CSS3:** diseño visual y adaptación responsive.
- **JavaScript:** lógica de la aplicación mediante módulos ES.
- **Fetch API:** comunicación con el backend.
- **Node.js:** servidor local y proxy de desarrollo mediante módulos nativos, sin dependencias adicionales.

## Estructura del proyecto

```text
elara-frontend/
├── assets/
│   ├── icons/          # Logotipo, perfiles e iconos de reacciones
│   └── images/         # Recursos gráficos y fondos visuales
├── js/
│   ├── components/     # Navegación, sesión y modales reutilizables
│   ├── config/         # Configuración de la API
│   ├── pages/          # Lógica de las diferentes secciones
│   ├── services/       # Comunicación HTTP, autenticación y errores
│   └── utils/          # Utilidades DOM y funciones auxiliares
├── pages/              # Páginas HTML de la aplicación
├── styles/             # Estilos globales y componentes responsive
├── index.html          # Pantalla de bienvenida de ELARA
└── server.mjs          # Servidor estático y proxy de desarrollo
```

## Ejecución local

### Requisitos

- Node.js instalado.
- Backend de ELARA en ejecución.

### Iniciar el proyecto

Primero, inicia el backend en:

```text
http://localhost:3000
```

Después, desde la carpeta raíz de este repositorio, ejecuta:

```powershell
node server.mjs
```

Abre ELARA en tu navegador:

```text
http://localhost:5500
```

### Configurar el puerto

Si necesitas utilizar otro puerto, puedes establecer la variable de entorno `PORT`:

```powershell
$env:PORT = "5501"
node server.mjs
```

## Comunicación con el backend

ELARA utiliza una capa de comunicación basada en `fetch` para consumir los servicios de su API.

Durante el desarrollo local, el frontend utiliza la ruta `/elara` como prefijo público. El servidor local funciona como proxy y redirige las solicitudes al backend:

```text
Frontend:  /elara/auth/login
                  │
                  ▼
             Proxy local
                  │
                  ▼
Backend:   http://localhost:3000/api/auth/login
```

Esta configuración permite mantener la comunicación bajo el mismo origen, sin modificar los contratos de la API.

La URL base puede configurarse mediante:

```javascript
window.ELARA_API_BASE_URL
```

En el entorno local se utiliza `/elara` de forma predeterminada. En otros entornos, la aplicación utiliza `/api` bajo el origen actual, salvo que se configure otra URL base.

## Autenticación y seguridad

ELARA integra mecanismos de autenticación y control de acceso para ofrecer una experiencia diferenciada según el tipo de usuario.

- Autenticación mediante JSON Web Tokens (JWT).
- Envío del token mediante el encabezado `Authorization: Bearer`.
- Gestión de sesión en el navegador mediante `sessionStorage`.
- Verificación de identidad y rol mediante el servicio de autenticación del backend.
- Control de acceso a las funcionalidades administrativas.
- Gestión de credenciales de visitante mediante cookies HttpOnly.

## Funcionalidades

La interfaz de ELARA está organizada en diferentes secciones:

- **Bienvenida:** pantalla de entrada con identidad visual propia.
- **Catálogo:** exploración de películas, series y anime.
- **Detalles:** consulta de información y contenido relacionado.
- **Reseñas:** publicación y consulta de opiniones y calificaciones.
- **Reacciones:** interacción con las reseñas mediante likes y dislikes.
- **Perfil:** espacio de gestión de la cuenta del usuario.
- **Administración:** herramientas para gestionar el contenido y las categorías disponibles.

## Diseño y experiencia de usuario

ELARA utiliza una identidad visual de estilo oscuro y cinematográfico, con una composición minimalista y elementos gráficos orientados al entretenimiento audiovisual.

La interfaz incorpora:

- Diseño adaptable a dispositivos de escritorio, tabletas y móviles.
- Componentes reutilizables.
- Ventanas modales para formularios, notificaciones y confirmaciones.
- Indicadores visuales para los estados del contenido.
- Navegación diferenciada según la sesión y los permisos del usuario.

## Desarrollo

El frontend está construido con tecnologías web nativas y módulos ES, manteniendo una separación entre la presentación, la lógica de cada sección, los servicios de comunicación y las utilidades compartidas.

El servidor local `server.mjs` permite ejecutar la aplicación y gestionar la comunicación con el backend durante el desarrollo.

---

**ELARA — Explora. Descubre. Comparte.**