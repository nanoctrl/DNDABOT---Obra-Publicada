# Técnicas de Selectores Robustos para Automatización Web

## Resumen Ejecutivo

Durante el desarrollo del bot de automatización TAD, descubrimos que la plataforma utiliza **ZK Framework** con **IDs dinámicos** que cambian en cada sesión, invalidando selectores tradicionales. Este documento detalla las técnicas desarrolladas para crear selectores robustos y resistentes a cambios.

## Análisis del Problema

### Tecnología Identificada: ZK Framework

**ZK Framework** es un framework Java para aplicaciones web que genera IDs automáticamente:

```html
<!-- Los IDs cambian en cada sesión -->
Sesión 1: <zul.inp.Combobox id="s5IQj" name="cmb_usted_opta">
Sesión 2: <zul.inp.Combobox id="s7RKm" name="cmb_usted_opta">
Sesión 3: <zul.inp.Combobox id="t3XpN" name="cmb_usted_opta">
```

### Impacto en Automatización

- **Selectores por ID fallan**: `#s5IQj` funciona una sola vez
- **CSS selectors frágiles**: `.z-combobox-button:nth-child(2)` se rompe con cambios
- **XPath absoluto inútil**: `/html/body/div[3]/div[1]/form/table/tr[2]/td[2]`

## Matriz de Estabilidad de Selectores

| Tipo de Selector | Estabilidad | Confiabilidad | Mantenibilidad | Ejemplo |
|-----------------|-------------|---------------|----------------|---------|
| **ID dinámico** | ❌ 0% | ❌ Muy baja | ❌ Requiere constante actualización | `#s5IQj` |
| **Clase generada** | ❌ 10% | ❌ Baja | ❌ Frágil | `.z-comp-123` |
| **XPath absoluto** | ❌ 20% | ❌ Muy baja | ❌ Se rompe con cualquier cambio | `/html/body/div[3]` |
| **Índice posicional** | ⚠️ 40% | ⚠️ Media | ❌ Frágil | `:nth-child(2)` |
| **Name attribute** | ✅ 95% | ✅ Muy alta | ✅ Funcional | `[name="cmb_usted_opta"]` |
| **Role attribute** | ✅ 90% | ✅ Alta | ✅ Semántico | `[role="combobox"]` |
| **Texto visible** | ✅ 85% | ✅ Alta | ✅ Legible | `text="¿Usted opta por..."` |
| **Contextual** | ✅ 95% | ✅ Muy alta | ✅ Autodocumentado | `text="Label".locator("..").locator("[role=control]")` |

## Estrategias de Selectores Robustos

### 1. Estrategia Contextual por Label

**Concepto**: Usar texto visible estable como ancla para navegación semántica.

```typescript
// ✅ ROBUSTO: Navega desde label estable a control funcional
await page.locator('text="¿Usted opta por depositar la obra digitalmente?"')
  .locator('..') // Ir al contenedor padre
  .locator('[role="combobox"]') // Encontrar el control por rol
  .click();
```

**Ventajas**:
- El texto del label rara vez cambia
- Los roles semánticos son estándares
- Autodocumentado y legible

### 2. Estrategia por Atributos Funcionales

**Concepto**: Usar atributos que expresan función, no diseño.

```typescript
// ✅ ROBUSTO: Name expresa función del campo
await page.locator('[name="cmb_usted_opta"]').click();

// ✅ ROBUSTO: Data attributes para testing
await page.locator('[data-testid="deposit-dropdown"]').click();

// ✅ ROBUSTO: ARIA labels para accesibilidad
await page.locator('[aria-label="Modo de depósito"]').click();
```

### 3. Estrategia de Navegación Relativa

**Concepto**: Navegar desde elementos estables hacia elementos dinámicos.

```typescript
// ✅ ROBUSTO: Buscar en el contexto de la fila correcta
await page.locator('tr:has-text("¿Usted opta por depositar")')
  .locator('[role="combobox"]')
  .click();

// ✅ ROBUSTO: Buscar en sección específica
await page.locator('div:has-text("Modo de depósito")')
  .locator('button')
  .first()
  .click();
```

### 4. Estrategia de Múltiples Fallbacks

**Concepto**: Implementar múltiples estrategias en orden de preferencia.

```typescript
const strategies = [
  // Estrategia 1: Más específica y estable
  { 
    name: 'By name attribute',
    locator: page.locator('[name="cmb_usted_opta"]')
  },
  
  // Estrategia 2: Contextual por texto
  {
    name: 'Contextual by label',
    locator: page.locator('text="¿Usted opta por depositar"')
      .locator('..')
      .locator('[role="combobox"]')
  },
  
  // Estrategia 3: Por rol genérico
  {
    name: 'First combobox',
    locator: page.locator('[role="combobox"]').first()
  }
];

for (const strategy of strategies) {
  try {
    await strategy.locator.click();
    console.log(`Success: ${strategy.name}`);
    break;
  } catch (error) {
    console.log(`Failed: ${strategy.name}`);
  }
}
```

## Patrones de Implementación

### Patrón: Page Object con Estrategias Múltiples

```typescript
export class RobustDropdown {
  constructor(private page: Page, private label: string) {}
  
  async select(option: string): Promise<void> {
    // Abrir dropdown con estrategias robustas
    await this.openDropdown();
    
    // Seleccionar opción con estrategias robustas
    await this.selectOption(option);
  }
  
  private async openDropdown(): Promise<void> {
    const strategies = [
      () => this.page.locator(`[aria-label="${this.label}"]`),
      () => this.page.locator(`text="${this.label}"`).locator('..').locator('[role="combobox"]'),
      () => this.page.locator(`tr:has-text("${this.label}")`).locator('[role="combobox"]')
    ];
    
    for (const strategy of strategies) {
      try {
        await strategy().click();
        return;
      } catch (error) {
        continue;
      }
    }
    
    throw new Error(`No se pudo abrir dropdown para: ${this.label}`);
  }
  
  private async selectOption(option: string): Promise<void> {
    const strategies = [
      () => this.page.getByText(option, { exact: true }),
      () => this.page.getByRole('cell', { name: option, exact: true }),
      () => this.page.getByRole('option', { name: option }),
      () => this.page.locator(`.z-comboitem:has-text("${option}")`)
    ];
    
    for (const strategy of strategies) {
      try {
        await strategy().click();
        return;
      } catch (error) {
        continue;
      }
    }
    
    throw new Error(`No se pudo seleccionar opción: ${option}`);
  }
}

// Uso
const depositDropdown = new RobustDropdown(page, "¿Usted opta por depositar la obra digitalmente?");
await depositDropdown.select("Si");
```

### Patrón: Factory de Selectores Contextuales

```typescript
export class ContextualSelectorFactory {
  static forLabel(label: string) {
    return {
      inSameRow: (page: Page) => 
        page.locator(`tr:has-text("${label}")`),
      
      inSameSection: (page: Page) => 
        page.locator(`div:has-text("${label}")`).locator('..'),
      
      byAriaLabel: (page: Page) => 
        page.locator(`[aria-label*="${label}"]`),
      
      nextToLabel: (page: Page) => 
        page.locator(`text="${label}"`).locator('..').locator('input, select, button, [role="combobox"]')
    };
  }
}

// Uso
const selectors = ContextualSelectorFactory.forLabel("Modo de depósito");
await selectors.nextToLabel(page).locator('[role="combobox"]').click();
```

## Técnicas Específicas por Tecnología

### ZK Framework

```typescript
// ZK genera IDs dinámicos pero mantiene estructura consistente
class ZKComponentHandler {
  // Usar name attributes que ZK preserva
  static async selectInCombobox(page: Page, name: string, option: string) {
    await page.locator(`[name="${name}"]`).click();
    await page.locator('.z-comboitem').filter({ hasText: option }).click();
  }
  
  // Navegar por jerarquía ZK
  static async findInGrid(page: Page, rowText: string, columnIndex: number) {
    return page.locator('.z-row')
      .filter({ hasText: rowText })
      .locator('.z-cell')
      .nth(columnIndex);
  }
}
```

### JSF (Java Server Faces)

```typescript
// JSF mantiene IDs de formulario pero genera sufijos dinámicos
class JSFComponentHandler {
  static async findByIdPrefix(page: Page, prefix: string) {
    return page.locator(`[id^="${prefix}"]`);
  }
  
  static async findByDataAttribute(page: Page, key: string, value: string) {
    return page.locator(`[data-${key}="${value}"]`);
  }
}
```

### Angular Material

```typescript
// Angular Material usa clases consistentes
class AngularMaterialHandler {
  static async selectInMatSelect(page: Page, label: string, option: string) {
    await page.locator('mat-select').filter({ hasText: label }).click();
    await page.locator('mat-option').filter({ hasText: option }).click();
  }
}
```

## Herramientas de Debugging

### Analizador de Estabilidad de Selectores

```typescript
export class SelectorStabilityAnalyzer {
  static async analyze(page: Page, selector: string): Promise<StabilityReport> {
    const element = page.locator(selector);
    
    const report: StabilityReport = {
      selector,
      exists: await element.count() > 0,
      visible: await element.isVisible().catch(() => false),
      hasStableId: !/^[a-zA-Z0-9]{5,}$/.test(selector), // Detecta IDs generados
      hasNameAttribute: await element.getAttribute('name').then(n => !!n),
      hasRoleAttribute: await element.getAttribute('role').then(r => !!r),
      hasAriaLabel: await element.getAttribute('aria-label').then(a => !!a),
      recommendation: this.generateRecommendation(selector)
    };
    
    return report;
  }
  
  private static generateRecommendation(selector: string): string {
    if (selector.includes('#') && /[a-zA-Z0-9]{5,}/.test(selector)) {
      return 'ALTO RIESGO: ID probablemente dinámico. Usar name, role o texto.';
    }
    if (selector.includes('nth-child')) {
      return 'MEDIO RIESGO: Selector posicional. Considerar selectores semánticos.';
    }
    if (selector.includes('[name=') || selector.includes('[role=')) {
      return 'BAJO RIESGO: Selector semántico estable.';
    }
    return 'EVALUAR: Revisar estabilidad del selector.';
  }
}
```

### Generador Automático de Selectores Robustos

```typescript
export class RobustSelectorGenerator {
  static async generateFor(page: Page, element: Locator): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Obtener atributos del elemento
    const name = await element.getAttribute('name');
    const role = await element.getAttribute('role');
    const ariaLabel = await element.getAttribute('aria-label');
    const text = await element.textContent();
    
    // Generar sugerencias por prioridad
    if (name) suggestions.push(`[name="${name}"]`);
    if (role) suggestions.push(`[role="${role}"]`);
    if (ariaLabel) suggestions.push(`[aria-label="${ariaLabel}"]`);
    if (text) suggestions.push(`text="${text}"`);
    
    // Generar selectores contextuales
    const parentText = await element.locator('..').textContent();
    if (parentText) {
      suggestions.push(`text="${parentText.slice(0, 20)}..."`);
    }
    
    return suggestions;
  }
}
```

## Métricas y Monitoreo

### KPIs de Robustez de Selectores

```typescript
export interface SelectorMetrics {
  totalSelectors: number;
  stableSelectors: number;    // Con name, role, o texto
  fragileSelectors: number;   // Con IDs o posiciones
  failureRate: number;        // % de fallos por selectores frágiles
  averageStrategiesUsed: number; // Promedio de estrategias antes del éxito
}

export class SelectorMetricsCollector {
  private metrics: Map<string, SelectorUsage> = new Map();
  
  recordSuccess(selector: string, strategyIndex: number) {
    const usage = this.metrics.get(selector) || { successes: 0, failures: 0, strategyIndices: [] };
    usage.successes++;
    usage.strategyIndices.push(strategyIndex);
    this.metrics.set(selector, usage);
  }
  
  recordFailure(selector: string) {
    const usage = this.metrics.get(selector) || { successes: 0, failures: 0, strategyIndices: [] };
    usage.failures++;
    this.metrics.set(selector, usage);
  }
  
  generateReport(): SelectorMetrics {
    const selectors = Array.from(this.metrics.keys());
    
    return {
      totalSelectors: selectors.length,
      stableSelectors: selectors.filter(s => this.isStable(s)).length,
      fragileSelectors: selectors.filter(s => this.isFragile(s)).length,
      failureRate: this.calculateFailureRate(),
      averageStrategiesUsed: this.calculateAverageStrategies()
    };
  }
  
  private isStable(selector: string): boolean {
    return selector.includes('[name=') || 
           selector.includes('[role=') || 
           selector.includes('text=');
  }
  
  private isFragile(selector: string): boolean {
    return selector.includes('#') || 
           selector.includes('nth-child') ||
           selector.includes(':first') ||
           selector.includes(':last');
  }
}
```

## Guía de Mejores Prácticas

### ✅ DO - Hacer

1. **Usar atributos semánticos**
   ```typescript
   // Preferir name, role, aria-label
   await page.locator('[name="campo_funcional"]').click();
   ```

2. **Navegar contextualmente**
   ```typescript
   // Usar texto visible como ancla
   await page.locator('text="Label estable"').locator('..').locator('[role="control"]').click();
   ```

3. **Implementar múltiples estrategias**
   ```typescript
   // Tener fallbacks preparados
   const strategies = [stableSelector, contextualSelector, genericSelector];
   ```

4. **Validar después de interactuar**
   ```typescript
   // Confirmar que la acción tuvo efecto
   await page.locator('[name="campo"]').fill('valor');
   await expect(page.locator('[name="campo"]')).toHaveValue('valor');
   ```

### ❌ DON'T - No Hacer

1. **Evitar IDs dinámicos**
   ```typescript
   // ❌ Frágil - IDs generados automáticamente
   await page.locator('#comp_123_generated').click();
   ```

2. **Evitar selectores posicionales**
   ```typescript
   // ❌ Frágil - Depende del orden
   await page.locator('div:nth-child(3)').click();
   ```

3. **Evitar selectores demasiado específicos**
   ```typescript
   // ❌ Frágil - Demasiado acoplado a estructura
   await page.locator('body > div > form > table > tr:nth-child(2) > td').click();
   ```

4. **No asumir estructura DOM**
   ```typescript
   // ❌ Frágil - Asume jerarquía específica
   await page.locator('form table tr td button').click();
   ```

## Conclusiones

### Lecciones Aprendidas

1. **Los IDs dinámicos son más comunes de lo esperado** en aplicaciones empresariales
2. **Los atributos funcionales (name, role) son más estables** que los identificadores generados
3. **La navegación contextual es más robusta** que los selectores absolutos
4. **Las estrategias múltiples proporcionan redundancia** sin complejidad excesiva
5. **El texto visible es sorprendentemente estable** en aplicaciones maduras

### Recomendaciones para Futuro

1. **Adoptar selectores contextuales como estándar** para todos los proyectos de automatización
2. **Implementar análisis automático de estabilidad** en pipelines de CI/CD
3. **Crear bibliotecas de patrones** específicas para cada framework (ZK, JSF, Angular, etc.)
4. **Desarrollar métricas de robustez** para monitorear la salud de los selectores
5. **Entrenar equipos en técnicas de identificación** de elementos estables vs dinámicos

---

*Documento técnico basado en la resolución exitosa del problema de IDs dinámicos en la automatización del sistema TAD utilizando ZK Framework.*