Especificaciones Técnicas para Bot de Automatización de Trámites
1. Resumen del Proyecto
El objetivo es desarrollar una aplicación de escritorio (Node.js) que automatice procesos en portales gubernamentales de Argentina. La tarea inicial y fundacional del bot será el "Registro de Obra Publicada", pero la arquitectura está diseñada para ser modular y extensible, permitiendo la adición de nuevas tareas de automatización en el futuro.

El proyecto se construirá sobre una arquitectura de máxima robustez que incluye:

Un protocolo de Desarrollo Orientado a Pruebas (TDD) para calidad desde el inicio.

Un principio de aserción de estado para verificar siempre el contexto antes de actuar.

Un mecanismo de interacción multi-estrategia, que intenta varias formas de localizar un elemento antes de fallar.

Un protocolo de reintentos automáticos para tareas fallidas, aumentando la resiliencia.

Un protocolo de depuración y análisis exhaustivo, que genera un informe detallado del estado de la página al final de cada ejecución en modo de desarrollo, optimizado para la colaboración con agentes de IA.

Una guía de buenas prácticas y estrategias específicas para abordar los desafíos comunes del sitio web objetivo, basada en lecciones aprendidas.

Un ciclo de retroalimentación y optimización basado en el registro de las estrategias de interacción exitosas.

2. Stack Tecnológico
Lenguaje: TypeScript

Framework de Automatización y Pruebas: Playwright

Validación de Datos: Zod

Gestión de Entorno: dotenv

Gestor de Paquetes: NPM

3. Arquitectura General
La arquitectura separa claramente el bot en tiempo de ejecución de las herramientas de desarrollo. Sigue un principio de separación de responsabilidades para garantizar un código modular, mantenible y escalable.

3.1. Diagrama de Componentes del Bot (Tiempo de Ejecución)
graph TD
    subgraph "Input"
        A[📄 Archivo JSON de Entrada]
    end

    subgraph "Aplicación (Bot en Ejecución)"
        B(Orquestador)
        C{Lector y Validador de Datos}
        D{Servicio de Autenticación AFIP}
        E{Servicio de Trámite TAD}
        F[🧩 Page Objects]
        G[⚙️ Gestor del Navegador]
        H[🔧 Configuración]
        I[📝 Logger]
        J[📸 Utilidad de Screenshots]
    end
    
    subgraph "Output (Resultados)"
        K[🖼️ Screenshots (.png)]
        L[📄 Archivos de Log (.log)]
    end

    A --> C; C --> B; H --> B; H --> D
    B --> G; B --> D; D -- Sesión Autenticada --> E
    B --> E; E --> F; G -- Controla --> D; G -- Controla --> E
    
    B -- Registra --> I; D -- Registra --> I; E -- Registra --> I
    D -- Llama en hitos/errores --> J; E -- Llama en hitos/errores --> J
    F -- Llama en hitos/errores --> J
    J -- Guarda en --> K; I -- Escribe en --> L

3.2. Descripción de Componentes del Bot
Componente

Responsabilidad

Orquestador

Coordina el flujo de trabajo del bot. Usa el taskRunner para ejecutar tareas críticas con reintentos. Siempre genera un informe de estado final si está en modo desarrollo. Actualiza el bot_manifest.json después de cada ejecución.

Servicio de Autenticación

Encapsula la lógica para el login en AFIP.

Servicio de Trámite TAD

Encapsula la lógica de negocio para navegar y completar el formulario en TAD.

Page Objects

Representan páginas o componentes de la UI. Contienen los selectores y métodos para interactuar con ellos.

Gestor del Navegador

Crea y gestiona la instancia del navegador (Browser), el contexto y la página (Page) de Playwright.

Lector/Validador de Datos

Lee y valida el JSON de entrada contra un esquema Zod.

Configuración

Carga y provee acceso seguro a variables de entorno (URLs, credenciales).

Logger

Sistema centralizado de logging para registrar eventos, progreso y errores.

Utilidad de Screenshots

Toma y guarda capturas de pantalla en momentos clave y, crucialmente, en caso de error.

4. Estructura de Directorios
bot-registro-obra-publicada-musical/
├── data/
│   └── tramite_ejemplo.json
├── output/
│   └── runs/                     # Carpeta para los artefactos de cada ejecución
│       └── run_[timestamp]/
│           ├── final_state_report/   # Informe del estado final de la página
│           │   ├── README.md
│           │   ├── page_analysis.json
│           │   ├── screenshot.png
│           │   ├── page.html
│           │   ├── accessibility_tree.json
│           │   └── trace.zip
│           ├── failure_report.json   # (Si aplica) Reporte de fallo para IA
│           └── app.log               # Log de la ejecución
├── src/
│   ├── core/
│   │   └── Orchestrator.ts
│   ├── services/
│   │   ├── afipAuth.service.ts
│   │   └── tadRegistration.service.ts
│   ├── pages/
│   │   ├── TadDashboard.page.ts
│   │   └── RegistrationForm.page.ts
│   ├── common/
│   │   ├── browserManager.ts
│   │   ├── logger.ts
│   │   ├── screenshotManager.ts
│   │   ├── debugSnapshot.ts
│   │   ├── interactionHelper.ts
│   │   ├── pageAnalyzer.ts
│   │   └── taskRunner.ts
│   ├── config/
│   │   └── index.ts
│   ├── types/
│   │   ├── tad.types.ts
│   │   └── schema.ts
│   └── main.ts
├── tests/
│   └── ...
├── tools/
│   ├── find-selector.ts
│   └── audit-selectors.ts
├── bot_manifest.json         # Punto de entrada para el Agente IA
├── .env
├── .env.example
├── .gitignore
├── package.json
├── playwright.config.ts
└── tsconfig.json

5. Especificación Detallada de Componentes
5.1. main.ts (Punto de Entrada)
Propósito: Inicia la aplicación.

Responsabilidades: Crear una instancia del Orchestrator, invocar su método principal (run()) y manejar cualquier error fatal que no sea capturado, asegurando que el proceso termine de forma controlada.

5.2. config/index.ts
Propósito: Cargar y exportar variables de entorno de forma segura.

Responsabilidades: Usar dotenv para cargar variables desde .env. Exportar un objeto config inmutable. Lanzar un error al inicio si alguna variable esencial (AFIP_CUIT, AFIP_PASSWORD) no está definida.

5.3. common/logger.ts
Propósito: Configurar y exportar una instancia única del logger (ej. winston).

Responsabilidades: Configurar el logger para que escriba en la consola (con formato y colores) y en un archivo rotativo en output/runs/run_[timestamp]/app.log.

5.4. common/browserManager.ts
Propósito: Gestionar el ciclo de vida de Playwright.

Responsabilidades: Exportar una función initializeBrowser que lanza una instancia del navegador y crea un contexto y una página, y una función closeBrowser que cierra el navegador correctamente.

5.5. common/screenshotManager.ts
Propósito: Centralizar la lógica de capturas de pantalla.

Responsabilidades: Exportar una función takeScreenshot(page, name, type, runPath) que genera un nombre de archivo con timestamp y lo guarda en la carpeta correspondiente dentro del directorio del run actual.

5.6. common/debugSnapshot.ts
Propósito: Generar un paquete completo de información de diagnóstico en un punto específico de la ejecución cuando el DEVELOPER_DEBUG_MODE está activo.

Responsabilidades: Crear una subcarpeta y guardar en ella: screenshot.png (de página completa), page.html, accessibility_tree.json y el trace.zip de Playwright.

5.7. common/pageAnalyzer.ts
Propósito: Realizar un análisis estructural de una página para generar un informe de relevamiento de datos.

Responsabilidades: Exportar async analyzePage(page: Page). La función escaneará el DOM y devolverá un objeto JSON (page_analysis.json) altamente estructurado, agrupando los elementos por contenedores lógicos para que el agente de IA entienda la jerarquía de la página.

5.8. common/interactionHelper.ts
Propósito: Encapsular la lógica del Protocolo de Interacción Multi-Estrategia para una única acción.

Responsabilidades: Iterar sobre una lista de estrategias (localizadores de Playwright), intentar la acción con cada una. Al tener éxito, registrará con un formato claro (SUCCESS_STRATEGY: ...) cuál funcionó. Solo fallará si todas las estrategias son infructuosas.

5.9. common/taskRunner.ts
Propósito: Proveer una función de alto orden para ejecutar tareas con una política de reintentos.

Responsabilidades: Exportar una función async executeWithRetries(task: () => Promise<void>, options: { retries: number, delay: number }). La función ejecutará la task proporcionada. Si la task falla, esperará el delay especificado y la reintentará, hasta el número máximo de retries.

5.10. types/schema.ts (Validación de Datos)
Propósito: Definir la estructura y reglas de validación para el JSON de entrada usando Zod. Esto asegura la integridad de los datos antes de iniciar cualquier automatización.

Esquemas Zod:

import { z } from 'zod';

// Esquemas base para reutilización
const nombreSchema = z.object({
  primerNombre: z.string().min(1),
  segundoNombre: z.string().optional(),
  tercerNombre: z.string().optional(),
});

const apellidoSchema = z.object({
  primerApellido: z.string().min(1),
  segundoApellido: z.string().optional(),
  tercerApellido: z.string().optional(),
});

const fiscalIdSchema = z.object({
  tipo: z.enum(['CUIT', 'CUIL', 'CDI', 'Extranjero', 'Fallecido']),
  numero: z.string().regex(/^\d{2}-\d{8}-\d{1}$/),
});

const domicilioSchema = z.object({
  calleYNumero: z.string().min(1),
  piso: z.string().optional(),
  departamento: z.string().optional(),
  cp: z.string().min(1),
  localidad: z.string().min(1),
  provincia: z.string().min(1),
  pais: z.string().min(1),
});

// Esquema para OBRA con lógica condicional de publicación
const obraBaseSchema = z.object({
    titulo: z.string().min(1),
    tipo: z.enum(['Música', 'Letra', 'Música y letra']),
    album: z.boolean(),
    cantidad_ejemplares: z.number().int().positive(),
    genero_musical: z.string().min(1),
    fecha_publicacion: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, "El formato debe ser DD-MM-AAAA"),
});

export const obraSchema = z.discriminatedUnion("esPublicacionWeb", [
  z.object({
    esPublicacionWeb: z.literal(true),
    urlPaginaWeb: z.string().url("Debe ser una URL válida"),
  }).merge(obraBaseSchema),
  z.object({
    esPublicacionWeb: z.literal(false),
    lugar_publicacion: z.string().min(1, "El lugar de publicación es requerido para publicaciones no web"),
  }).merge(obraBaseSchema),
]);

// Esquema para AUTOR
export const autorSchema = z.object({
  nombre: nombreSchema,
  apellido: apellidoSchema,
  fiscalId: fiscalIdSchema,
  nacionalidad: z.string().min(1),
  rol: z.string().min(1),
});

// Esquema para EDITOR
export const editorSchema = z.object({
  tipoPersona: z.enum(['Persona Juridica', 'Persona Fisica']),
  razonSocial: z.string().optional(),
  nombre: z.string().optional(),
  apellido: z.string().optional(),
  cuit: z.string().regex(/^\d{2}-\d{8}-\d{1}$/),
  email: z.string().email(),
  telefono: z.string().min(1),
  porcentajeTitularidad: z.number().min(0).max(100),
  domicilio: domicilioSchema,
}).superRefine((data, ctx) => {
    if (data.tipoPersona === 'Persona Juridica' && !data.razonSocial) {
        ctx.addIssue({ code: 'custom', message: "Razón Social es requerida para Personas Jurídicas", path: ['razonSocial'] });
    }
    if (data.tipoPersona === 'Persona Fisica' && (!data.nombre || !data.apellido)) {
        ctx.addIssue({ code: 'custom', message: "Nombre y Apellido son requeridos para Personas Físicas", path: ['nombre'] });
    }
});

// Esquema para GESTOR
export const gestorSchema = z.object({
  cuitCuil: z.string().min(1),
  claveAfip: z.string().min(1),
  representado: z.string().min(1),
  emailNotificaciones: z.string().email(),
});

// Esquema completo que une todas las partes
export const tramiteCompletoSchema = z.object({
  obra: obraSchema,
  autores: z.array(autorSchema).min(1),
  editores: z.array(editorSchema).optional(),
  gestor: gestorSchema,
});

5.11. core/Orchestrator.ts
Propósito: El cerebro de la aplicación.

Responsabilidades:

Al final de toda ejecución, dentro de un bloque finally, comprobar si DEVELOPER_DEBUG_MODE es true.

Si lo es, generar el Informe de Estado Final completo (invocando a debugSnapshot y pageAnalyzer) y guardarlo en la carpeta del run actual (output/runs/run_[timestamp]/final_state_report/).

Actualizar bot_manifest.json al final de cada ejecución con el estado final y la ruta a la carpeta del run.

Si la ejecución falló, generar adicionalmente el failure_report.json.

5.12. pages/*.page.ts (Page Object Models)
Propósito: Implementar el patrón Page Object Model.

Responsabilidades:

Implementar async assertIsReady() para verificar el estado de la página.

Definir listas priorizadas de estrategias para cada elemento.

Llamar al interactionHelper para realizar las acciones.

5.13. services/*.service.ts
Propósito: Encapsular la lógica de negocio de alto nivel.

Responsabilidades:

Orquestar las llamadas a los Page Objects.

Llamar siempre a assertIsReady() de un Page Object antes de usarlo.

6. Herramientas de Desarrollo y Ciclo de Mantenimiento
Solución Reactiva de Errores: Cuando el bot falla, el debugSnapshot y el logger proveen toda la evidencia necesaria para una rápida solución.

Refinamiento Proactivo: El script audit-selectors.ts permite analizar la robustez de los selectores existentes y detectar cambios en la UI de forma temprana.

7. Flujo de Ejecución del Bot
El usuario ejecuta npm start.

main.ts invoca al Orchestrator.

El Orchestrator lee y valida el JSON de entrada.

Se inicializa el navegador.

Se ejecuta AfipAuthService para realizar el login.

Si el login es exitoso, se ejecuta TadRegistrationService, que utiliza los Page Objects para completar el trámite.

Al finalizar (con éxito o error), el Orchestrator cierra el navegador.

8. Archivos de Configuración
.gitignore: Debe incluir node_modules/, dist/, output/, y .env.

.env.example: Debe listar las variables necesarias sin sus valores:

# Credenciales para la ejecución del Bot
AFIP_CUIT=
AFIP_PASSWORD=

# Activa la generación de snapshots de depuración detallados en cada paso
DEVELOPER_DEBUG_MODE=false

package.json: Debe incluir scripts para start, build, test y los scripts de las herramientas.

tsconfig.json: Configuración estándar para un proyecto Node.js con TypeScript.

9. Ejemplo de Datos de Entrada (tramite_ejemplo.json)
{
  "obra": {
    "titulo": "Rio y Mar",
    "tipo": "Música y letra",
    "album": false,
    "cantidad_ejemplares": 500,
    "genero_musical": "Rock",
    "esPublicacionWeb": false,
    "lugar_publicacion": "Ciudad Autónoma de Buenos Aires",
    "fecha_publicacion": "24-11-2025"
  },
  "autores": [
    {
      "nombre": { "primerNombre": "Pedro" },
      "apellido": { "primerApellido": "Sanchez" },
      "fiscalId": { "tipo": "CUIT", "numero": "20-11111111-1" },
      "nacionalidad": "Argentina",
      "rol": "Música y Letra"
    }
  ],
  "editores": [
    {
      "tipoPersona": "Persona Juridica",
      "razonSocial": "EPSA Publishing S.A.",
      "cuit": "33-70957838-9",
      "email": "mgonzalez@epsapublishing.com.ar",
      "telefono": "15 5454 4444",
      "porcentajeTitularidad": 5,
      "domicilio": {
        "calleYNumero": "Vera 410", "piso": "5", "departamento": "B", "cp": "1414",
        "localidad": "CIUDAD AUTÓNOMA DE BUENOS AIRES", "provincia": "CIUDAD AUTÓNOMA DE BUENOS AIRES", "pais": "Argentina"
      }
    }
  ],
  "gestor": {
    "cuitCuil": "20352552721",
    "claveAfip": "Levitateme5023",
    "representado": "EPSA PUBLISHING S A",
    "emailNotificaciones": "nmaeso@gmal.com"
  }
}

10. Protocolo de Colaboración con Agente de IA
Para optimizar el desarrollo asistido por IA, la arquitectura se centra en proveer un contexto claro y estructurado a través del archivo bot_manifest.json.

bot_manifest.json
Este archivo es la "conciencia" del proyecto, el punto de partida para cualquier consulta del agente de IA.

Estructura Propuesta:

{
  "projectName": "bot-registro-obra-publicada-musical",
  "lastRun": {
    "timestamp": "2025-06-21T15:37:00Z",
    "status": "TESTS_FAILED" | "SUCCESS",
    "summary": "2 out of 5 tests failed.",
    "runArtifactsPath": "output/runs/run_12345/"
  }
}

Flujos de Trabajo Asistidos por IA
Para Corregir un Error:

El desarrollador ejecuta npm test.

El Orchestrator actualiza bot_manifest.json.

El desarrollador pide a la IA: "El último run falló. Usa la información en bot_manifest.json para analizar el failure_report.json y los artefactos asociados en la carpeta del run y propón una solución."

La IA lee el manifiesto, navega a la carpeta de artefactos y realiza un análisis completo.

Para Añadir una Nueva Tarea:

El desarrollador se asegura de que DEVELOPER_DEBUG_MODE está en true y ejecuta el bot (npm start).

El bot completa sus tareas y genera automáticamente el informe de estado final. El Orchestrator actualiza el bot_manifest.json.

El desarrollador pide a la IA: "Quiero añadir una nueva tarea. Utiliza el informe de estado final del último run, cuya ruta está en bot_manifest.json, para crear un esqueleto para una nueva tarea."

La IA lee el manifiesto, encuentra la ruta al final_state_report, parsea el page_analysis.json y genera el código inicial.

Nota importante: Los prompts mencionados son ejemplos ilustrativos. El desarrollador puede utilizar estos o prompts similares para interactuar con el agente de IA, adaptándolos según la necesidad específica del momento.

11. Protocolo de Desarrollo Orientado a Pruebas (TDD)
Principio: El desarrollador escribe primero una prueba que falla (Rojo), luego implementa el código mínimo para que pase (Verde), y finalmente limpia el código (Refactorizar).

Herramienta Clave: El DEVELOPER_DEBUG_MODE y el trace.zip se usan proactivamente para escribir el código que hace pasar la prueba, convirtiendo la depuración en parte del flujo de desarrollo.

12. Protocolo de Interacción Multi-Estrategia
Principio: Para cada acción crítica, el bot tendrá múltiples caminos para lograr su objetivo. La resiliencia está incorporada en el nivel más bajo de interacción.

Implementación: El interactionHelper intenta una lista priorizada de estrategias (por Rol ARIA, por Texto, por data-testid, por patrón de CSS, etc.) para cada interacción.

Ciclo de Retroalimentación y Optimización: Los logs de SUCCESS_STRATEGY se usan periódicamente para reordenar las listas de estrategias en los Page Objects, priorizando las más efectivas.

13. Guía de Desarrollo y Estrategias (Lecciones Aprendidas)
El Decálogo del Desarrollador del Bot
1. La Grabación es la Verdad Absoluta (page.pause())
Ante la duda, pausar la ejecución con await page.pause() y usar el "Playwright Inspector" para grabar la interacción.

2. Buscar Patrones en IDs Dinámicos
Identificar las partes constantes de los IDs generados dinámicamente y usar selectores de atributos CSS ([id$="-btn"]).

3. Ser Explícito con los Clics Asíncronos
Usar click({ noWaitAfter: true }) seguido de una pausa explícita await page.waitForTimeout(2000) para acciones que no recargan la página.

4. Robustecer la Búsqueda con Contexto y Roles
Evitar selectores genéricos. Acotar la búsqueda a un contenedor de sección y luego buscar por rol o texto.

5. Optimizar Estrategias Basado en Logs
Revisar periódicamente los logs de SUCCESS_STRATEGY para reordenar las listas de estrategias en los Page Objects.

14. Protocolo de Análisis de Estado y Extensibilidad
Principio: La arquitectura garantiza que un análisis detallado del estado final de la aplicación sea un artefacto estándar de cada ejecución en modo de desarrollo, eliminando la necesidad de un modo exploratorio separado.

Flujo de Trabajo Optimizado para Extensibilidad:

Asegurar el Modo Desarrollo: El desarrollador verifica que DEVELOPER_DEBUG_MODE=true en su archivo .env.

Ejecutar el Bot: Se ejecuta el flujo de tareas actual (npm start o npm test).

Revisar el Informe Generado: Al finalizar, navega a la carpeta output/runs/run_[timestamp]/final_state_report/. Aquí encontrará el README.md y todos los demás artefactos que describen perfectamente el punto de partida para la nueva tarea.

Desarrollo Acelerado: Con este mapa detallado y siempre disponible, puede comenzar inmediatamente el ciclo TDD para la nueva funcionalidad.

15. Protocolo de Reintentos Automáticos
Principio: Las tareas lógicas completas y críticas (no las interacciones individuales) no deben fallar al primer intento.

Diferencia Clave:

Interacción Multi-Estrategia (Nivel Bajo): Resuelve problemas de selectores.

Reintentos de Tareas (Nivel Alto): Resuelve problemas de estado temporal de la página o de la red, reintentando un proceso completo.

Flujo: El Orchestrator usa una utilidad taskRunner para envolver la ejecución de servicios críticos (como el login), dándoles varias oportunidades de éxito antes de declarar un fallo definitivo.