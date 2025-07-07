# registro-obras-bot

Bot para automatizar el registro de obras musicales en DNDA Argentina (AFIP→TAD).

## Estado: v2.6.2 - PRODUCTION-READY (36/36 pasos) + ADVANCED ANALYSIS

## Inicio Rápido
```bash
npm start                              # Ejecutar normal
DEVELOPER_DEBUG_MODE=true npm start    # Modo debug
```

## Para Claude Code: Contexto Esencial

### 1. Leer Primero
- `CHANGELOG.md` (últimas 5 entradas)
- `docs/Protocolo_de_agregado_de_pasos.md`
- `src/config/steps.config.ts` (definición de pasos)
- `docs/best_practices_for_this_project.md`
- `docs/Post_Failure_Analysis_System.md`
- `docs/TECNICAS_SELECTORES_ROBUSTOS.md`

### 2. Arquitectura
- **Entrada**: `data/tramite_ejemplo.json`
- **Flujo**: Orchestrator → Services → Page Objects → Playwright
- **Salida**: `output/{screenshots,logs,runs}`

### 3. Patrones Críticos
```typescript
// SUCCESS_STRATEGY = código optimizado, NO cambiar orden
// Multi-strategy para cada interacción
// Verificar estado real, no solo click
// Screenshots antes/después de acciones críticas
```

### 4. Performance Benchmarks
- Paso 9: <2s (300% optimizado)
- Paso 13: <2s (6400% optimizado) 
- Paso 16: <1s (5000% optimizado)
- **Paso 36**: Análisis simplificado + capturas (3-5s)
- Flujo completo: <3min

### 5. ZK Framework
```typescript
// ❌ MALO: IDs dinámicos
page.locator('#s5IQj')

// ✅ BUENO: Atributos estables
page.locator('[name="campo"]')
page.locator('tr:has-text("texto") button')
```

## Outputs de Análisis

### Step 36 - Estructura de Análisis
```
output/runs/step36_final_analysis_[timestamp]/
├── step36_analysis_report_[timestamp].md        # Reporte desarrollo
├── step36_dom_analysis_[timestamp].json         # DOM completo
├── step36_interactive_elements_[timestamp].json # Elementos clickeables
├── step36_screenshots_[timestamp]/             # Capturas viewport
├── step36_state_[timestamp]/                   # HTML + ZK components
└── step36_logs_[timestamp]/                    # Logs + performance
```

### Cleanup Levels
- **basic**: screenshots/debug, logs (keep 3 days)
- **full**: runs, analysis, state (keep 1 day)  
- **all**: todo except .gitkeep (keep 0 days)

## Estructura de Datos

### Obra (Web)
```json
{
  "titulo": "string",
  "tipo": "Música y letra|Música|Letra",
  "esPublicacionWeb": true,
  "urlPaginaWeb": "https://...",  // REQUERIDO si web
  "fecha_publicacion": "DD-MM-YYYY"
}
```

### Autores
```json
{
  "nombre": { "primerNombre": "req" },
  "apellido": { "primerApellido": "req" },
  "fiscalId": { "tipo": "CUIT|CUIL|Extranjero", "numero": "XX-XXXXXXXX-X" },
  "rol": "Música y Letra"  // ENUM estricto
}
```

### Editores
```json
{
  "tipoPersona": "Persona Juridica|Persona Fisica",
  "razonSocial": "si juridica",
  "nombre/apellido": "si fisica",
  "porcentajeTitularidad": 50  // cualquier % permitido
}
```

## Agregar Nuevos Pasos

1. Definir en `src/config/steps.config.ts`
2. Implementar en servicio correspondiente
3. Usar multi-strategy pattern
4. Verificar estado real
5. Documentar en `CHANGELOG.md`

## Comandos Útiles
```bash
grep -r "SUCCESS_STRATEGY" src/       # Ver optimizaciones
grep -r "step.*31" src/              # Buscar implementación
npm run tools:find-selector          # Herramienta selectores

# Limpieza de archivos de salida
npm run clean:dry-run                 # Ver qué se eliminaría
npm run clean:basic                   # Limpieza básica (keep 3 días)
npm run clean:full                    # Limpieza completa (keep 1 día)
npm run clean:all                     # Eliminar todo (¡CUIDADO!)

# Step 36 - Análisis simplificado con timeout protection
# Genera: Basic DOM analysis, single full-page screenshot, state capture
# Timeout: 10s máximo para evitar cuelgues
# Screenshot: 1 captura completa (optimizado desde múltiples)
```

## Reglas Críticas
- NUNCA cambiar orden de SUCCESS_STRATEGY
- NUNCA usar IDs dinámicos ZK
- SIEMPRE verificar con screenshots
- SIEMPRE documentar en changelog

## Documentación Completa

### Documentos Técnicos en `/docs/`
- `CLAUDE_TECHNICAL.md` - Arquitectura y patrones técnicos detallados
- `CLAUDE_WORKFLOW.md` - Descripción completa de los 36 pasos
- `Protocolo_de_agregado_de_pasos.md` - Protocolo v2.0 para agregar nuevos pasos
- `best_practices_for_this_project.md` - Mejores prácticas específicas del proyecto
- `Post_Failure_Analysis_System.md` - Sistema de análisis de fallos
- `TECNICAS_SELECTORES_ROBUSTOS.md` - Framework ZK y técnicas de selectores
- `IMPLEMENTATION_GUIDE.md` - Guía de implementación
- `RELEASE_NOTES_v1.1.0.md` - Notas de versiones anteriores