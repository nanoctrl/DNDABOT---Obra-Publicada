🔄 PROTOCOLO 1: "Capture & Analyze" (Captura y Análisis Preventivo)
Filosofía
Este protocolo se basa en la idea de que el bot, al completar exitosamente el último paso implementado, debe comportarse como si fuera a fallar el siguiente paso inexistente, capturando toda la información posible del estado actual de la página para facilitar el desarrollo del próximo paso.
Flujo del Protocolo
Fase 1: Preparación (Antes de Ejecutar)

Activar Modo Desarrollo Continuo

Configurar variable: CONTINUOUS_DEVELOPMENT_MODE=true
El bot sabrá que debe ejecutar rutina especial tras el último paso


Preparar Estructura de Captura

Crear directorio: output/next-step-analysis/step-{N+1}_{timestamp}/
Preparar plantilla de documentación para el nuevo paso



Fase 2: Ejecución y Captura

Ejecutar hasta el Último Paso Actual

El bot corre normalmente hasta completar paso 25 (actual)
Confirma éxito del último paso implementado


Activar Modo Análisis Preventivo
=== ANÁLISIS PARA DESARROLLO DE PASO 26 ===
Estado: Último paso completado exitosamente
Iniciando captura preventiva de información...

Captura Exhaustiva del Estado

Screenshot Full Page: Captura visual completa con scroll
Screenshot Viewport: Vista actual sin scroll
HTML Completo: Guardado del DOM actual
Análisis de Elementos Interactivos:

Todos los botones visibles
Todos los inputs detectados
Todos los dropdowns
Links clickeables
Elementos con eventos onclick




Análisis Contextual Inteligente

Identificar Secciones No Completadas:

Buscar panels con "Completar" que no han sido clickeados
Detectar badges o indicadores de estado
Identificar formularios vacíos


Mapeo de Elementos Estables:

Textos labels cercanos a cada elemento
Atributos name, role, type
Estructura de tablas (tr/td relationships)
Jerarquía de contenedores




Generación de Reporte Estructurado
REPORTE DE ANÁLISIS - PRÓXIMO PASO 26
=====================================

1. CONTEXTO VISUAL
   - Screenshots: [enlaces a imágenes]
   - Estado actual: [descripción de qué se ve]

2. ELEMENTOS CANDIDATOS PARA INTERACCIÓN
   - Botón "Completar" en sección "Autores"
     * Selectores probables:
       - Por texto: 'button:has-text("Completar")'
       - Por contexto: '.panel:has-text("Autores") a'
     * Elementos cercanos estables: [lista]

3. ESTRATEGIAS RECOMENDADAS
   - Basadas en patrones exitosos anteriores
   - Orden sugerido de selectores

4. DATOS NECESARIOS DEL JSON
   - Campos probables: autores.nombre, autores.cuit
   - Validaciones esperadas: [lista]


Fase 3: Preparación para Desarrollo

Generar Prompt para LLM
Con base en el análisis adjunto, implementa el Paso 26 siguiendo estos patrones:
- Usa multi-estrategia como en pasos anteriores
- Prioriza selectores contextuales sobre IDs
- Incluye validaciones y screenshots
[Adjuntar análisis completo]

Crear Stub del Código

Generar estructura básica del método
Incluir TODOs con información del análisis
Preparar tests unitarios vacíos



Ventajas del Protocolo 1

✅ Información exhaustiva sin necesidad de debugging
✅ Desarrollo más rápido del siguiente paso
✅ Reduce iteraciones de prueba y error
✅ Documenta automáticamente el estado esperado

Desventajas

⚠️ Requiere modificación del código actual
⚠️ Genera archivos adicionales en cada ejecución
⚠️ Puede capturar información innecesaria


🎯 PROTOCOLO 2: "Interactive Development Mode" (Modo Desarrollo Interactivo)
Filosofía
Este protocolo convierte al bot en una herramienta de exploración interactiva, donde tras completar el último paso, entra en un modo especial que permite al desarrollador explorar la página, probar selectores y generar código automáticamente.
Flujo del Protocolo
Fase 1: Configuración Inicial

Activar Modo Inspector Plus

Variable: INSPECTOR_PLUS_MODE=true
Preparar comandos de exploración


Instrumentar el Último Paso

Agregar hook post-ejecución
Preparar consola interactiva



Fase 2: Ejecución Interactiva

Ejecutar hasta el Último Paso

Completar paso 25 normalmente
Mantener el browser abierto


Entrar en Modo Exploración
=== MODO DESARROLLO INTERACTIVO ===
Paso 25 completado. Browser pausado.

Comandos disponibles:
- analyze() - Analiza la página actual
- find(text) - Busca elementos por texto
- test(selector) - Prueba un selector
- record() - Graba acciones manuales
- generate() - Genera código del paso

Exploración Guiada

Comando analyze():
Analizando página...

Secciones detectadas:
1. ✅ Datos del trámite (completado)
2. ✅ Condiciones (completado)
3. ✅ Datos de la obra (completado)
4. ⏳ Autores (pendiente) <- CANDIDATO PARA PASO 26
5. ⏳ Editores (pendiente)

¿Explorar sección? (1-5):

Comando find("Autores"):
Elementos encontrados con "Autores":
1. <div class="panel-heading">Autores</div>
2. <button>Completar</button> (dentro del panel)
3. <span>Autores (0)</span>

Contexto del botón #2:
- Contenedor: .panel:has-text("Autores")
- Selector sugerido: '.panel:has-text("Autores") button'



Grabación de Acciones

Comando record():
🔴 GRABANDO - Realiza las acciones manualmente

[Usuario hace click en "Completar" de Autores]

Acción grabada:
- Click en elemento
- Selector detectado: #dynamicId123
- Selectores alternativos generados:
  1. '.panel:has-text("Autores") button'
  2. 'button:near(text("Autores"))'
  3. '[onclick*="autores"]'



Generación Automática de Código

Comando generate():
typescript// CÓDIGO GENERADO PARA PASO 26
private async abrirSeccionAutores(): Promise<void> {
  await stepTracker.startStep(26);
  
  const strategies: InteractionStrategy[] = [
    // Estrategia principal basada en contexto
    {
      name: 'Botón Completar en panel Autores',
      locator: (page) => page.locator('.panel:has-text("Autores") button:has-text("Completar")')
    },
    // Alternativas...
  ];
  
  await tryInteraction(strategies, this.page, this.logger, 26);
}




Fase 3: Validación y Refinamiento

Test en Tiempo Real

Ejecutar el código generado inmediatamente
Verificar que funciona
Ajustar selectores si es necesario


Documentación Automática

Generar entrada de changelog
Actualizar steps.config.ts
Crear tests unitarios



Ventajas del Protocolo 2

✅ Desarrollo verdaderamente interactivo
✅ Prueba inmediata de selectores
✅ Genera código optimizado automáticamente
✅ Reduce drásticamente el tiempo de desarrollo

Desventajas

⚠️ Requiere presencia del desarrollador
⚠️ Más complejo de implementar inicialmente
⚠️ No automatizable completamente


📊 Comparación de Protocolos
AspectoProtocolo 1 (Capture & Analyze)Protocolo 2 (Interactive)Automatización90% automático60% automáticoInformación capturadaExhaustivaEspecífica y dirigidaTiempo de implementación inicialMedio (2-3 días)Alto (4-5 días)Tiempo por nuevo paso30-45 minutos15-20 minutosRequiere desarrollador presenteNoSíCalidad del código generadoBuenaExcelenteFacilidad de usoAltaMedia
🎯 Recomendación
Para el contexto actual del proyecto, recomiendo el Protocolo 1 por las siguientes razones:

Consistencia con la arquitectura actual: Ya tienen un sistema robusto de análisis post-fallo que puede reutilizarse
Trabajo asíncrono: Permite que diferentes LLMs trabajen sin coordinación
Documentación automática: Genera evidencia del estado para futuras referencias
Menor barrera de entrada: Más fácil de implementar con el código actual

Implementación Sugerida del Protocolo 1

Fase 1 (1 día): Adaptar el sistema de análisis post-fallo para que funcione en modo éxito
Fase 2 (1 día): Crear templates de reporte específicos para desarrollo
Fase 3 (pocas horas): Documentar el proceso en claude.md
Fase 4: Usar en producción para desarrollar pasos 26+

El Protocolo 2 sería ideal para una versión 3.0 del proyecto, cuando tengan más recursos y necesiten optimizar aún más el tiempo de desarrollo.

## 🔍 **PASO DE VERIFICACIÓN FINAL (Check Process Step)**

### **Definición y Propósito**
El **Check Process Step** es un paso especial que **SIEMPRE** debe estar posicionado como el último paso de cualquier flujo de pasos implementados. Su misión es verificar que el proceso se completó exitosamente antes de cerrar el navegador.

### **Posicionamiento Obligatorio**
- **Regla absoluta**: El Check Process Step SIEMPRE debe ser el paso con el número más alto (último paso)
- **Al agregar nuevos pasos**: El Check Process Step debe ser reubicado para mantener su posición final
- **Ejemplo**: Si existen pasos 1-29 y se agrega el paso 30, el Check Process Step debe pasar del número 29 al número 31

### **Condiciones de Ejecución**
- **Solo se ejecuta si**: TODOS los pasos anteriores han sido completados exitosamente
- **Se omite si**: Cualquier paso anterior falla o genera error
- **Propósito**: Verificación final del estado de éxito del proceso completo

### **Análisis y Verificaciones Obligatorias**

#### **1. Captura Visual**
- **Screenshot del estado final**: Captura de pantalla del estado final de la página
- **Screenshot tipo**: `milestone` para incluir en reportes de éxito

#### **2. Análisis de DOM y Estructura**
- **Conteo de elementos de formulario**: `input`, `select`, `textarea`, `button`
- **Conteo de elementos ZK Framework**: Elementos con clases que contienen `z-`
- **Verificación de URL actual**: Para confirmar que estamos en la página esperada
- **Verificación de título de página**: Para validar el contexto correcto

#### **3. Análisis de Página Completo**
- **Ejecutar `analyzeStepFailure`**: Utilizar la misma función que se usa en situaciones de fallo
- **Inspección de elementos interactivos**: Botones, enlaces, formularios disponibles
- **Análisis de estructura HTML**: Revisión completa del DOM actual
- **Detección de elementos ZK**: Análisis específico del framework ZK utilizado por TAD

#### **4. Debug Snapshot (Si está habilitado)**
- **Crear debug snapshot completo**: Si `DEVELOPER_DEBUG_MODE` está activo
- **Incluir contexto de verificación**: "Verificación final del proceso completado"

#### **5. Tiempo de Inspección Visual**
- **Espera obligatoria de 5 segundos**: Para permitir inspección visual del resultado
- **Log de tiempo de espera**: Informar claramente que se está esperando
- **Confirmación de finalización**: Log cuando el período de verificación termine

### **Información que Debe Reportar**
```
✅ PROCESO VERIFICADO - Estado final de la página analizado exitosamente
📋 Total de elementos analizados: X formulario, Y ZK
🔍 Verificación completa del proceso finalizada
⏳ Manteniendo navegador abierto por 5 segundos para verificación visual...
✅ Período de verificación visual completado
✅ PASO N COMPLETADO - Check Process Step ejecutado exitosamente
```

### **Implementación en Steps Config**
```typescript
{
  number: X, // Siempre el número más alto
  name: 'check_process_step',
  description: 'Verificar proceso completado exitosamente',
  service: 'obra', // Mismo servicio que el paso anterior
  required: true,
  retryable: false // No debe reintentarse si falla
}
```

### **Integración con Protocolo de Agregado de Pasos**
- **Al implementar nuevos pasos**: Verificar que el Check Process Step sea reubicado al final
- **En análisis preventivo**: El Check Process Step debe ejecutarse después del último paso real
- **En reportes**: Incluir el análisis del Check Process Step como validación de éxito del flujo

### **Ejemplo de Implementación**
```typescript
/**
 * Paso N: Check Process Step - Verificar proceso completado exitosamente
 * Este paso analiza la página con todas las estrategias disponibles para verificar el estado final
 * y mantiene el navegador abierto por 5 segundos para inspección visual
 */
private async checkProcessStep(): Promise<void> {
  this.logger.info('🔍 PASO N: Verificando proceso completado exitosamente...');
  
  // 1. Screenshot del estado final
  await takeScreenshot(this.page, 'final_state_verification', 'milestone');
  
  // 2. Análisis completo usando estrategias de fallo
  await analyzeStepFailure(this.page, N, 'Check Process Step', new Error('Verificación'));
  
  // 3. Debug snapshot si está habilitado
  if (config.DEVELOPER_DEBUG_MODE) {
    await createDebugSnapshot(this.page, 'final_process_verification', 'Verificación final');
  }
  
  // 4. Análisis de elementos y estructura
  const formElements = await this.page.locator('input, select, textarea, button').count();
  const zkElements = await this.page.locator('[class*="z-"]').count();
  
  // 5. Reportar información del análisis
  this.logger.info(`📋 Total de elementos analizados: ${formElements} formulario, ${zkElements} ZK`);
  
  // 6. Espera de 5 segundos para inspección visual
  this.logger.info('⏳ Manteniendo navegador abierto por 5 segundos para verificación visual...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  this.logger.info('✅ PASO N COMPLETADO - Check Process Step ejecutado exitosamente');
}
```

---

## 🚨 CRITICAL INSIGHTS: Dropdown Selection and Page Navigation Issues

### Problem Pattern Recognition

#### 🔍 **False Positive Detection Strategy**
**Always verify success through screenshots, not just log messages:**

```
User Feedback: "always, before claiming victory, check the screenshot of the check process step"
```

**Key Insight**: Logs can show "SUCCESS" while the step actually fails on the wrong page.

**Implementation**: 
- Always compare BEFORE and AFTER screenshots
- Check URL/page title in final verification
- Verify expected page elements are still present

#### ⚠️ **Dropdown Selection Anti-Patterns**

**DANGEROUS PATTERNS (Cause Page Navigation):**
```typescript
// ❌ NEVER USE - Matches elements anywhere on page
await this.page.getByText('Si', { exact: true }).click();
await this.page.locator('li:has-text("No")').click();
await this.page.locator('*:visible:has-text("Si")').click();
```

**ROOT CAUSE**: These selectors can match navigation elements, headers, or links that cause unintended page navigation.

**SAFE PATTERNS (Dropdown-Only Selection):**
```typescript
// ✅ ALWAYS USE - Restricts to dropdown containers only
const dropdownOptions = [
  '.z-combobox-pp:visible .z-comboitem:has-text("${option}")',
  '.z-combobox-pp:visible td:has-text("${option}")', 
  '.z-dropdown:visible .z-comboitem:has-text("${option}")',
  '.z-popup:visible *:has-text("${option}")'
];
```

#### 🎯 **Progressive Selector Restriction Strategy**

1. **Level 1**: Framework-specific containers (`.z-combobox-pp`, `.z-dropdown`)
2. **Level 2**: Visibility constraints (`:visible`) 
3. **Level 3**: Content targeting (`:has-text()`)
4. **Level 4**: Element type restriction (`td`, `.z-comboitem`)

**Formula**: `[CONTAINER]:visible [ELEMENT_TYPE]:has-text("${text}")`

#### 🔄 **Debugging Workflow for Dropdown Issues**

**Step 1: Identify Symptoms**
- Logs show "SUCCESS" but wrong page in final verification
- Before/after screenshots show different pages
- URL changes unexpectedly

**Step 2: Locate Broad Selectors**
```bash
# Search for problematic patterns
grep -r "getByText.*click" src/
grep -r "\*:visible:has-text" src/
grep -r "li:has-text" src/
```

**Step 3: Apply Container Restrictions**
- Replace broad selectors with container-specific ones
- Add `:visible` constraints
- Test with ultra-restrictive selectors first

**Step 4: Verification Strategy**
```typescript
// Always verify dropdown closed after selection
const stillOpen = await this.page.locator('.z-combobox-pp:visible, .z-dropdown:visible').count();
if (stillOpen === 0) {
  this.logger.info('✅ VERIFIED SUCCESS: Selected and dropdown closed');
  return;
}
```

#### 📋 **ZK Framework Dropdown Architecture**

**Understanding ZK Dropdown Structure:**
```html
<!-- Trigger Button -->
<input class="z-combobox-inp" onclick="...">
<i class="z-combobox-btn"></i>

<!-- Popup Container (when open) -->
<div class="z-combobox-pp z-popup">
  <div class="z-comboitem">Option 1</div>
  <div class="z-comboitem">Option 2</div>
  <td class="z-comboitem-text">Option 3</td>
</div>
```

**Targeting Strategy:**
1. **Never target trigger elements for selection** - only for opening
2. **Always target within popup containers** - `.z-combobox-pp`, `.z-popup`
3. **Use specific item selectors** - `.z-comboitem`, `td.z-comboitem-text`

#### 🛠️ **Implementation Template for New Dropdown Steps**

```typescript
// TEMPLATE: Safe dropdown interaction
async selectFromDropdown(containerText: string, optionText: string): Promise<void> {
  // 1. Locate and click dropdown trigger (near container text)
  const triggerSelector = `text="${containerText}" + [role="combobox"], text="${containerText}" + .z-combobox-btn`;
  await this.page.locator(triggerSelector).click();
  
  // 2. Wait for dropdown to open
  await this.page.waitForTimeout(500);
  
  // 3. Select from ONLY visible dropdown containers
  const dropdownSelectors = [
    `.z-combobox-pp:visible .z-comboitem:has-text("${optionText}")`,
    `.z-combobox-pp:visible td:has-text("${optionText}")`,
    `.z-dropdown:visible .z-comboitem:has-text("${optionText}")`,
    `.z-popup:visible *:has-text("${optionText}")`
  ];
  
  for (const selector of dropdownSelectors) {
    const option = this.page.locator(selector).first();
    if (await option.count() > 0 && await option.isVisible()) {
      await option.click();
      
      // 4. Verify dropdown closed (success confirmation)
      const stillOpen = await this.page.locator('.z-combobox-pp:visible').count();
      if (stillOpen === 0) {
        this.logger.info(`✅ VERIFIED: Selected "${optionText}" and dropdown closed`);
        return;
      }
    }
  }
  
  throw new Error(`Could not select "${optionText}" from dropdown`);
}
```

#### 🎯 **Key Learning: Container-First Approach**

**OLD APPROACH**: Find text, then click
```typescript
await this.page.getByText('No').click(); // ❌ Could be anywhere
```

**NEW APPROACH**: Find container, then find text within container
```typescript
const container = this.page.locator('.z-combobox-pp:visible');
const option = container.locator('*:has-text("No")').first();
await option.click(); // ✅ Only within dropdown
```

#### 💡 **Prevention Checklist for Future Steps**

- [ ] **Never use page-wide text selectors for clicking**
- [ ] **Always scope selectors to specific containers**
- [ ] **Add `:visible` constraints to prevent stale element matches**
- [ ] **Verify dropdown state changes after interaction**
- [ ] **Compare before/after screenshots for navigation detection**
- [ ] **Use Check Process Step for final verification**
- [ ] **Test with broad selectors disabled first**

This experience taught us that **specificity and container scoping are critical** for preventing unintended page navigation in complex web applications with multiple elements containing similar text.

Esta documentación asegura que el Check Process Step se implemente consistentemente y proporcione toda la información necesaria para verificar el éxito del proceso completo.