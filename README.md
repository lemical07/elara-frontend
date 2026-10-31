# ELARA Frontend

Frontend de **ELARA**, una aplicación web para la gestión de una biblioteca, su catálogo de libros, préstamos, inventario y ventas.

El proyecto utiliza tecnologías web nativas y está diseñado para consumir la API REST desarrollada en el backend de ELARA.

## Tecnologías

- HTML5
- CSS3
- JavaScript
- Fetch API para las solicitudes HTTP
- API REST del backend
- Git para el control de versiones

No se utilizan frameworks de frontend ni dependencias adicionales sin autorización.

## Estructura del proyecto

```text
elara-frontend/
├── styles/
│   ├── components.css
│   └── main.css
├── js/
│   ├── components/
│   ├── config/
│   │   └── config.js
│   ├── pages/
│   ├── services/
│   │   └── api.js
│   └── utils/
├── pages/
│   ├── admin.html
│   ├── catalog.html
│   ├── details.html
│   └── profile.html
├── assets/
│   ├── icons/
│   └── images/
├── .gitignore
├── index.html
└── README.md
```

### Responsabilidades

| Directorio o archivo | Responsabilidad |
|---|---|
| `styles/` | Hojas de estilo globales y estilos reutilizables de componentes. |
| `js/components/` | Componentes de interfaz reutilizables, si se necesitan. |
| `js/config/` | Configuración del frontend, incluida la URL base de la API. |
| `js/pages/` | Lógica JavaScript específica de cada página. |
| `js/services/` | Comunicación con el backend mediante solicitudes HTTP. |
| `js/utils/` | Funciones auxiliares reutilizables. |
| `pages/` | Páginas HTML secundarias. |
| `assets/icons/` | Iconos utilizados en la interfaz. |
| `assets/images/` | Imágenes y otros recursos gráficos. |
| `index.html` | Página principal de la aplicación. |

Esta estructura es la organización prevista para el proyecto. Los directorios y módulos pueden ampliarse cuando exista una necesidad funcional concreta.

## Funcionalidades previstas

El frontend deberá permitir, según los permisos del usuario y las capacidades disponibles en el backend:

- Consultar el catálogo de libros.
- Buscar y visualizar información de los libros.
- Consultar categorías y autores.
- Iniciar sesión y gestionar la sesión del usuario.
- Consultar información del perfil.
- Gestionar préstamos y devoluciones según los permisos.
- Consultar y administrar el inventario.
- Registrar y consultar ventas.
- Acceder a las funcionalidades administrativas autorizadas.

La implementación de cada funcionalidad deberá verificarse antes de considerarla terminada.

## Configuración

La URL base del backend se gestionará mediante el módulo de configuración del frontend.

Ejemplo ilustrativo:

```javascript
export const API_BASE_URL = "http://localhost:3000/api";
```

**Importante:** el puerto y el prefijo `/api` son ejemplos. Deben coincidir con la configuración real del backend.

No se deben almacenar contraseñas, claves privadas ni otros secretos en el código del frontend.

## Ejecución local

1. Clona el repositorio.
2. Abre el proyecto en Visual Studio Code.
3. Comprueba la URL y el puerto configurados para el backend.
4. Ejecuta el backend y verifica que la API esté disponible.
5. Abre `index.html` mediante un servidor HTTP local compatible con el proyecto.
6. Comprueba la comunicación con la API y la configuración de CORS.

Si los módulos JavaScript utilizan `import` y `export`, es preferible ejecutar el frontend mediante un servidor HTTP local en lugar de abrir directamente los archivos con `file://`.

## Integración con el backend

El frontend se comunicará con la API utilizando `fetch`.

Las solicitudes deberán respetar los endpoints, métodos HTTP, parámetros, estructuras JSON, códigos de respuesta y permisos definidos por el backend.

Los tokens de autenticación y los errores deberán gestionarse de acuerdo con el mecanismo de seguridad implementado por la API.

No se deben asumir endpoints ni estructuras de respuesta que todavía no hayan sido confirmados.

## Convenciones de desarrollo

- Utilizar nombres de archivos, carpetas, variables y funciones en inglés.
- Mantener en español los textos visibles para los usuarios, salvo que se defina otro idioma.
- Separar la lógica de comunicación con la API de la lógica específica de cada página.
- Reutilizar funciones y estilos cuando sea conveniente.
- Mantener el código organizado y evitar dependencias innecesarias.
- Utilizar mensajes de commit en inglés siguiendo Conventional Commits.
- No incorporar dependencias nuevas sin autorización.

## Estado del proyecto

El frontend se encuentra en fase de preparación y desarrollo.

La estructura inicial está organizada para facilitar la implementación progresiva de las páginas, los estilos, los servicios HTTP y la integración con el backend.

Las funcionalidades se marcarán como completadas únicamente después de su implementación y verificación.

## Repositorio relacionado

Este repositorio forma parte del proyecto ELARA y complementa el backend y la configuración de la base de datos, mantenidos en sus respectivos repositorios.

---

**ELARA Frontend** — Interfaz web para la gestión de una biblioteca.