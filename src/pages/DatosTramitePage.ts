import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { tryInteraction, InteractionStrategy } from '../common/interactionHelper';
import { DATOS_TRAMITE_SELECTORS } from '../constants/selectors';

/**
 * Page Object para los datos del trámite en TAD
 */
export class DatosTramitePage extends BasePage {
  constructor(page: Page) {
    super(page, 'DatosTramitePage');
  }

  async isLoaded(): Promise<boolean> {
    try {
      // Verificar que estemos en la sección de datos del trámite
      const datosTramiteSection = await this.elementExists('text=Datos del Trámite');
      const completarButton = await this.elementExists(DATOS_TRAMITE_SELECTORS.completarButton);
      
      return datosTramiteSection || completarButton;
    } catch (error) {
      this.logger.error('Error verificando si los datos del trámite están cargados:', error);
      return false;
    }
  }

  async waitForLoad(): Promise<void> {
    this.logger.info('Esperando que cargue la sección de datos del trámite...');
    
    // Esperar por algún indicador de que los datos del trámite estén listos
    await this.page.waitForSelector('text=Datos del Trámite', { 
      state: 'visible',
      timeout: 10000 
    });
    
    await this.wait(1000);
  }

  /**
   * Hace clic en el botón "Completar" de los datos del trámite
   */
  async clickCompletar(): Promise<void> {
    this.logger.info('Haciendo clic en Completar datos del trámite...');
    
    // Primero buscar específicamente el botón de datos del trámite por su contexto
    const strategies: InteractionStrategy[] = [
      {
        name: 'Completar button in Datos del Trámite section',
        locator: (page) => {
          // Buscar el panel de datos del trámite y luego el botón completar dentro de él
          return page.locator('.panel:has-text("Datos del Trámite")').locator('a:has-text("Completar")');
        }
      },
      {
        name: 'Link with data-target for Datos del Trámite',
        locator: (page) => page.locator(DATOS_TRAMITE_SELECTORS.completarButton)
      },
      {
        name: 'Completar button after Datos del Trámite',
        locator: (page) => {
          // Buscar el segundo botón Completar (asumiendo que Datos del Trámite es el primero)
          return page.locator('a.btn-default:has-text("Completar")').nth(1);
        }
      },
      {
        name: 'Link with btn-default and Completar text in correct section',
        locator: (page) => page.locator("#collapseDatosTramite").locator("../..").locator("a.btn-default:has-text('Completar')")
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer clic en Completar datos del trámite');
    }
    
    // Esperar a que se expanda el formulario
    await this.wait(2000);
    
    // Verificar que se abrió la sección correcta
    const datosTramiteVisible = await this.page.locator('#collapseDatosTramite.in, #collapseFormularioDatosTramite.in').isVisible().catch(() => false);
    if (!datosTramiteVisible) {
      this.logger.warn('⚠️ La sección de datos del trámite no se expandió correctamente');
      
      // Intentar cerrar cualquier sección abierta incorrectamente
      const openSections = await this.page.locator('.panel-collapse.in').all();
      for (const section of openSections) {
        const id = await section.getAttribute('id');
        if (id && id !== 'collapseDatosTramite' && id !== 'collapseFormularioDatosTramite') {
          this.logger.info(`Cerrando sección incorrecta: ${id}`);
          // Buscar el botón de colapsar de esa sección
          await this.page.locator(`a[data-target="#${id}"]:visible`).click().catch(() => {});
          await this.wait(500);
        }
      }
      
      // Intentar abrir nuevamente los datos del trámite
      this.logger.info('Intentando abrir datos del trámite nuevamente...');
      await this.page.locator('.panel:has-text("Datos del Trámite")').locator('a:has-text("Completar")').click();
      await this.wait(2000);
    }
    
    await this.takeScreenshot('datos_tramite_expandidos', 'debug');
  }

  /**
   * Selecciona una opción en el dropdown de depósito digital
   */
  async selectDepositoDigital(opcion: 'Si' | 'No'): Promise<void> {
    this.logger.info(`Seleccionando "${opcion}" en depósito digital...`);
    
    // Estrategias contextuales robustas que no dependen de IDs dinámicos
    const dropdownStrategies: InteractionStrategy[] = [
      {
        name: 'Contextual by label text',
        locator: (page) => page.locator('text="¿Usted opta por depositar la obra digitalmente?"')
          .locator('..')
          .locator('[role="combobox"]')
      },
      {
        name: 'By name attribute',
        locator: (page) => page.locator('[name="cmb_usted_opta"]')
      },
      {
        name: 'Row-based contextual',
        locator: (page) => page.locator('tr:has-text("¿Usted opta por depositar")')
          .locator('[role="combobox"]')
      },
      {
        name: 'Deposit section contextual',
        locator: (page) => page.locator('div:has-text("Modo de depósito")')
          .locator('[role="combobox"]')
      },
      {
        name: 'ZK Combobox by class',
        locator: (page) => page.locator('.z-combobox-input').first()
      },
      {
        name: 'Any combobox button',
        locator: (page) => page.locator('[role="combobox"]').first()
      }
    ];
    
    // Hacer clic para abrir el dropdown
    const clickResult = await tryInteraction(this.page, 'click', dropdownStrategies);
    
    if (!clickResult.success) {
      throw new Error('No se pudo abrir el dropdown de depósito digital');
    }
    
    await this.wait(500);
    
    // OPTIMIZED: Successful strategies first based on log analysis
    const optionStrategies: InteractionStrategy[] = [
      // ✅ SUCCESS_STRATEGY: Exact text match for Si - put this first
      {
        name: `Exact text match for ${opcion}`,
        locator: (page) => page.getByText(opcion, { exact: true })
      },
      // Other successful strategies next
      {
        name: `Cell with role and exact text`,
        locator: (page) => page.getByRole('cell', { name: opcion, exact: true })
      },
      // Fallback strategies
      {
        name: `ZK Comboitem with ${opcion}`,
        locator: (page) => page.locator(`.z-comboitem:has-text("${opcion}")`)
      },
      {
        name: `Listitem with ${opcion}`,
        locator: (page) => page.getByRole('listitem', { name: opcion })
      },
      {
        name: `Option element with ${opcion}`,
        locator: (page) => page.getByRole('option', { name: opcion })
      },
      {
        name: `Any visible text ${opcion}`,
        locator: (page) => page.locator(`text="${opcion}"`).first()
      }
    ];
    
    const optionResult = await tryInteraction(this.page, 'click', optionStrategies);
    
    if (!optionResult.success) {
      throw new Error(`No se pudo seleccionar la opción "${opcion}"`);
    }
    
    await this.takeScreenshot(`deposito_digital_${opcion.toLowerCase()}`, 'debug');
  }

  /**
   * Ingresa el email de notificaciones
   */
  async enterEmailNotificaciones(email: string): Promise<void> {
    this.logger.info(`Ingresando email de notificaciones: ${email}`);
    
    // OPTIMIZED: Successful strategy first based on log analysis
    const strategies: InteractionStrategy[] = [
      // ✅ SUCCESS_STRATEGY: Input with name nic_direccion_correo (grabado) - put this first
      {
        name: 'Input with name nic_direccion_correo (grabado)',
        locator: (page) => page.locator('input[name="nic_direccion_correo"]')
      },
      // Fallback strategies
      {
        name: 'Input by ID uGxF_0',
        locator: (page) => page.locator(DATOS_TRAMITE_SELECTORS.emailNotificacionesInput)
      },
      {
        name: 'Input with name nic_direccion_correo alt',
        locator: (page) => page.locator(DATOS_TRAMITE_SELECTORS.emailNotificacionesAlt)
      },
      {
        name: 'Textbox with z-textbox class',
        locator: (page) => page.locator("input.z-textbox[type='text']").last()
      },
      {
        name: 'Any email input',
        locator: (page) => page.locator("input[type='email']")
      }
    ];
    
    // Primero hacer clic en el campo
    await tryInteraction(this.page, 'click', strategies);
    await this.wait(200);
    
    // Luego llenar el campo
    const result = await tryInteraction(this.page, 'fill', strategies, email);
    
    if (!result.success) {
      throw new Error('No se pudo ingresar el email de notificaciones');
    }
    
    await this.takeScreenshot('email_notificaciones_ingresado', 'debug');
  }

  /**
   * Hace clic en el botón Guardar
   */
  async clickGuardar(): Promise<void> {
    this.logger.info('Guardando datos del trámite...');
    
    // OPTIMIZED: Successful strategy first based on log analysis
    const strategies: InteractionStrategy[] = [
      // ✅ SUCCESS_STRATEGY: GUARDAR button in caratulaVariable (grabado) - put this first
      {
        name: 'GUARDAR button in caratulaVariable (grabado)',
        locator: (page) => page.locator('#caratulaVariable').getByText('GUARDAR')
      },
      // Fallback strategies
      {
        name: 'Button with GUARDAR text',
        locator: (page) => page.locator('button:has-text("GUARDAR")')
      },
      {
        name: 'Button span with GUARDAR',
        locator: (page) => page.locator('button span.z-button:has-text("GUARDAR")')
      },
      {
        name: 'Any button with GUARDAR',
        locator: (page) => page.getByRole('button', { name: 'GUARDAR' })
      },
      {
        name: 'Submit button',
        locator: (page) => page.locator('button[type="submit"]').first()
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer clic en GUARDAR');
    }
    
    // Esperar a que se guarde
    await this.wait(3000);
    await this.takeScreenshot('datos_tramite_guardados', 'milestone');
  }

  /**
   * Completa todos los datos del trámite
   */
  async completarDatosTramite(email: string, depositoDigital: 'Si' | 'No' = 'Si'): Promise<void> {
    this.logger.info('Completando datos del trámite...');
    
    try {
      // Verificar que la página esté cargada
      if (!await this.isLoaded()) {
        await this.waitForLoad();
      }
      
      // Paso 1: Hacer clic en Completar
      await this.clickCompletar();
      
      // Paso 2: Seleccionar opción de depósito digital
      await this.selectDepositoDigital(depositoDigital);
      
      // Paso 3: Ingresar email de notificaciones
      await this.enterEmailNotificaciones(email);
      
      // Paso 4: Guardar los datos del trámite
      await this.clickGuardar();
      
      this.logger.info('✅ Datos del trámite completados exitosamente');
      
    } catch (error) {
      this.logger.error('Error completando los datos del trámite:', error);
      await this.takeScreenshot('datos_tramite_error', 'error');
      throw error;
    }
  }

  /**
   * Verifica si hay errores en el formulario
   */
  async hasFormErrors(): Promise<boolean> {
    return await this.elementExists('.z-errbox:visible, .z-errorbox:visible');
  }

  /**
   * Obtiene los mensajes de error del formulario
   */
  async getFormErrors(): Promise<string[]> {
    const errors: string[] = [];
    const errorElements = await this.page.locator('.z-errbox:visible, .z-errorbox:visible').all();
    
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text) {
        errors.push(text.trim());
      }
    }
    
    return errors;
  }

  /**
   * Verifica si los datos del trámite están completos
   */
  async isDatosTramiteComplete(): Promise<boolean> {
    try {
      // Buscar indicadores de que los datos del trámite están completos
      const completedIndicators = [
        'i.fa-check-circle',
        'text=Completo',
        '.estado-completo'
      ];
      
      for (const indicator of completedIndicators) {
        if (await this.elementExists(indicator)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error verificando si los datos del trámite están completos:', error);
      return false;
    }
  }

  /**
   * Obtiene el estado actual de los datos del trámite
   */
  async getDatosTramiteStatus(): Promise<string> {
    try {
      // Buscar el estado en diferentes posibles ubicaciones
      const statusSelectors = [
        '.estado-datos-tramite',
        '.datos-tramite-status',
        'span:has-text("Estado:")',
        '.panel-heading:has-text("Datos del Trámite") .badge'
      ];
      
      for (const selector of statusSelectors) {
        const element = this.page.locator(selector);
        if (await element.count() > 0) {
          const text = await element.textContent();
          return text?.trim() || 'Desconocido';
        }
      }
      
      return 'Desconocido';
    } catch (error) {
      this.logger.error('Error obteniendo el estado de los datos del trámite:', error);
      return 'Error';
    }
  }
}
