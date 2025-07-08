# Propuesta de Desarrollo Refinada: Paso 35 - Insertar Tipo de Documento para Editores

## Resumen del Problema

El paso 35 actualmente funciona correctamente para el editor 1, pero falla consistentemente para los editores 2, 3 y 4. El análisis muestra que:

1. **Editor 1**: ✅ Se encuentra el dropdown, se selecciona el tipo de documento y se inserta el número correctamente
2. **Editores 2-4**: ❌ No se pueden encontrar los dropdowns de tipo de documento

## Insight Clave: Usar Campos del Paso 34 como Referencia

Los campos completados en el paso 34 pueden servir como puntos de referencia únicos para cada editor:

- **Persona Jurídica**: El campo "Razón Social" está SIEMPRE justo arriba del dropdown "Tipo de documento"
- **Persona Física**: El campo "Tercer apellido" (o "Primer apellido" como fallback) está SIEMPRE justo arriba del dropdown "Tipo de documento"

Esta relación espacial es consistente y nos permite localizar con precisión el dropdown correcto para cada editor.

## Estrategia de Solución Basada en Contexto

### 1. Localizar Editor por Campos Únicos del Paso 34

```typescript
private async localizarDropdownPorCamposReferencia(
  editor: any,
  editorIndex: number
): Promise<any> {
  this.logger.info(`🎯 Localizando dropdown para editor ${editorIndex + 1} usando campos de referencia`);
  
  let campoReferencia = null;
  let tipoCampoReferencia = '';
  
  if (editor.tipoPersona === 'Persona Juridica') {
    // Para Persona Jurídica: usar Razón Social como referencia
    const razonSocial = editor.razonSocial;
    this.logger.info(`🏢 Buscando por Razón Social: "${razonSocial}"`);
    
    // Buscar el input que contiene exactamente este valor
    campoReferencia = await this.page.locator(`input[value="${razonSocial}"]:visible`).first();
    tipoCampoReferencia = 'Razón Social';
    
  } else if (editor.tipoPersona === 'Persona Fisica') {
    // Para Persona Física: usar apellidos como referencia
    // Prioridad: Tercer apellido > Segundo apellido > Primer apellido
    const apellidos = [
      { campo: 'tercerApellido', valor: editor.apellido?.tercerApellido },
      { campo: 'segundoApellido', valor: editor.apellido?.segundoApellido },
      { campo: 'primerApellido', valor: editor.apellido?.primerApellido }
    ];
    
    for (const { campo, valor } of apellidos) {
      if (valor && valor.trim() !== '') {
        this.logger.info(`👤 Buscando por ${campo}: "${valor}"`);
        
        // Buscar inputs que contengan este valor
        const inputs = await this.page.locator(`input[value="${valor}"]:visible`).all();
        
        if (inputs.length > 0) {
          // Si hay múltiples, usar el que corresponde al índice del editor
          if (editorIndex < inputs.length) {
            campoReferencia = inputs[editorIndex];
          } else {
            campoReferencia = inputs[0];
          }
          tipoCampoReferencia = campo;
          break;
        }
      }
    }
  }
  
  if (!campoReferencia) {
    throw new Error(`No se encontró campo de referencia para editor ${editorIndex + 1}`);
  }
  
  this.logger.info(`✅ Campo de referencia encontrado: ${tipoCampoReferencia}`);
  
  // Ahora buscar el dropdown "Tipo de documento" que está debajo de este campo
  return await this.buscarDropdownDebajoDeCampo(campoReferencia, editorIndex);
}
```

### 2. Buscar Dropdown Relativo al Campo de Referencia

```typescript
private async buscarDropdownDebajoDeCampo(
  campoReferencia: any,
  editorIndex: number
): Promise<any> {
  this.logger.info(`🔍 Buscando dropdown "Tipo de documento" debajo del campo de referencia`);
  
  try {
    // Obtener la fila (tr) que contiene el campo de referencia
    const filaReferencia = await campoReferencia.locator('xpath=ancestor::tr[1]').first();
    
    // Buscar en las siguientes 5 filas después del campo de referencia
    const siguientesFilas = await filaReferencia.locator('xpath=following-sibling::tr[position()<=5]').all();
    
    this.logger.info(`📊 Analizando ${siguientesFilas.length} filas después del campo de referencia`);
    
    for (let i = 0; i < siguientesFilas.length; i++) {
      const fila = siguientesFilas[i];
      const textoFila = await fila.textContent();
      
      if (textoFila?.includes('Tipo de documento')) {
        this.logger.info(`✅ Encontrada fila "Tipo de documento" en posición ${i + 1}`);
        
        // Buscar el elemento dropdown dentro de esta fila
        const dropdown = await this.extraerDropdownDeFila(fila, editorIndex);
        
        if (dropdown) {
          return dropdown;
        }
      }
    }
    
    // Si no se encontró, intentar estrategia alternativa
    this.logger.warn(`⚠️ No se encontró "Tipo de documento" en las siguientes 5 filas, expandiendo búsqueda...`);
    
    // Buscar en un rango más amplio (10 filas)
    const filasExtendidas = await filaReferencia.locator('xpath=following-sibling::tr[position()<=10]').all();
    
    for (const fila of filasExtendidas) {
      const textoFila = await fila.textContent();
      
      if (textoFila?.includes('Tipo de documento')) {
        const dropdown = await this.extraerDropdownDeFila(fila, editorIndex);
        if (dropdown) {
          return dropdown;
        }
      }
    }
    
  } catch (error) {
    this.logger.error(`❌ Error buscando dropdown relativo: ${error}`);
  }
  
  return null;
}
```

### 3. Extraer Elemento Dropdown de la Fila

```typescript
private async extraerDropdownDeFila(fila: any, editorIndex: number): Promise<any> {
  this.logger.info(`🎯 Extrayendo elemento dropdown de la fila`);
  
  // Estrategias ordenadas por probabilidad de éxito
  const dropdownSelectors = [
    // 1. Select HTML estándar
    'select:visible',
    
    // 2. ZK Combobox button (más específico primero)
    '.z-combobox-btn:visible',
    'button.z-combobox-btn:visible',
    'i.z-combobox-btn-icon',
    
    // 3. Botón con imagen de combo
    'button:has(img[src*="combo"]):visible',
    
    // 4. Elementos en la segunda celda (donde suele estar el valor)
    'td:nth-child(2) button:visible',
    'td:nth-child(2) select:visible',
    'td:nth-child(2) .z-combobox:visible',
    
    // 5. Cualquier elemento clickeable
    '[onclick]:visible',
    '[role="combobox"]:visible'
  ];
  
  for (const selector of dropdownSelectors) {
    try {
      const elementos = await fila.locator(selector).all();
      
      if (elementos.length > 0) {
        const elemento = elementos[0];
        
        // Verificar que es interactivo
        const esInteractivo = await elemento.evaluate(el => {
          return el.onclick !== null || 
                 el.tagName.toLowerCase() === 'select' || 
                 el.tagName.toLowerCase() === 'button' ||
                 el.classList.contains('z-combobox-btn') ||
                 el.getAttribute('role') === 'combobox';
        });
        
        if (esInteractivo) {
          const tagName = await elemento.evaluate(el => el.tagName.toLowerCase());
          this.logger.info(`✅ Dropdown encontrado: ${tagName} con selector "${selector}"`);
          
          return {
            element: elemento,
            type: tagName === 'select' ? 'select' : 'zk_dropdown',
            editorIndex: editorIndex
          };
        }
      }
    } catch (error) {
      this.logger.debug(`Selector ${selector} falló: ${error}`);
    }
  }
  
  this.logger.warn(`⚠️ No se encontró elemento dropdown en la fila`);
  return null;
}
```

### 4. Implementación Principal Mejorada

```typescript
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
    this.logger.info(`🔑 Estrategia: Usar campos del paso 34 como referencia`);

    // Screenshot inicial
    await takeScreenshot(this.page, 'step35_inicio', 'debug');

    let editoresCompletados = 0;
    const resultados: any[] = [];

    // Procesar cada editor
    for (let i = 0; i < editores.length; i++) {
      const editor = editores[i];
      
      this.logger.info(`\n🔄 Procesando Editor ${i + 1}/${editores.length}: ${editor.tipoPersona}`);
      
      try {
        // 1. Localizar dropdown usando campos de referencia del paso 34
        const dropdownInfo = await this.localizarDropdownPorCamposReferencia(editor, i);
        
        if (!dropdownInfo) {
          throw new Error(`No se encontró dropdown para editor ${i + 1}`);
        }
        
        // 2. Determinar tipo de documento
        const tipoDocumento = this.determinarTipoDocumento(editor);
        this.logger.info(`📄 Tipo documento: ${tipoDocumento}`);
        
        // 3. Seleccionar tipo de documento
        await this.seleccionarTipoDocumentoConVerificacion(dropdownInfo, tipoDocumento, i);
        
        // 4. Esperar a que aparezca el campo de número
        await this.page.waitForTimeout(2000);
        
        // 5. Insertar número si corresponde
        if (tipoDocumento !== 'Extranjero' && editor.fiscalId?.numero) {
          await this.insertarNumeroDocumentoConContexto(editor, i);
        }
        
        editoresCompletados++;
        resultados.push({
          index: i + 1,
          tipoPersona: editor.tipoPersona,
          tipoDocumento: tipoDocumento,
          numeroDocumento: editor.fiscalId?.numero,
          exitoso: true,
          mensaje: 'Completado correctamente'
        });
        
        this.logger.info(`✅ Editor ${i + 1} completado exitosamente`);
        
        // Screenshot después de cada editor
        await takeScreenshot(this.page, `step35_editor_${i + 1}_completado`, 'milestone');
        
      } catch (error) {
        this.logger.error(`❌ Error procesando editor ${i + 1}: ${error}`);
        await takeScreenshot(this.page, `error_step35_editor_${i + 1}`, 'error');
        
        resultados.push({
          index: i + 1,
          tipoPersona: editor.tipoPersona,
          tipoDocumento: this.determinarTipoDocumento(editor),
          numeroDocumento: editor.fiscalId?.numero,
          exitoso: false,
          mensaje: `Error: ${error}`
        });
        
        // Decidir si continuar
        if (i === 0) {
          // Si falla el primer editor, es crítico
          throw error;
        } else {
          // Para otros editores, registrar error pero continuar
          this.logger.warn(`⚠️ Continuando con siguiente editor después del error`);
        }
      }
      
      // Esperar entre editores
      if (i < editores.length - 1) {
        await this.page.waitForTimeout(1500);
      }
    }
    
    // Generar resumen
    this.generarResumenPaso35(resultados);
    
    stepTracker.logSuccess(35, `Tipo documento procesado para ${editoresCompletados}/${editores.length} editores`);
    this.logger.info(`\n✅ PASO 35 COMPLETADO - ${editoresCompletados}/${editores.length} editores procesados exitosamente`);

  } catch (error) {
    this.logger.error('❌ Error en Paso 35:', error);
    await takeScreenshot(this.page, 'error_step35_tipo_documento', 'error');
    stepTracker.logError(35, `Error: ${(error as Error).message}`);
    throw error;
  }
}
```

### 5. Métodos de Soporte Adicionales

```typescript
private async seleccionarTipoDocumentoConVerificacion(
  dropdownInfo: any,
  tipoDocumento: string,
  editorIndex: number
): Promise<void> {
  const { element, type } = dropdownInfo;
  
  this.logger.info(`🔽 Seleccionando "${tipoDocumento}" para editor ${editorIndex + 1}`);
  
  // Screenshot antes
  await takeScreenshot(this.page, `step35_before_select_editor_${editorIndex + 1}`, 'debug');
  
  try {
    if (type === 'select') {
      // HTML Select estándar
      await element.selectOption(tipoDocumento);
      await this.page.waitForTimeout(500);
      
      // Verificar selección
      const valorSeleccionado = await element.inputValue();
      if (valorSeleccionado === tipoDocumento) {
        this.logger.info(`✅ Tipo documento seleccionado correctamente`);
      }
      
    } else {
      // ZK Framework dropdown
      await element.click();
      await this.page.waitForTimeout(1000);
      
      // Buscar y clickear la opción
      const opcionEncontrada = await this.seleccionarOpcionZK(tipoDocumento);
      
      if (!opcionEncontrada) {
        throw new Error(`No se pudo seleccionar opción "${tipoDocumento}"`);
      }
    }
    
    // Screenshot después
    await takeScreenshot(this.page, `step35_after_select_editor_${editorIndex + 1}`, 'debug');
    
  } catch (error) {
    this.logger.error(`❌ Error seleccionando tipo documento: ${error}`);
    throw error;
  }
}

private async seleccionarOpcionZK(tipoDocumento: string): Promise<boolean> {
  // Buscar opciones visibles
  const opcionSelectors = [
    `text="${tipoDocumento}"`,
    `.z-comboitem:has-text("${tipoDocumento}")`,
    `td:visible:has-text("${tipoDocumento}")`,
    `[role="option"]:has-text("${tipoDocumento}")`,
    `li:visible:has-text("${tipoDocumento}")`
  ];
  
  for (const selector of opcionSelectors) {
    try {
      const opcion = this.page.locator(selector).first();
      if (await opcion.isVisible({ timeout: 2000 })) {
        await opcion.click();
        this.logger.info(`✅ Opción "${tipoDocumento}" clickeada`);
        return true;
      }
    } catch (e) {
      // Continuar con siguiente selector
    }
  }
  
  return false;
}

private async insertarNumeroDocumentoConContexto(
  editor: any,
  editorIndex: number
): Promise<void> {
  const numero = editor.fiscalId?.numero;
  if (!numero) return;
  
  this.logger.info(`📝 Insertando número documento: ${numero}`);
  
  // Usar la misma estrategia: buscar desde el campo de referencia
  let campoReferencia = null;
  
  if (editor.tipoPersona === 'Persona Juridica') {
    campoReferencia = await this.page.locator(`input[value="${editor.razonSocial}"]:visible`).first();
  } else {
    // Buscar por apellidos
    const apellidos = [editor.apellido?.tercerApellido, editor.apellido?.segundoApellido, editor.apellido?.primerApellido];
    for (const apellido of apellidos) {
      if (apellido) {
        const inputs = await this.page.locator(`input[value="${apellido}"]:visible`).all();
        if (inputs.length > editorIndex) {
          campoReferencia = inputs[editorIndex];
          break;
        } else if (inputs.length > 0) {
          campoReferencia = inputs[0];
          break;
        }
      }
    }
  }
  
  if (!campoReferencia) {
    this.logger.warn(`⚠️ No se encontró campo de referencia para buscar campo número`);
    return;
  }
  
  // Buscar campo de número que apareció después de seleccionar tipo documento
  const filaReferencia = await campoReferencia.locator('xpath=ancestor::tr[1]').first();
  const siguientesFilas = await filaReferencia.locator('xpath=following-sibling::tr[position()<=10]').all();
  
  // Buscar inputs vacíos que puedan ser el campo de número
  for (const fila of siguientesFilas) {
    const inputs = await fila.locator('input[type="text"]:visible').all();
    
    for (const input of inputs) {
      const valor = await input.inputValue();
      const name = await input.getAttribute('name') || '';
      
      // Buscar campo vacío que no sea nombre/apellido/email/etc
      if (valor === '' && 
          !name.includes('nombre') && 
          !name.includes('apellido') && 
          !name.includes('email') &&
          !name.includes('telefono') &&
          !name.includes('porcentaje')) {
        
        // Probablemente es el campo de número
        await input.click();
        await input.fill(numero);
        
        // Verificar
        const valorInsertado = await input.inputValue();
        if (valorInsertado === numero) {
          this.logger.info(`✅ Número documento insertado correctamente`);
          return;
        }
      }
    }
  }
  
  this.logger.warn(`⚠️ No se encontró campo para insertar número documento`);
}

private generarResumenPaso35(resultados: any[]): void {
  this.logger.info('\n📊 RESUMEN PASO 35:');
  this.logger.info('═══════════════════════════════════════');
  
  let exitosos = 0;
  let fallidos = 0;
  
  resultados.forEach((resultado) => {
    const icono = resultado.exitoso ? '✅' : '❌';
    this.logger.info(`${icono} Editor ${resultado.index}: ${resultado.tipoPersona} - ${resultado.tipoDocumento} - ${resultado.mensaje}`);
    
    if (resultado.exitoso) exitosos++;
    else fallidos++;
  });
  
  this.logger.info('═══════════════════════════════════════');
  this.logger.info(`Total: ${resultados.length} editores`);
  this.logger.info(`Exitosos: ${exitosos}`);
  this.logger.info(`Fallidos: ${fallidos}`);
  this.logger.info(`Tasa de éxito: ${((exitosos / resultados.length) * 100).toFixed(1)}%`);
}

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
```

## Ventajas de esta Estrategia

1. **Precisión**: Usa datos únicos ya insertados como puntos de referencia inequívocos
2. **Robustez**: No depende de índices o posiciones absolutas que pueden cambiar
3. **Contexto**: Aprovecha la relación espacial consistente entre campos
4. **Verificable**: Cada paso puede verificarse visualmente con los screenshots

## Casos de Prueba

```typescript
// El caso actual que falla
const casoActual = {
  editores: [
    { 
      tipoPersona: 'Persona Juridica', 
      razonSocial: 'EDITORIAL MUSICAL S.A.',
      fiscalId: { tipo: 'CUIT', numero: '33-11111111-1' } 
    },
    { 
      tipoPersona: 'Persona Fisica',
      apellido: { 
        primerApellido: 'GARCÍA',
        segundoApellido: 'LÓPEZ',
        tercerApellido: 'MARTÍNEZ'
      },
      fiscalId: { tipo: 'CUIL', numero: '27-22222222-2' } 
    },
    { 
      tipoPersona: 'Persona Juridica',
      razonSocial: 'MÚSICA ARGENTINA SRL', 
      fiscalId: { tipo: 'CUIT', numero: '30-33333333-3' } 
    },
    { 
      tipoPersona: 'Persona Fisica',
      apellido: {
        primerApellido: 'RODRÍGUEZ',
        segundoApellido: 'PÉREZ'
      },
      fiscalId: { tipo: 'CUIL', numero: '20-44444444-4' } 
    }
  ]
};
```

## Integración

Esta solución es compatible con el código existente. Solo requiere:

1. Reemplazar el método `insertarDatosCompletosEditoresDocumento`
2. Agregar los nuevos métodos auxiliares que usan campos como referencia
3. Mantener métodos existentes como `determinarTipoDocumento`

La clave está en usar los datos ya insertados como "anclas" para localizar con precisión los dropdowns correctos.