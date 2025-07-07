# Sistema de Análisis Post-Fallo (Failure-Triggered Analysis)

## Descripción General

El sistema de análisis post-fallo proporciona **visibilidad total del contexto HTML SOLO cuando las tareas fallan**, maximizando la **eficiencia** en ejecuciones exitosas mientras ofrece **debugging avanzado** cuando hay problemas. 

> **🎯 EFICIENCIA FIRST**: Intenta las tareas primero. Solo cuando fallan, activa el análisis completo.

## Componentes Principales

### 1. PageAnalyzer Mejorado (`src/common/pageAnalyzer.ts`)

#### Funciones Principales

```typescript
// Nueva función para análisis SOLO en caso de fallo
analyzeStepFailure(
  page: Page, 
  stepNumber: number, 
  stepDescription: string, 
  error: Error
): Promise<void>

// Análisis específico para depósito digital (activado solo en fallos)
analyzeDepositoDigitalContext(page: Page): Promise<DepositoAnalysis>

// Análisis general de página (usado internamente por funciones de fallo)
analyzePage(page: Page): Promise<PageAnalysis>
```

#### Estrategias de Detección

**Para Botones Dropdown:**
1. `button[id$="-btn"]` - Botones con ID que termina en `-btn`
2. `button[class*="dropdown"]` - Botones con clase que contiene "dropdown"
3. `[role="combobox"]` - Elementos con rol combobox
4. `.form-group button` - Botones dentro de form-group
5. `div:has-text("depósito") button` - Botones cerca del texto "depósito"
6. `button:visible` - Cualquier botón visible

**Para Opciones "Si":**
1. `td:has-text("Si")` - Celdas de tabla con texto "Si"
2. `[role="cell"]:has-text("Si")` - Elementos con rol cell
3. `option:has-text("Si")` - Opciones de select
4. `li:has-text("Si")` - Items de lista
5. `[role="option"]:has-text("Si")` - Elementos con rol option
6. `*:has-text("Si"):visible` - Cualquier elemento visible con "Si"

### 2. Integración Failure-Triggered en TAD Registration Service

#### Enfoque Failure-Triggered por Paso

```typescript
// Ejemplo de implementación en Paso 13 - EFICIENCIA FIRST
try {
  // ESTRATEGIA 1: Intentar selector más probable
  await this.page.locator('div:has-text("Modo de depósito")').locator('button[id$="-btn"]').click();
  await this.page.getByRole('cell', { name: 'Si', exact: true }).click();
  stepTracker.logSuccess(13, 'Depósito digital: Si (contextual)');
  
} catch (contextError) {
  try {
    // ESTRATEGIA 2: Fallback por texto
    await this.page.locator('text="¿Usted opta por depositar..."').locator('..').locator('button').click();
    // ...
  } catch (textError) {
    try {
      // ESTRATEGIA 3: Page Object
      await this.datosTramitePage.selectDepositoDigital('Si');
    } catch (pageObjectError) {
      // TODAS LAS ESTRATEGIAS FALLARON - ACTIVAR ANÁLISIS
      const depositoContext = await analyzeDepositoDigitalContext(this.page);
      
      // Usar elementos encontrados en análisis
      if (depositoContext.dropdownButtons.length > 0) {
        for (const button of depositoContext.dropdownButtons) {
          // Intentar cada botón encontrado...
        }
      }
      
      if (!success) {
        // FALLO COMPLETO - ANÁLISIS POST-FALLO PARA DEBUGGING
        await analyzeStepFailure(this.page, 13, 'Seleccionar Si...', finalError);
      }
    }
  }
}
```

## Archivos de Salida

### Análisis JSON de Fallo (Solo cuando algo falla)

Ubicación: `output/analysis/failures/FAILURE_step{N}_{timestamp}.json`

```json
{
  "type": "STEP_FAILURE_ANALYSIS",
  "stepNumber": 13,
  "stepDescription": "Seleccionar Si en depósito digital",
  "timestamp": "2025-06-27T15:30:00.000Z",
  "screenshot": {
    "filename": "FAILURE_step13_2025-06-27T15-30-00-000Z.png",
    "path": "output/screenshots/error/FAILURE_step13_2025-06-27T15-30-00-000Z.png",
    "description": "Screenshot captured at moment of failure for step 13"
  },
  "error": {
    "message": "Timeout 30000ms exceeded",
    "stack": "TimeoutError: Timeout 30000ms exceeded...",
    "name": "TimeoutError"
  },
  "pageAnalysis": {
    "url": "https://tad.argentina.gob.ar/...",
    "title": "Trámites a Distancia",
    "interactiveElements": {
      "buttons": [...],
      "inputs": [...],
      "selects": [...]
    },
    "forms": [...]
  },
  "depositoDigitalContext": {
    "section": {...},
    "dropdownButtons": [
      {
        "tag": "button",
        "id": "kL9mN-btn",
        "classes": ["btn", "dropdown-toggle"],
        "text": "Seleccionar",
        "isVisible": true,
        "isEnabled": true
      }
    ],
    "options": [...],
    "recommendedSelectors": [...]
  },
  "recommendations": [
    "🕐 TIMEOUT detectado - el elemento puede tardar más en aparecer",
    "🔧 SOLUCIÓN: Aumentar waitForTimeout o usar waitForSelector",
    "✅ DISPONIBLES: 3 botones dropdown detectados"
  ],
  "possibleSolutions": [
    "SELECTOR ANALYSIS:",
    "  await page.locator('#kL9mN-btn').click(); // Botón 1: \"Seleccionar\"",
    "TIMEOUT SOLUTIONS:",
    "  await page.waitForSelector('selector', { timeout: 60000 });"
  ]
}
```

## Logging Mejorado

### Ejemplo de Salida de Logs

```bash
🔍 ANÁLISIS COMPLETO - PASO 13: Seleccionar Si en depósito digital
================================================================================
🔍 Analizando contexto específico de depósito digital...
✅ Sección encontrada: div:has-text("Modo de depósito")
🎯 Probando estrategia: Botones con ID que termina en -btn - encontrados 3 elementos
  📌 Botón: button#kL9mN-btn.btn - "Seleccionar"
  📌 Botón: button#mP8qR-btn.dropdown-toggle - ""
🎯 Probando estrategia opciones: Celdas con texto Si - encontrados 2 elementos
  📌 Opción: td - "Si"

📊 RESUMEN DEL ANÁLISIS:
  • Sección depósito: ✅ Encontrada
  • Botones dropdown: 3 encontrados
  • Opciones "Si": 2 encontradas
  • Selectores recomendados: 6

🎯 ESTRATEGIA 1: Usando botones encontrados en análisis...
  📌 Intentando botón 1: button#kL9mN-btn - "Seleccionar"
✅ Opción "Si" seleccionada usando análisis dirigido

📋 RESUMEN - PASO 13
🌐 URL: https://tad.argentina.gob.ar/tramites/...
📄 Título: Inscripción de obra publicada - Musical
🔢 Elementos interactivos:
  • Botones: 12
  • Enlaces: 8
  • Inputs: 5
  • Selects: 0
📝 Formularios: 2

🎛️ CONTEXTO DEPÓSITO DIGITAL:
  • Sección encontrada: ✅
  • Botones dropdown: 3
  • Opciones "Si": 2

🔘 BOTONES DROPDOWN DETECTADOS:
  1. button#kL9mN-btn.btn - "Seleccionar"
  2. button#mP8qR-btn.dropdown-toggle - ""
  3. button#nQ7sT-btn.form-control - "Elegir opción"

✅ OPCIONES "SI" DETECTADAS:
  1. td - "Si"
  2. td - "Si"
================================================================================
```

## Beneficios del Sistema

### 🔄 Adaptabilidad Automática
- Detecta automáticamente nuevos selectores cuando los IDs dinámicos cambian
- Se adapta a cambios en la estructura de la página sin modificar código

### 🔍 Visibilidad Completa
- Análisis exhaustivo del HTML en cada paso crítico
- Contexto completo disponible para debugging

### 📊 Debugging Avanzado
- Archivos JSON detallados para análisis post-ejecución
- Logs estructurados con información específica de cada elemento

### 🎯 Múltiples Estrategias
- 5 estrategias secuenciales para máxima robustez
- Fallback inteligente basado en análisis real

### 📈 Mayor Tasa de Éxito
- Reduce fallos por selectores dinámicos
- Mejora la confiabilidad general del bot

## Uso en Desarrollo

### Para Debugging de Pasos Fallidos

1. **Revisar logs en tiempo real** - Los logs muestran todos los elementos encontrados
2. **Analizar archivo JSON** - Contexto completo guardado en `output/analysis/`
3. **Verificar recomendaciones** - El sistema sugiere mejores selectores
4. **Ajustar estrategias** - Agregar nuevas estrategias basadas en análisis

### Para Agregar Nuevos Pasos

```typescript
// 1. Agregar análisis al inicio del paso
await analyzeStepContext(this.page, stepNumber, 'Descripción del paso');

// 2. Para problemas específicos, crear análisis contextual
const customContext = await analyzeCustomContext(this.page);

// 3. Usar elementos encontrados en múltiples estrategias
if (customContext.targetElements.length > 0) {
  for (const element of customContext.targetElements) {
    // Intentar interacción...
  }
}
```

## Archivos Modificados

- `src/common/pageAnalyzer.ts` - Sistema de análisis completo
- `src/services/tadRegistration.service.ts` - Integración en pasos críticos
- `output/analysis/` - Directorio de análisis generados automáticamente