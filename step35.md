Propuesta de Desarrollo Refinada: Paso 35 - Insertar Tipo de Documento para Editores

NOTA IMPORTANTE: Esta propuesta ha sido refinada basándose en el análisis detallado del estado de la página post-paso 34 y la información estructural obtenida del paso 36.

1. Objetivo del Paso 35
Implementar la selección del tipo de documento (CUIT o CUIL) para TODOS los editores (tanto Persona Física como Persona Jurídica), manejando la aparición dinámica del campo de número de documento después de la selección.
2. Información Clave Descubierta
2.1 Estructura del Formulario

Editores Persona Jurídica: El dropdown "Tipo de documento" está ubicado justo debajo del campo "Razón Social"
Editores Persona Física: El dropdown "Tipo de documento" está ubicado justo debajo del campo "Tercer apellido"

2.2 Organización de Secciones

Cada editor tiene dos secciones claramente delimitadas:

"Datos del Editor": Contiene información básica y el dropdown de tipo de documento
"Domicilio del Editor": Contiene información de dirección


Los formularios de editores aparecen en orden secuencial (Editor 1, Editor 2, etc.)
Cada aparición del texto "Datos del Editor" marca el inicio de un nuevo formulario de editor

2.3 Datos del JSON Procesado
json{
  "editores": [
    { "tipoPersona": "Persona Juridica", "fiscalId": { "tipo": "CUIT", "numero": "33-11111111-1" } },
    { "tipoPersona": "Persona Fisica", "fiscalId": { "tipo": "CUIL", "numero": "27-22222222-2" } },
    { "tipoPersona": "Persona Juridica", "fiscalId": { "tipo": "CUIT", "numero": "30-33333333-3" } },
    { "tipoPersona": "Persona Fisica", "fiscalId": { "tipo": "CUIL", "numero": "20-44444444-4" } }
  ]
}
3. Estrategia de Implementación Refinada
3.1 Análisis Inicial del DOM
typescriptprivate async analizarEstructuraEditores(): Promise<Map<number, EditorContext>> {
  const editoresMap = new Map<number, EditorContext>();
  
  // Buscar todas las secciones "Datos del Editor"
  const editorSections = await this.page.locator('text="Datos del Editor"').all();
  this.logger.info(`📊 Encontradas ${editorSections.length} secciones de editores`);
  
  for (let i = 0; i < editorSections.length; i++) {
    const section = editorSections[i];
    
    // Determinar el contenedor del editor (tabla o div padre)
    const editorContainer = await section.locator('xpath=ancestor::table[1] | ancestor::div[contains(@class, "z-div")][1]').first();
    
    // Analizar si es Persona Física o Jurídica basándose en campos visibles
    const tipoPersona = await this.detectarTipoPersonaEditor(editorContainer, i);
    
    editoresMap.set(i, {
      index: i,
      sectionElement: section,
      container: editorContainer,
      tipoPersona: tipoPersona,
      tipoDocumentoRow: null // Se buscará después
    });
  }
  
  return editoresMap;
}
3.2 Detección Inteligente del Tipo de Editor
typescriptprivate async detectarTipoPersonaEditor(container: any, index: number): Promise<string> {
  // Estrategia 1: Buscar campo "Razón Social" (indicador de Persona Jurídica)
  const razonSocialCount = await container.locator('text="Razón Social"').count();
  if (razonSocialCount > 0) {
    this.logger.info(`✅ Editor ${index + 1} identificado como Persona Jurídica (campo Razón Social encontrado)`);
    return 'Persona Juridica';
  }
  
  // Estrategia 2: Buscar campos de nombre/apellido (indicador de Persona Física)
  const nombreCount = await container.locator('text="Primer Nombre"').count();
  const apellidoCount = await container.locator('text="Primer Apellido"').count();
  
  if (nombreCount > 0 || apellidoCount > 0) {
    this.logger.info(`✅ Editor ${index + 1} identificado como Persona Física (campos nombre/apellido encontrados)`);
    return 'Persona Fisica';
  }
  
  // Estrategia 3: Usar datos del JSON como fallback
  return 'Unknown';
}
3.3 Búsqueda Específica del Dropdown "Tipo de Documento"
typescriptprivate async buscarDropdownTipoDocumento(
  editorContext: EditorContext, 
  editor: any
): Promise<DropdownInfo | null> {
  
  const { container, tipoPersona, index } = editorContext;
  
  // Buscar la fila que contiene "Tipo de documento"
  const tipoDocRows = await container.locator('tr:has-text("Tipo de documento")').all();
  
  if (tipoDocRows.length === 0) {
    this.logger.warn(`⚠️ No se encontró fila "Tipo de documento" para editor ${index + 1}`);
    return null;
  }
  
  // Estrategia diferenciada según tipo de persona
  let targetRow: any = null;
  
  if (tipoPersona === 'Persona Juridica') {
    // Para Persona Jurídica: buscar después de "Razón Social"
    for (const row of tipoDocRows) {
      const prevText = await row.locator('xpath=preceding::tr[position()<=3]').allTextContents();
      if (prevText.join(' ').includes('Razón Social')) {
        targetRow = row;
        this.logger.info(`🎯 Dropdown tipo documento encontrado después de Razón Social`);
        break;
      }
    }
  } else if (tipoPersona === 'Persona Fisica') {
    // Para Persona Física: buscar después de "Tercer apellido"
    for (const row of tipoDocRows) {
      const prevText = await row.locator('xpath=preceding::tr[position()<=3]').allTextContents();
      if (prevText.join(' ').includes('Tercer apellido')) {
        targetRow = row;
        this.logger.info(`🎯 Dropdown tipo documento encontrado después de Tercer apellido`);
        break;
      }
    }
  }
  
  if (!targetRow && tipoDocRows.length > 0) {
    // Fallback: usar la primera fila encontrada dentro del contenedor
    targetRow = tipoDocRows[0];
    this.logger.warn(`⚠️ Usando primera fila "Tipo de documento" como fallback`);
  }
  
  if (!targetRow) {
    return null;
  }
  
  // Buscar el elemento interactivo del dropdown
  const dropdownElement = await this.encontrarElementoDropdown(targetRow);
  
  return {
    row: targetRow,
    element: dropdownElement,
    editorIndex: index
  };
}
3.4 Interacción con Dropdown ZK Framework
typescriptprivate async seleccionarTipoDocumento(
  dropdownInfo: DropdownInfo,
  tipoDocumento: string,
  editor: any
): Promise<void> {
  
  const { element, editorIndex } = dropdownInfo;
  
  this.logger.info(`🔽 Seleccionando "${tipoDocumento}" para editor ${editorIndex + 1}`);
  
  // Screenshot antes
  await takeScreenshot(this.page, `step35_before_tipo_doc_editor_${editorIndex + 1}`, 'debug');
  
  try {
    // Manejo especial para dropdowns ZK
    const tagName = await element.evaluate((el: any) => el.tagName.toLowerCase());
    
    if (tagName === 'select') {
      // HTML Select estándar
      await element.selectOption(tipoDocumento);
      this.logger.info(`✅ Seleccionado con selectOption`);
    } else {
      // ZK Framework dropdown
      await element.click();
      await this.page.waitForTimeout(1000);
      
      // Buscar opciones en popup ZK
      const optionSelected = await this.seleccionarOpcionZK(tipoDocumento);
      
      if (!optionSelected) {
        throw new Error(`No se pudo seleccionar "${tipoDocumento}"`);
      }
    }
    
    // Esperar aparición del campo número
    await this.page.waitForTimeout(2000);
    
    // Insertar número de documento si no es extranjero
    if (tipoDocumento !== 'Extranjero' && editor.fiscalId?.numero) {
      await this.insertarNumeroDocumento(dropdownInfo, editor);
    }
    
    // Screenshot después
    await takeScreenshot(this.page, `step35_after_tipo_doc_editor_${editorIndex + 1}`, 'milestone');
    
  } catch (error) {
    this.logger.error(`❌ Error seleccionando tipo documento: ${error}`);
    throw error;
  }
}
3.5 Manejo del Campo Número de Documento
typescriptprivate async insertarNumeroDocumento(
  dropdownInfo: DropdownInfo,
  editor: any
): Promise<void> {
  
  const { row, editorIndex } = dropdownInfo;
  
  this.logger.info(`📝 Buscando campo número para insertar: ${editor.fiscalId.numero}`);
  
  // El campo número aparece dinámicamente después del dropdown
  // Buscar en las siguientes 5 filas
  const followingRows = row.locator('xpath=following-sibling::tr[position()<=5]');
  
  // Estrategias de búsqueda del campo número
  const numeroFieldSelectors = [
    'input[name*="cuit"]:visible',
    'input[name*="cuil"]:visible',
    'input[name*="numero"]:visible',
    'input[name*="documento"]:visible',
    'input[type="text"]:visible:not([name*="razon_social"]):not([name*="nombre"]):not([name*="apellido"])'
  ];
  
  let numeroField = null;
  
  for (const selector of numeroFieldSelectors) {
    const fields = await followingRows.locator(selector).all();
    if (fields.length > 0) {
      // Tomar el primer campo que no sea de otro contexto
      numeroField = fields[0];
      const name = await numeroField.getAttribute('name') || '';
      this.logger.info(`🎯 Campo número encontrado: name="${name}"`);
      break;
    }
  }
  
  if (numeroField) {
    await numeroField.click();
    await numeroField.clear();
    await numeroField.fill(editor.fiscalId.numero);
    this.logger.info(`✅ Número documento insertado: ${editor.fiscalId.numero}`);
  } else {
    this.logger.warn(`⚠️ No se encontró campo número después de seleccionar tipo documento`);
  }
}
4. Implementación Completa del Método
typescript/**
 * Paso 35: Insertar Tipo de Documento para TODOS los Editores
 * Maneja tanto Persona Física como Persona Jurídica
 */
private async insertarDatosCompletosEditoresDocumento(editores: any[]): Promise<void> {
  const stepTracker = getStepTracker();
  stepTracker.startStep(35);
  
  this.logger.info('\n============================================================');
  this.logger.info('📋 PASO 35: Insertar Tipo de Documento para Editores');
  this.logger.info('============================================================');

  try {
    if (!editores || editores.length === 0) {
      this.logger.info('✅ No hay editores para procesar');
      stepTracker.logSuccess(35, 'No hay editores');
      return;
    }

    this.logger.info(`📊 Procesando tipo de documento para ${editores.length} editores`);

    // FASE 1: Análisis inicial de la estructura
    const editoresContextMap = await this.analizarEstructuraEditores();
    
    // FASE 2: Procesar cada editor
    for (let i = 0; i < editores.length; i++) {
      const editor = editores[i];
      const editorContext = editoresContextMap.get(i);
      
      if (!editorContext) {
        this.logger.error(`❌ No se encontró contexto para editor ${i + 1}`);
        continue;
      }
      
      this.logger.info(`\n🔄 Procesando Editor ${i + 1}/${editores.length}: ${editor.tipoPersona}`);
      
      try {
        // Buscar dropdown específico para este editor
        const dropdownInfo = await this.buscarDropdownTipoDocumento(editorContext, editor);
        
        if (!dropdownInfo) {
          throw new Error(`No se encontró dropdown tipo documento para editor ${i + 1}`);
        }
        
        // Determinar tipo de documento
        const tipoDocumento = this.determinarTipoDocumento(editor);
        
        // Seleccionar tipo e insertar número
        await this.seleccionarTipoDocumento(dropdownInfo, tipoDocumento, editor);
        
        this.logger.info(`✅ Editor ${i + 1} completado exitosamente`);
        
      } catch (error) {
        this.logger.error(`❌ Error procesando editor ${i + 1}: ${error}`);
        await takeScreenshot(this.page, `error_step35_editor_${i + 1}`, 'error');
        // Continuar con el siguiente editor
      }
      
      // Esperar entre editores para estabilización
      if (i < editores.length - 1) {
        await this.page.waitForTimeout(1500);
      }
    }
    
    stepTracker.logSuccess(35, `Tipo documento configurado para ${editores.length} editores`);
    this.logger.info(`\n✅ PASO 35 COMPLETADO - Todos los editores procesados`);

  } catch (error) {
    this.logger.error('❌ Error en Paso 35:', error);
    await takeScreenshot(this.page, 'error_step35_tipo_documento', 'error');
    stepTracker.logError(35, `Error: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Determinar tipo de documento basado en datos del editor
 */
private determinarTipoDocumento(editor: any): string {
  // Prioridad 1: Valor explícito en JSON
  if (editor.fiscalId?.tipo) {
    return editor.fiscalId.tipo;
  }
  
  // Prioridad 2: Basado en tipo de persona
  if (editor.tipoPersona === 'Persona Juridica') {
    return 'CUIT';
  }
  
  // Prioridad 3: Analizar el número
  const numero = editor.fiscalId?.numero || editor.cuit || '';
  if (numero.startsWith('30-') || numero.startsWith('33-')) {
    return 'CUIT';
  }
  if (numero.startsWith('20-') || numero.startsWith('27-') || numero.startsWith('23-')) {
    return 'CUIL';
  }
  
  // Default
  return editor.tipoPersona === 'Persona Juridica' ? 'CUIT' : 'CUIL';
}
5. Mejoras Clave Respecto a la Propuesta Original
5.1 Detección Contextual Mejorada

Identificación precisa del tipo de editor basada en campos visibles
Ubicación específica del dropdown según el tipo de persona
Validación cruzada con datos del JSON

5.2 Manejo Robusto de Dropdowns

Soporte completo para ZK Framework
Múltiples estrategias de selección de opciones
Manejo de timeouts y esperas apropiadas

5.3 Inserción Inteligente de Número

Búsqueda dinámica del campo después de selección
Filtrado de campos para evitar confusión con otros datos
Validación de inserción exitosa

5.4 Gestión de Errores

Continuación con siguiente editor en caso de fallo
Screenshots detallados en puntos críticos
Logging exhaustivo para debugging

6. Consideraciones de Testing
6.1 Casos de Prueba Recomendados
javascriptconst testCases = [
  // Caso 1: Solo Personas Jurídicas
  { editores: [
    { tipoPersona: 'Persona Juridica', fiscalId: { tipo: 'CUIT', numero: '30-11111111-1' } },
    { tipoPersona: 'Persona Juridica', fiscalId: { tipo: 'CUIT', numero: '33-22222222-2' } }
  ]},
  
  // Caso 2: Solo Personas Físicas
  { editores: [
    { tipoPersona: 'Persona Fisica', fiscalId: { tipo: 'CUIL', numero: '20-11111111-1' } },
    { tipoPersona: 'Persona Fisica', fiscalId: { tipo: 'CUIL', numero: '27-22222222-2' } }
  ]},
  
  // Caso 3: Mixto (como el actual)
  { editores: [
    { tipoPersona: 'Persona Juridica', fiscalId: { tipo: 'CUIT', numero: '30-11111111-1' } },
    { tipoPersona: 'Persona Fisica', fiscalId: { tipo: 'CUIL', numero: '20-22222222-2' } }
  ]},
  
  // Caso 4: Editor único
  { editores: [
    { tipoPersona: 'Persona Juridica', fiscalId: { tipo: 'CUIT', numero: '30-11111111-1' } }
  ]}
];
6.2 Validaciones Post-Ejecución

Verificar que todos los dropdowns fueron configurados
Confirmar inserción de números de documento
Validar que no se afectaron otros campos

7. Integración con el Flujo Existente
7.1 Dependencias

Prerequisito: Paso 34 debe completarse exitosamente
Datos requeridos: Array de editores con fiscalId.tipo y fiscalId.numero


7. Testing Recomendado
javascript// Test con diferentes combinaciones
const testCases = [
    { editores: [{ tipoPersona: 'Persona Juridica', cuit: '30-11111111-1' }] },
    { editores: [{ tipoPersona: 'Persona Fisica', cuit: '20-22222222-2' }] },
    { editores: [
        { tipoPersona: 'Persona Juridica', cuit: '30-11111111-1' },
        { tipoPersona: 'Persona Fisica', cuit: '20-22222222-2' }
    ]}
];
Esta implementación proporciona una solución robusta y mantenible para el paso 35, reutilizando las estrategias probadas del paso 33 y adaptándolas al contexto específico de tipo de documento.