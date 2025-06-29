import { Page } from 'playwright';
import { createLogger } from '../common/logger';
import { tryInteraction, InteractionStrategy } from '../common/interactionHelper';
import { takeScreenshot } from '../common/screenshotManager';
import { createDebugSnapshot } from '../common/debugSnapshot';
import { config } from '../config';
import { normalizarTexto } from '../utils/textUtils';
import { getStepTracker } from '../common/stepTracker';

/**
 * Servicio genérico para interacciones con formularios
 * Proporciona métodos reutilizables para diferentes tipos de campos
 */
export class FormInteractionService {
  private logger = createLogger('FormInteractionService');

  constructor(private page: Page) {}

  /**
   * Método genérico para seleccionar una opción en cualquier dropdown del formulario
   * Usa el contexto de la fila de la tabla para identificar el dropdown correcto
   */
  async seleccionarEnDropdownGenerico(
    labelTexto: string,
    opcionASeleccionar: string,
    stepNumber: number,
    opcionesEsperadas?: string[],
    dropdownIdConocido?: string
  ): Promise<void> {
    const stepTracker = getStepTracker();
    stepTracker.startStep(stepNumber);
    
    this.logger.info(`📝 Seleccionando en dropdown "${labelTexto}": "${opcionASeleccionar}"`);
    
    try {
      // Encontrar la fila específica que contiene el label
      const filaSelector = `tr:has(td:has-text("${labelTexto}"))`;
      const fila = this.page.locator(filaSelector);
      
      // Verificar que encontramos la fila correcta
      const filaCount = await fila.count();
      if (filaCount === 0) {
        throw new Error(`No se encontró la fila con "${labelTexto}"`);
      }
      
      this.logger.info(`🔍 Encontrada la fila de "${labelTexto}" (${filaCount} coincidencia(s))`);
      
      // OPTIMIZED: Successful strategies first based on log analysis
      const dropdownStrategies: InteractionStrategy[] = [
        // ✅ SUCCESS_STRATEGY: Botón dropdown dentro de la fila de X - put this first
        {
          name: `Botón dropdown dentro de la fila de ${labelTexto}`,
          locator: (page) => page.locator(`${filaSelector} [id$="-btn"]`).first()
        },
        // Fallback strategies
        {
          name: `Input combobox en la fila de ${labelTexto}`,
          locator: (page) => page.locator(`${filaSelector} input.z-combobox-inp`).first()
        },
        {
          name: `Elemento clickeable en la celda del dropdown`,
          locator: (page) => page.locator(`${filaSelector} td`).nth(1).locator('[id$="-btn"], input').first()
        }
      ];
      
      // Si conocemos el ID específico del dropdown, agregarlo como estrategia
      if (dropdownIdConocido) {
        dropdownStrategies.unshift({
          name: 'Dropdown por ID conocido',
          locator: (page) => page.locator(`#${dropdownIdConocido}`)
        });
      }
      
      // Hacer click para abrir el dropdown
      const dropdownResult = await tryInteraction(this.page, 'click', dropdownStrategies, undefined, stepNumber);
      
      if (!dropdownResult.success) {
        throw new Error(`No se pudo abrir el dropdown de ${labelTexto}`);
      }
      
      // Esperar a que aparezcan las opciones
      await this.page.waitForTimeout(1000);
      
      // Verificar las opciones visibles
      const opcionesVisibles = await this.page.locator('td[role="gridcell"]:visible, td.z-comboitem-text:visible').allTextContents();
      this.logger.info(`🔍 Opciones visibles: ${JSON.stringify(opcionesVisibles)}`);
      
      // Si se proporcionaron opciones esperadas, validar
      if (opcionesEsperadas && opcionesEsperadas.length > 0) {
        const opcionesNormalizadasVisibles = opcionesVisibles.map(opt => normalizarTexto(opt));
        const opcionesNormalizadasEsperadas = opcionesEsperadas.map(opt => normalizarTexto(opt));
        
        const todasPresentes = opcionesNormalizadasEsperadas.every(esperada => 
          opcionesNormalizadasVisibles.some(visible => visible === esperada)
        );
        
        if (todasPresentes) {
          this.logger.info(`✅ Opciones esperadas encontradas correctamente`);
        } else {
          this.logger.warn(`⚠️ No se encontraron todas las opciones esperadas`);
          this.logger.warn(`⚠️ Esperadas: ${JSON.stringify(opcionesEsperadas)}`);
          this.logger.warn(`⚠️ Visibles: ${JSON.stringify(opcionesVisibles.slice(0, 10))}...`);
        }
      }
      
      // OPTIMIZED: Successful strategy first based on log analysis
      const optionStrategies: InteractionStrategy[] = [
        // ✅ SUCCESS_STRATEGY: TD visible con texto exacto - put this first
        {
          name: `TD visible con texto exacto`,
          locator: (page) => page.locator(`td:visible:text-is("${opcionASeleccionar}")`).first()
        },
        // Fallback strategies
        {
          name: `Cell con texto exacto "${opcionASeleccionar}"`,
          locator: (page) => page.locator(`td[role="gridcell"]:text-is("${opcionASeleccionar}")`).first()
        },
        {
          name: `Por role cell con nombre exacto`,
          locator: (page) => page.getByRole('cell', { name: opcionASeleccionar, exact: true }).first()
        },
        {
          name: `Comboitem con texto`,
          locator: (page) => page.locator(`td.z-comboitem-text:visible:text-is("${opcionASeleccionar}")`).first()
        }
      ];
      
      const optionResult = await tryInteraction(this.page, 'click', optionStrategies, undefined, stepNumber);
      
      if (!optionResult.success) {
        // Verificar si el dropdown se cerró
        const dropdownAbierto = await this.page.locator('td[role="gridcell"]:visible').count() > 0;
        
        if (!dropdownAbierto) {
          this.logger.warn('⚠️ El dropdown se cerró sin seleccionar ninguna opción');
          
          if (config.DEVELOPER_DEBUG_MODE) {
            this.logger.info('🛑 Pausando para intervención manual');
            this.logger.info(`Por favor, selecciona manualmente "${opcionASeleccionar}" en el campo "${labelTexto}" y presiona Resume`);
            await this.page.pause();
            stepTracker.logSuccess(stepNumber, 'Completado manualmente');
            return;
          } else {
            throw new Error(`No se pudo seleccionar la opción "${opcionASeleccionar}"`);
          }
        } else {
          throw new Error(`No se pudo seleccionar la opción "${opcionASeleccionar}" aunque el dropdown está abierto`);
        }
      }
      
      // Esperar un momento después de la selección
      await this.page.waitForTimeout(1000);
      
      // Verificar la selección
      try {
        const valorSeleccionado = await this.page.locator(`${filaSelector} input.z-combobox-inp`).first().inputValue();
        if (valorSeleccionado) {
          this.logger.info(`✅ Valor confirmado en el campo: "${valorSeleccionado}"`);
          
          // Comparación normalizada para evitar problemas con tildes
          if (normalizarTexto(valorSeleccionado) !== normalizarTexto(opcionASeleccionar)) {
            this.logger.warn(`⚠️ Advertencia: el valor "${valorSeleccionado}" no coincide exactamente con "${opcionASeleccionar}"`);
          }
        }
      } catch (e) {
        this.logger.debug('No se pudo verificar el valor final:', e);
      }
      
    } catch (error) {
      this.logger.error(`Error al seleccionar en dropdown ${labelTexto}:`, error);
      
      await takeScreenshot(this.page, `error_dropdown_${labelTexto.toLowerCase().replace(/\s+/g, '_')}`, 'error');
      
      if (config.DEVELOPER_DEBUG_MODE) {
        await createDebugSnapshot(this.page, `error_dropdown_${labelTexto}`, `Error al seleccionar en dropdown ${labelTexto}`);
        this.logger.info('🛑 Error detectado - pausando para intervención manual');
        await this.page.pause();
        stepTracker.logSuccess(stepNumber, 'Resuelto manualmente después de error');
      } else {
        throw error;
      }
    }
    
    this.logger.info(`✅ Selección completada en "${labelTexto}": "${opcionASeleccionar}"`);
  }

  /**
   * Completa un campo de texto con validación opcional
   */
  async completarCampoTexto(
    labelTexto: string,
    valor: string,
    stepNumber: number,
    validador?: (valor: string) => boolean,
    mensajeError?: string
  ): Promise<void> {
    const stepTracker = getStepTracker();
    stepTracker.startStep(stepNumber);
    
    this.logger.info(`📝 Completando campo "${labelTexto}": "${valor}"`);
    
    // Validar si se proporciona un validador
    if (validador && !validador(valor)) {
      throw new Error(mensajeError || `Valor inválido para ${labelTexto}: ${valor}`);
    }
    
    // Estrategias para encontrar el campo
    const strategies: InteractionStrategy[] = [
      {
        name: `Input en fila con ${labelTexto}`,
        locator: (page) => page.locator(`tr:has-text("${labelTexto}") input[type="text"]`)
      },
      {
        name: `Input con placeholder ${labelTexto}`,
        locator: (page) => page.locator(`input[placeholder*="${labelTexto}"]`)
      },
      {
        name: `Input cerca de label ${labelTexto}`,
        locator: (page) => page.locator(`label:has-text("${labelTexto}") + input`)
      }
    ];
    
    // Hacer click en el campo
    const clickResult = await tryInteraction(this.page, 'click', strategies, undefined, stepNumber);
    
    if (!clickResult.success) {
      throw new Error(`No se pudo hacer click en el campo ${labelTexto}`);
    }
    
    // Llenar el campo
    const fillResult = await tryInteraction(this.page, 'fill', strategies, valor, stepNumber);
    
    if (!fillResult.success) {
      throw new Error(`No se pudo completar el campo ${labelTexto}`);
    }
    
    await this.page.waitForTimeout(500);
    
    this.logger.info(`✅ Campo "${labelTexto}" completado con: "${valor}"`);
  }

  /**
   * Completa un campo numérico con validación
   */
  async completarCampoNumerico(
    labelTexto: string,
    valor: number,
    stepNumber: number,
    validarPositivo: boolean = true
  ): Promise<void> {
    if (validarPositivo && valor <= 0) {
      throw new Error(`${labelTexto} debe ser un número positivo. Valor recibido: ${valor}`);
    }
    
    await this.completarCampoTexto(
      labelTexto,
      valor.toString(),
      stepNumber,
      (v) => !isNaN(Number(v)) && (!validarPositivo || Number(v) > 0),
      `${labelTexto} debe ser un número${validarPositivo ? ' positivo' : ''}`
    );
  }

  /**
   * Completa un campo de fecha con validación de formato
   */
  async completarCampoFecha(
    labelTexto: string,
    fecha: string,
    stepNumber: number,
    formato: string = 'DD-MM-YYYY'
  ): Promise<void> {
    const fechaRegex = formato === 'DD-MM-YYYY' 
      ? /^\d{2}-\d{2}-\d{4}$/
      : /^\d{4}-\d{2}-\d{2}$/;
    
    await this.completarCampoTexto(
      labelTexto,
      fecha,
      stepNumber,
      (f) => fechaRegex.test(f),
      `Formato de fecha inválido. Debe ser ${formato}`
    );
    
    // Presionar Tab para cerrar cualquier datepicker
    await this.page.keyboard.press('Tab');
  }

  /**
   * Hace click en un botón con múltiples estrategias
   */
  async clickBoton(
    textoBoton: string,
    stepNumber: number,
    contexto?: string
  ): Promise<void> {
    const stepTracker = getStepTracker();
    stepTracker.startStep(stepNumber);
    
    this.logger.info(`🖱️ Haciendo click en botón: "${textoBoton}"${contexto ? ` (${contexto})` : ''}`);
    
    const strategies: InteractionStrategy[] = [
      {
        name: `Botón con texto exacto ${textoBoton}`,
        locator: (page) => page.locator(`button:text-is("${textoBoton}")`)
      },
      {
        name: `Div con texto exacto ${textoBoton}`,
        locator: (page) => page.locator(`div:text-is("${textoBoton}")`)
      },
      {
        name: `Link con texto ${textoBoton}`,
        locator: (page) => page.locator(`a:has-text("${textoBoton}")`)
      },
      {
        name: `Cualquier elemento clickeable con texto`,
        locator: (page) => page.locator(`*:text-is("${textoBoton}")`)
      }
    ];
    
    // Si hay contexto, agregar estrategias específicas
    if (contexto) {
      strategies.unshift({
        name: `Botón en contexto ${contexto}`,
        locator: (page) => page.locator(`${contexto} *:text-is("${textoBoton}")`)
      });
    }
    
    const result = await tryInteraction(this.page, 'click', strategies, undefined, stepNumber);
    
    if (!result.success) {
      throw new Error(`No se pudo hacer click en el botón ${textoBoton}`);
    }
    
    this.logger.info(`✅ Click en botón "${textoBoton}" completado`);
  }

  /**
   * Verifica si hay mensajes de error visibles
   */
  async verificarErrores(): Promise<{ hayError: boolean; mensaje?: string }> {
    try {
      const errorSelectors = [
        '.z-messagebox-window:visible',
        '.z-errbox:visible',
        '.z-errorbox:visible'
      ];
      
      for (const selector of errorSelectors) {
        const errorElement = this.page.locator(selector);
        if (await errorElement.count() > 0) {
          const mensaje = await errorElement.textContent();
          return { hayError: true, mensaje: mensaje || 'Error desconocido' };
        }
      }
      
      return { hayError: false };
    } catch (e) {
      this.logger.debug('Error al verificar mensajes de error:', e);
      return { hayError: false };
    }
  }
}
