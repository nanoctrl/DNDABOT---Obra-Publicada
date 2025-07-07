# registro-obras-bot

Bot para automatizar el registro de obras musicales en DNDA Argentina (AFIP→TAD).

## Estado: v2.6.0 - PRODUCTION-READY (36/36 pasos)

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
- Flujo completo: <3min

### 5. ZK Framework
```typescript
// ❌ MALO: IDs dinámicos
page.locator('#s5IQj')

// ✅ BUENO: Atributos estables
page.locator('[name="campo"]')
page.locator('tr:has-text("texto") button')
```

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