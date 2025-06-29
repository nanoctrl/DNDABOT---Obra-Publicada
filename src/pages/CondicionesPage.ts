import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { tryInteraction, InteractionStrategy } from '../common/interactionHelper';
import { CONDICIONES_SELECTORS } from '../constants/selectors';

/**
 * Page Object para las condiciones del trámite en TAD
 */
export class CondicionesPage extends BasePage {
  constructor(page: Page) {
    super(page, 'CondicionesPage');
  }

  async isLoaded(): Promise<boolean> {
    try {
      // Verificar que estemos en la sección de condiciones
      const condicionesSection = await this.elementExists('text=Condiciones del trámite');
      const completarButton = await this.elementExists(CONDICIONES_SELECTORS.completarButton);
      
      return condicionesSection || completarButton;
    } catch (error) {
      this.logger.error('Error verificando si las condiciones están cargadas:', error);
      return false;
    }
  }

  async waitForLoad(): Promise<void> {
    this.logger.info('Esperando que cargue la sección de condiciones...');
    
    // Esperar por algún indicador de que las condiciones están listas
    await this.page.waitForSelector('text=Condiciones del trámite', { 
      state: 'visible',
      timeout: 10000 
    });
    
    await this.wait(1000);
  }

  /**
   * Hace clic en el botón "Completar" de las condiciones
   */
  async clickCompletar(): Promise<void> {
    this.logger.info('Haciendo clic en Completar condiciones...');
    
    // OPTIMIZED: Successful strategy first based on log analysis
    const strategies: InteractionStrategy[] = [
      // ✅ SUCCESS_STRATEGY: Completar button with btn-default class for Condiciones - put this first
      {
        name: 'Completar button with btn-default class for Condiciones',
        locator: (page) => page.locator('a.btn-default:has-text("Completar")')
          .filter({ hasText: 'Condiciones' })
          .or(page.locator('a.btn-default:has-text("COMPLETAR")').last())
      },
      // Fallback strategies
      {
        name: 'Completar button in Condiciones del trámite panel (like DatosTramite)',
        locator: (page) => page.locator('.panel:has-text("Condiciones del trámite")')
          .locator('a:has-text("Completar")')
      },
      {
        name: 'Row with Condiciones text and COMPLETAR link',
        locator: (page) => page.locator('tr:has-text("Condiciones del trámite")')
          .locator('a:has-text("COMPLETAR"), a:has-text("Completar")')
      },
      {
        name: 'Any COMPLETAR/Completar link near Condiciones text',
        locator: (page) => page.locator('text="Condiciones del trámite"')
          .locator('..')
          .locator('a:has-text("COMPLETAR"), a:has-text("Completar")')
      },
      {
        name: 'Last COMPLETAR button (fallback)',
        locator: (page) => page.locator('a:has-text("COMPLETAR"), a:has-text("Completar")').last()
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer clic en Completar condiciones');
    }
    
    // Esperar a que se expanda el formulario - más tiempo para permitir que se abra completamente
    await this.wait(5000);
    
    // Verificar que el formulario esté realmente abierto con múltiples indicadores
    const formIndicators = [
      this.page.locator('#dynform4').isVisible().catch(() => false),
      this.page.locator('text="Leído"').isVisible().catch(() => false),
      this.page.locator('button:has-text("GUARDAR")').isVisible().catch(() => false),
      this.page.locator('textarea, .z-textbox').isVisible().catch(() => false)
    ];
    
    const results = await Promise.all(formIndicators);
    const formVisible = results.some(result => result);
    
    if (!formVisible) {
      this.logger.warn('⚠️ El formulario de condiciones no parece estar visible, esperando más...');
      await this.wait(3000);
      
      // Verificar nuevamente
      const secondCheck = await Promise.all(formIndicators);
      const stillNotVisible = !secondCheck.some(result => result);
      
      if (stillNotVisible) {
        this.logger.error('❌ El formulario de condiciones no se abrió correctamente');
        await this.takeScreenshot('condiciones_form_failed_to_open', 'error');
        throw new Error('El formulario de condiciones no se abrió después de hacer clic en COMPLETAR');
      }
    }
    
    await this.takeScreenshot('condiciones_expandidas', 'debug');
  }

  /**
   * Selecciona una opción en el dropdown "Leído"
   */
  async selectLeido(opcion: 'Si' | 'No'): Promise<void> {
    this.logger.info(`Seleccionando "${opcion}" en dropdown Leído...`);
    
    // Esperar un poco más para que el formulario se estabilice completamente
    await this.wait(2000);
    
    // Tomar screenshot para ver el estado actual
    await this.takeScreenshot('before_dropdown_interaction', 'debug');
    
    // OPTIMIZED: Successful strategy first based on log analysis
    const dropdownStrategies: InteractionStrategy[] = [
      // ✅ SUCCESS_STRATEGY: Any input in the conditions form area - put this first
      {
        name: 'Any input in the conditions form area',
        locator: (page) => page.locator('input:visible').filter({ hasText: '' }).last()
      },
      // Fallback strategies
      {
        name: 'Dropdown input next to Leído label',
        locator: (page) => page.locator('text="Leído"')
          .locator('..')
          .locator('input, .z-combobox-input, [role="combobox"]')
      },
      {
        name: 'ZK combobox input in form',
        locator: (page) => page.locator('.z-combobox-input').last()
      },
      {
        name: 'Input field near GUARDAR button',
        locator: (page) => page.locator('button:has-text("GUARDAR")')
          .locator('..')
          .locator('input, .z-combobox-input')
      },
      {
        name: 'Combobox button or input after text area',
        locator: (page) => page.locator('textarea')
          .locator('..')
          .locator('input, button, .z-combobox-input, [role="combobox"]')
      }
    ];
    
    // Hacer clic para abrir el dropdown
    const clickResult = await tryInteraction(this.page, 'click', dropdownStrategies);
    
    if (!clickResult.success) {
      throw new Error('No se pudo abrir el dropdown Leído');
    }
    
    await this.wait(500);
    
    // OPTIMIZED: Successful strategy first based on log analysis
    const optionStrategies: InteractionStrategy[] = [
      // ✅ SUCCESS_STRATEGY: List item or cell with Si - put this first
      {
        name: `List item or cell with ${opcion}`,
        locator: (page) => page.getByRole('cell', { name: opcion, exact: true })
      },
      // Fallback strategies
      {
        name: `Text ${opcion} that appears after dropdown opens`,
        locator: (page) => page.getByText(opcion, { exact: true })
      },
      {
        name: `ZK Comboitem with ${opcion}`,
        locator: (page) => page.locator(`.z-comboitem:has-text("${opcion}")`)
      },
      {
        name: `Select option ${opcion} in dropdown`,
        locator: (page) => page.locator('option').filter({ hasText: opcion })
      },
      {
        name: `Any clickable element with ${opcion} text`,
        locator: (page) => page.locator(`[role="option"]:has-text("${opcion}"), .z-comboitem:has-text("${opcion}"), li:has-text("${opcion}")`)
      },
      {
        name: `Visible ${opcion} text anywhere`,
        locator: (page) => page.locator(`text="${opcion}":visible`).first()
      }
    ];
    
    const optionResult = await tryInteraction(this.page, 'click', optionStrategies);
    
    if (!optionResult.success) {
      throw new Error(`No se pudo seleccionar la opción "${opcion}"`);
    }
    
    await this.takeScreenshot(`leido_${opcion.toLowerCase()}`, 'debug');
  }

  /**
   * Hace clic en el botón Guardar
   */
  async clickGuardar(): Promise<void> {
    this.logger.info('Guardando condiciones del trámite...');
    
    // Wait a moment for the form to be ready after dropdown selection
    await this.wait(1000);
    
    // Take comprehensive screenshot before attempting to click GUARDAR
    await this.takeScreenshot('before_guardar_attempt', 'debug');
    
    // Look for specific checkboxes in the conditions form area that might enable GUARDAR
    const conditionsArea = this.page.locator('text="Condiciones del trámite"').locator('..');
    const conditionsCheckboxes = await conditionsArea.locator('input[type="checkbox"], .z-checkbox').all();
    
    if (conditionsCheckboxes.length > 0) {
      this.logger.info(`Found ${conditionsCheckboxes.length} checkboxes in conditions area, checking relevant ones...`);
      for (let i = 0; i < Math.min(conditionsCheckboxes.length, 5); i++) { // Limit to first 5 checkboxes
        const checkbox = conditionsCheckboxes[i];
        const isChecked = await checkbox.isChecked().catch(() => false);
        if (!isChecked) {
          this.logger.info(`Checking unchecked checkbox ${i + 1} in conditions area...`);
          await checkbox.click().catch(() => {});
          await this.wait(1000);
          
          // Check if GUARDAR became enabled after this checkbox
          const guardarEnabled = await this.page.locator('button:has-text("GUARDAR"):not(.disabled):not([disabled])').count();
          if (guardarEnabled > 0) {
            this.logger.info('✅ GUARDAR button became enabled after checking checkbox!');
            break;
          }
        }
      }
    }

    // Wait for the actual GUARDAR div element (ZK framework)
    this.logger.info('Waiting for GUARDAR div element (ZK framework)...');
    try {
      await this.page.waitForSelector('.z-toolbarbutton-cnt:has-text("GUARDAR")', { 
        state: 'visible',
        timeout: 5000 
      });
      this.logger.info('✅ GUARDAR div element found!');
    } catch (error) {
      this.logger.warn('⚠️ GUARDAR div element not found, will try other selectors...');
    }
    
    // Try direct force click on first visible GUARDAR element
    try {
      this.logger.info('Attempting direct force click on first GUARDAR element...');
      
      await this.page.locator('div.z-toolbarbutton-cnt:has-text("GUARDAR")').first().click({ force: true });
      this.logger.info('✅ Direct GUARDAR click successful');
      
      await this.wait(3000); // Wait 3s as in Python script
      await this.takeScreenshot('after_direct_guardar_click', 'debug');
      
      // Check if form closed
      const formClosed = !(await this.page.locator('#dynform4').isVisible().catch(() => false));
      if (formClosed) {
        this.logger.info('✅ Form closed successfully after direct GUARDAR click');
        await this.takeScreenshot('condiciones_guardadas', 'milestone');
        return;
      } else {
        this.logger.info('✅ GUARDAR clicked but form still open (this may be expected)');
        // Continue to try other strategies in case this wasn't the right button
      }
    } catch (error) {
      this.logger.warn('Direct force click failed, trying other strategies...', error);
    }

    // ✅ OPTIMIZED STRATEGIES: Successful strategy first, then fallbacks
    const strategies: InteractionStrategy[] = [
      // 🏆 WINNER: Strategy that consistently works - moved to position 1 for optimization
      {
        name: 'Second GUARDAR element',
        locator: (page) => page.locator('div.z-toolbarbutton-cnt:has-text("GUARDAR")').nth(1)
      },
      // Fallback strategies (from Python script analysis)
      {
        name: 'Python Strategy 1: Exact style and class selector',
        locator: (page) => page.locator('div[class*="z-toolbarbutton-cnt"]:has-text("GUARDAR")').filter({
          hasText: /^GUARDAR$/
        }).first()
      },
      {
        name: 'Python Strategy 2: Class and text search',
        locator: (page) => page.locator('div.z-toolbarbutton-cnt:has-text("GUARDAR")').first()
      },
      {
        name: 'Python Strategy 3: Background color selector',
        locator: (page) => page.locator('div[style*="background-color: #767676"]:has-text("GUARDAR")').first()
      },
      {
        name: 'Python Strategy 4: Any visible GUARDAR element',
        locator: (page) => page.locator('*:has-text("GUARDAR")').filter({
          hasText: /^GUARDAR$/
        }).first()
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      // Take debugging screenshot showing current state
      await this.takeScreenshot('guardar_click_failed', 'error');
      this.logger.error('❌ All GUARDAR button click strategies failed');
      throw new Error('No se pudo hacer clic en GUARDAR');
    }
    
    this.logger.info(`✅ GUARDAR clicked successfully with strategy: ${result.strategy}`);
    
    // Take screenshot immediately after click
    await this.takeScreenshot('after_guardar_click', 'debug');
    
    // Wait for the form to process and close
    await this.wait(2000);
    
    // Validate that the action was successful by checking if form closed
    const formStillOpen = await this.page.locator('#dynform4').isVisible().catch(() => false);
    const guardarStillVisible = await this.page.locator('button:has-text("GUARDAR")').isVisible().catch(() => false);
    
    if (formStillOpen || guardarStillVisible) {
      this.logger.warn('⚠️ Form may still be open after GUARDAR click - checking for success indicators');
      await this.takeScreenshot('form_still_open_after_guardar', 'debug');
      
      // Additional wait in case the form is processing
      await this.wait(3000);
      
      // Check again
      const formStillOpenFinal = await this.page.locator('#dynform4').isVisible().catch(() => false);
      if (formStillOpenFinal) {
        this.logger.error('❌ Form is still open after GUARDAR - the click may not have worked');
        // Don't throw error, but log the issue for debugging
      } else {
        this.logger.info('✅ Form closed successfully after additional wait');
      }
    } else {
      this.logger.info('✅ Form closed successfully after GUARDAR click');
    }
    
    await this.takeScreenshot('condiciones_guardadas', 'milestone');
  }

  /**
   * Abre condiciones y selecciona "Leído: Si" (Paso 16)
   */
  async abrirCondicionesYSeleccionarLeido(leido: 'Si' | 'No' = 'Si'): Promise<void> {
    this.logger.info('Abriendo condiciones y seleccionando "Leído: Si"...');
    
    try {
      // Verificar que la página esté cargada
      if (!await this.isLoaded()) {
        await this.waitForLoad();
      }
      
      // Paso 1: Hacer clic en Completar
      await this.clickCompletar();
      
      // Paso 2: Seleccionar opción Leído
      await this.selectLeido(leido);
      
      this.logger.info('✅ Condiciones abiertas y "Leído: Si" seleccionado');
      
    } catch (error) {
      this.logger.error('Error abriendo condiciones y seleccionando Leído:', error);
      await this.takeScreenshot('condiciones_error', 'error');
      throw error;
    }
  }

  /**
   * Hace click en GUARDAR de condiciones del trámite (Paso 17)
   */
  async guardarCondicionesTramite(): Promise<void> {
    this.logger.info('🎯 PASO 17: Haciendo click en GUARDAR de condiciones del trámite...');
    
    try {
      // Guardar las condiciones
      await this.clickGuardar();
      
      this.logger.info('✅ GUARDAR de condiciones clickeado exitosamente');
      
    } catch (error) {
      this.logger.error('Error haciendo click en GUARDAR de condiciones:', error);
      await this.takeScreenshot('guardar_condiciones_error', 'error');
      throw error;
    }
  }

  /**
   * Completa todas las condiciones del trámite (método legacy)
   */
  async completarCondiciones(leido: 'Si' | 'No' = 'Si'): Promise<void> {
    this.logger.info('Completando condiciones del trámite...');
    
    try {
      // Usar los nuevos métodos divididos
      await this.abrirCondicionesYSeleccionarLeido(leido);
      await this.guardarCondicionesTramite();
      
      this.logger.info('✅ Condiciones completadas exitosamente');
      
    } catch (error) {
      this.logger.error('Error completando las condiciones:', error);
      await this.takeScreenshot('condiciones_error', 'error');
      throw error;
    }
  }

  /**
   * Lee el texto de las condiciones
   */
  async getCondicionesText(): Promise<string> {
    try {
      const condicionesElement = this.page.locator('.condiciones-texto, .terminos-condiciones, #condiciones-content');
      if (await condicionesElement.count() > 0) {
        const text = await condicionesElement.textContent();
        return text?.trim() || '';
      }
      return '';
    } catch (error) {
      this.logger.error('Error obteniendo el texto de las condiciones:', error);
      return '';
    }
  }

  /**
   * Verifica si las condiciones están completas
   */
  async isCondicionesComplete(): Promise<boolean> {
    try {
      // Buscar indicadores de que las condiciones están completas
      const completedIndicators = [
        'i.fa-check-circle',
        'text=Completo',
        '.estado-completo',
        '.condiciones-completas'
      ];
      
      for (const indicator of completedIndicators) {
        const element = this.page.locator(indicator);
        // Buscar cerca de "Condiciones del trámite"
        const nearCondiciones = element.locator('xpath=ancestor::*[contains(., "Condiciones del trámite")]');
        if (await nearCondiciones.count() > 0) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error verificando si las condiciones están completas:', error);
      return false;
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
}
