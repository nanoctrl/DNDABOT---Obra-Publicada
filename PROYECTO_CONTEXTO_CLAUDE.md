# Contexto del Proyecto: Bot de Registro de Obras Musicales

## Información General del Proyecto

**Nombre del Proyecto**: registro-obras-bot  
**Ubicación**: `/Users/nahuelmaeso/Desktop/DemoJupiter/CLAUDE.BOTDNDA/registro-obras-bot`  
**Propósito**: Automatización del proceso de registro de obras musicales publicadas en los sistemas gubernamentales argentinos (AFIP y TAD - Trámites a Distancia)  
**Estado Actual**: v1.1.0 - Implementadas 17 de X tareas totales del flujo de registro

## Objetivo del Proyecto

El bot automatiza el proceso completo de registro de obras musicales que normalmente requiere:
1. Autenticación en AFIP con clave fiscal
2. Navegación y autenticación en TAD (Trámites a Distancia)
3. Búsqueda del trámite "inscripción de obra publicada - musical"
4. Completado de múltiples formularios con datos de la obra, autores y editores
5. Envío y confirmación del trámite

## Arquitectura Técnica

### Stack Tecnológico
- **Runtime**: Node.js v18+
- **Lenguaje**: TypeScript
- **Framework de Automatización**: Playwright
- **Validación de Datos**: Zod
- **Logging**: Winston
- **Testing**: Jest
- **Gestión de Estado**: Patrón Page Object Model (POM)

### Estructura de Directorios

```
/Users/nahuelmaeso/Desktop/DemoJupiter/CLAUDE.BOTDNDA/registro-obras-bot/
├── data/                    # Archivos JSON de entrada con datos de obras
│   └── tramite_ejemplo.json # Ejemplo de estructura de datos requerida
├── output/                  # Resultados de ejecución
│   ├── runs/               # Artefactos de cada ejecución individual
│   ├── screenshots/        # Capturas de pantalla del proceso
│   └── logs/              # Archivos de log rotativos
├── src/                    # Código fuente principal
│   ├── common/            # Utilidades compartidas
│   │   ├── browserManager.ts      # Gestión del navegador Playwright
│   │   ├── interactionHelper.ts   # Estrategias multi-selector para elementos
│   │   ├── logger.ts             # Sistema de logging centralizado
│   │   ├── screenshotManager.ts  # Gestión de capturas de pantalla
│   │   ├── debugSnapshot.ts      # Snapshots para debugging
│   │   └── taskRunner.ts         # Ejecutor de tareas con reintentos
│   ├── config/            # Configuración
│   │   └── index.ts       # Configuración centralizada y variables de entorno
│   ├── core/              # Lógica principal
│   │   ├── orchestrator.ts       # Orquestador principal del flujo
│   │   ├── dataReader.ts         # Lector de archivos JSON de entrada
│   │   └── manifestUpdater.ts   # Actualizador del manifiesto de ejecución
│   ├── pages/             # Page Objects (no implementados aún)
│   ├── services/          # Servicios de negocio
│   │   ├── afipAuth.service.ts      # Autenticación en AFIP
│   │   └── tadRegistration.service.ts # Proceso de registro en TAD
│   └── types/             # Tipos y esquemas TypeScript
│       ├── schema.ts      # Esquemas Zod para validación
│       └── tad.types.ts   # Tipos específicos de TAD
├── tests/                 # Pruebas unitarias e integración
├── tools/                 # Herramientas de desarrollo
├── .env                   # Variables de entorno (credenciales)
├── package.json           # Dependencias y scripts
└── tsconfig.json         # Configuración TypeScript
```

## Flujo de Ejecución Actual

### Tareas Implementadas (17 de X)
1. ✅ Navegación a TAD
2. ✅ Click en "INGRESAR"
3. ✅ Selección de "AFIP con tu clave fiscal"
4. ✅ Ingreso de CUIT
5. ✅ Click en "Siguiente"
6. ✅ Ingreso de contraseña
7. ✅ Click en "Ingresar" (AFIP)
8. ✅ Selección de representado (con búsqueda por similitud 90%+)
9. ✅ Búsqueda de trámite "inscripción de obra publicada - musical"
10. ✅ Click en "Iniciar Trámite"
11. ✅ Click en "CONTINUAR"
12. ✅ Completar carátula
13. ✅ Selección "SI" en dropdown
14. ✅ Inserción de email de notificaciones
15. ✅ Guardar datos del trámite
16. ✅ Completar condiciones del trámite
17. ✅ Apertura del formulario de datos de obra

### Tareas Pendientes
- Completar campos específicos del formulario de obra musical
- Gestión de autores (agregar, editar datos)
- Gestión de editores (agregar, editar datos)
- Carga de archivos adjuntos
- Revisión y confirmación final
- Envío del trámite

## Características Técnicas Clave

### 1. Sistema de Interacción Multi-Estrategia
Cada interacción con elementos web implementa múltiples estrategias de selección para maximizar la robustez:
```typescript
- Selector por ID
- Selector por clase CSS
- Selector por texto
- Selector por rol ARIA
- Selector por atributos
```

### 2. Búsqueda por Similitud
Implementa el algoritmo de Levenshtein para encontrar opciones con ≥90% de similitud en dropdowns, tolerando variaciones menores en el texto.

### 3. Modo Debug Avanzado
Cuando `DEVELOPER_DEBUG_MODE=true`:
- Genera snapshots completos en cada paso crítico
- Pausa la ejecución para inspección manual
- Crea informes detallados con análisis de página
- Guarda el estado completo del DOM

### 4. Sistema de Reintentos
Implementa reintentos automáticos con backoff exponencial para operaciones críticas.

## Configuración Requerida

### Variables de Entorno (.env)
```
AFIP_CUIT=20352552721              # CUIT para autenticación
AFIP_PASSWORD=Levitateme5023        # Contraseña AFIP
DEVELOPER_DEBUG_MODE=false          # Modo debug (true/false)
NODE_ENV=development               # Entorno
LOG_LEVEL=info                     # Nivel de logging
```

### Estructura de Datos de Entrada (data/tramite_ejemplo.json)
```json
{
  "obra": {
    "titulo": "string",
    "tipo": "Música y letra",
    "album": boolean,
    "cantidad_ejemplares": number,
    "genero_musical": "string",
    "esPublicacionWeb": boolean,
    "lugar_publicacion": "string",
    "fecha_publicacion": "DD-MM-YYYY"
  },
  "autores": [{
    "nombre": { "primerNombre": "string" },
    "apellido": { "primerApellido": "string" },
    "fiscalId": { "tipo": "CUIT", "numero": "string" },
    "nacionalidad": "string",
    "rol": "string"
  }],
  "editores": [{
    "tipoPersona": "Persona Juridica",
    "razonSocial": "string",
    "cuit": "string",
    "email": "string",
    "telefono": "string",
    "porcentajeTitularidad": number,
    "domicilio": { ... }
  }],
  "gestor": {
    "cuitCuil": "string",
    "claveAfip": "string",
    "representado": "string",
    "emailNotificaciones": "string"
  }
}
```

## Puntos de Entrada y Ejecución

### Scripts Principales
- `npm start` - Ejecuta el bot en modo normal
- `npm run explore` - Modo exploración para debugging
- `npm test` - Ejecuta suite de pruebas
- `npm run tools:find-selector` - Herramienta interactiva para encontrar selectores
- `npm run tools:audit` - Audita selectores existentes

### Archivos de Entrada Críticos
- **Orchestrator**: `src/core/orchestrator.ts` - Punto de entrada principal
- **Servicios**: 
  - `src/services/afipAuth.service.ts` - Maneja autenticación AFIP
  - `src/services/tadRegistration.service.ts` - Maneja registro en TAD

## Estado de Desarrollo

### Completado
- Infraestructura base y arquitectura
- Sistema de autenticación AFIP completo
- Navegación y búsqueda de trámites
- Inicio del proceso de registro
- Completado de carátula y condiciones
- Sistema de logging y debugging robusto

### En Progreso
- Mapeo de campos del formulario de obra musical
- Implementación de Page Objects para mejor mantenibilidad

### Pendiente
- Gestión completa de autores y editores
- Manejo de archivos adjuntos
- Proceso de envío final
- Suite completa de pruebas automatizadas

## Consideraciones Técnicas Importantes

1. **URLs Objetivo**:
   - TAD: https://tramitesadistancia.gob.ar
   - AFIP: Sistema de autenticación integrado

2. **Timeouts Críticos**:
   - Navegación: 30 segundos
   - Interacción con elementos: 10 segundos
   - Carga de página: networkidle

3. **Manejo de Errores**:
   - El bot continúa la ejecución ante fallos no críticos
   - Genera reportes detallados de fallos
   - Toma screenshots en puntos de error

4. **Limitaciones Conocidas**:
   - Dependiente de la estructura HTML de los sitios gubernamentales
   - Requiere credenciales válidas de AFIP
   - El representado debe existir en el sistema

Este proyecto está diseñado para ser mantenible, extensible y robusto ante cambios menores en las interfaces web objetivo.
