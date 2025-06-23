# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-06-23

### Agregado
- Implementación de las primeras 17 tareas del bot de registro de obras musicales
- Actualización del schema para soportar el formato de obras musicales según DNDA
- Nuevos métodos en `AfipAuthService` para autenticación a través de TAD:
  - `navigateToTad()`: Navega a la página principal de TAD
  - `clickIngresar()`: Hace click en el botón INGRESAR
  - `clickAfipClaveFiscal()`: Selecciona la opción de login con AFIP
  - `ingresarCuit()`: Ingresa el CUIT del usuario
  - `clickSiguiente()`: Avanza al siguiente paso
  - `ingresarClave()`: Ingresa la clave fiscal
  - `clickIngresarAfip()`: Completa el login en AFIP
  - `seleccionarRepresentado()`: Selecciona la entidad a representar
- Nuevos métodos en `TadRegistrationService` para el proceso de registro:
  - `buscarTramite()`: Busca el trámite de inscripción de obra musical
  - `clickIniciarTramite()`: Inicia el trámite seleccionado
  - `clickContinuar()`: Avanza en el proceso
  - `completarCaratula()`: Abre el formulario de carátula
  - `seleccionarOpcionSi()`: Selecciona "SI" en el dropdown
  - `insertarEmailNotificaciones()`: Ingresa email para notificaciones
  - `guardarDatosTramite()`: Guarda los datos ingresados
  - `completarCondicionesTramite()`: Completa la sección de condiciones
  - `completarDatosObra()`: Abre el formulario de datos de obra

### Modificado
- `schema.ts`: Actualizado para soportar el formato completo de obras musicales:
  - Campo `tipo`: "Música", "Letra" o "Música y letra"
  - Campo `album`: booleano
  - Campo `cantidad_ejemplares`: número entero positivo
  - Campo `genero_musical`: string requerido
  - Campo `esPublicacionWeb`: booleano
  - Campo `fecha_publicacion`: formato DD-MM-YYYY
  - Schemas para `Autor`, `Editor` y `Gestor`
- `dataReader.ts`: Simplificado para trabajar solo con obras musicales
- Flujo principal del bot ahora sigue el proceso real de TAD

### Técnico
- Implementación del patrón de multi-estrategia para cada interacción
- Uso de selectores XPath específicos basados en el script Python de referencia
- Manejo robusto de elementos dinámicos (dropdowns, botones con estilos inline)
- Screenshots automáticos en puntos clave del proceso
- Logging detallado de cada acción para facilitar debugging

## [1.0.0] - 2025-06-22

### Inicial
- Estructura base del proyecto según arquitectura definida
- Configuración de TypeScript, Playwright y herramientas de desarrollo
- Sistema de logging con Winston
- Gestión de configuración con dotenv
- Utilidades comunes (browserManager, screenshotManager, debugSnapshot, etc.)
- Page Objects base (TadDashboard, RegistrationForm)
- Servicios base (AfipAuth, TadRegistration)
- Herramientas de desarrollo (find-selector, audit-selectors)
