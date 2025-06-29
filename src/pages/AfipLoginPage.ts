import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { config } from '../config';
import { tryInteraction, InteractionStrategy } from '../common/interactionHelper';

/**
 * Page Object para la página de login de AFIP
 */
export class AfipLoginPage extends BasePage {
  // Selectores específicos de AFIP
  private readonly selectors = {
    cuitInput: 'input#F1\\:username',
    nextButton: 'input#F1\\:btnSiguiente',
    passwordInput: 'input#F1\\:password',
    loginButton: 'input#F1\\:btnIngresar',
    representadosList: '.contenedor_representados',
    representadoItem: '.representado_item',
    representadoButton: 'span.cuit_representado',
    errorMessage: '.error-message, .z-errbox',
    captcha: '#recaptcha',
    afipLogo: 'img[alt="AFIP"]'
  };

  constructor(page: Page) {
    super(page, 'AfipLoginPage');
  }

  async isLoaded(): Promise<boolean> {
    try {
      // Verificar que estemos en la página de AFIP
      const url = await this.getUrl();
      if (!url.includes('afip.gob.ar')) {
        return false;
      }

      // Verificar que el formulario de login esté visible
      const cuitVisible = await this.isElementVisible(this.selectors.cuitInput);
      return cuitVisible;
    } catch (error) {
      this.logger.error('Error verificando si la página está cargada:', error);
      return false;
    }
  }

  async waitForLoad(): Promise<void> {
    this.logger.info('Esperando que cargue la página de login de AFIP...');
    
    // Esperar a que aparezca el campo de CUIT
    await this.waitForElement(this.selectors.cuitInput, 30000);
    
    // Esperar un momento adicional para que la página se estabilice
    await this.wait(1000);
  }

  /**
   * Ingresa el CUIT en el formulario
   */
  async enterCuit(cuit: string): Promise<void> {
    this.logger.info(`Ingresando CUIT: ${cuit}`);
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'CUIT input by ID',
        locator: (page) => page.locator(this.selectors.cuitInput)
      },
      {
        name: 'Username input',
        locator: (page) => page.locator('input[name="username"]')
      },
      {
        name: 'Any text input visible',
        locator: (page) => page.locator('input[type="text"]:visible').first()
      }
    ];

    const result = await tryInteraction(this.page, 'fill', strategies, cuit);
    
    if (!result.success) {
      throw new Error('No se pudo ingresar el CUIT');
    }

    await this.takeScreenshot('cuit_ingresado', 'debug');
  }

  /**
   * Hace clic en el botón Siguiente
   */
  async clickNext(): Promise<void> {
    this.logger.info('Haciendo clic en Siguiente...');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Next button by ID',
        locator: (page) => page.locator(this.selectors.nextButton)
      },
      {
        name: 'Button with Siguiente text',
        locator: (page) => page.locator('input[value="Siguiente"]')
      },
      {
        name: 'Any button with Siguiente',
        locator: (page) => page.getByRole('button', { name: 'Siguiente' })
      }
    ];

    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer clic en Siguiente');
    }

    // Esperar a que aparezca el campo de contraseña
    await this.waitForElement(this.selectors.passwordInput, 10000);
  }

  /**
   * Ingresa la contraseña
   */
  async enterPassword(password: string): Promise<void> {
    this.logger.info('Ingresando contraseña...');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Password input by ID',
        locator: (page) => page.locator(this.selectors.passwordInput)
      },
      {
        name: 'Password input by type',
        locator: (page) => page.locator('input[type="password"]')
      },
      {
        name: 'Password input by name',
        locator: (page) => page.locator('input[name="password"]')
      }
    ];

    const result = await tryInteraction(this.page, 'fill', strategies, password);
    
    if (!result.success) {
      throw new Error('No se pudo ingresar la contraseña');
    }
  }

  /**
   * Hace clic en el botón Ingresar
   */
  async clickLogin(): Promise<void> {
    this.logger.info('Haciendo clic en Ingresar...');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Login button by ID',
        locator: (page) => page.locator(this.selectors.loginButton)
      },
      {
        name: 'Button with Ingresar text',
        locator: (page) => page.locator('input[value="Ingresar"]')
      },
      {
        name: 'Submit button',
        locator: (page) => page.locator('input[type="submit"]')
      }
    ];

    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer clic en Ingresar');
    }

    // Esperar navegación o aparición de representados
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });
  }

  /**
   * Selecciona un representado de la lista
   */
  async selectRepresentado(representadoName: string): Promise<void> {
    this.logger.info(`Seleccionando representado: ${representadoName}`);
    
    // Esperar a que aparezca la lista de representados
    await this.waitForElement(this.selectors.representadosList, 10000);
    
    // Obtener todos los representados
    const representados = await this.getAllRepresentados();
    
    // Buscar el representado por similitud
    const match = this.findBestMatch(representadoName, representados);
    
    if (!match) {
      throw new Error(`No se encontró un representado similar a: ${representadoName}`);
    }
    
    this.logger.info(`Representado encontrado: ${match.name} (${match.similarity}% similitud)`);
    
    // Hacer clic en el representado
    const representadoButton = this.page.locator(
      `${this.selectors.representadoButton}:has-text("${match.cuit}")`
    );
    
    await representadoButton.click();
    
    // Esperar navegación
    await this.waitForNavigation();
  }

  /**
   * Obtiene todos los representados disponibles
   */
  private async getAllRepresentados(): Promise<Array<{ name: string; cuit: string }>> {
    const representados: Array<{ name: string; cuit: string }> = [];
    
    const items = await this.page.locator(this.selectors.representadoItem).all();
    
    for (const item of items) {
      const nameElement = await item.locator('.razon_social_representado').first();
      const cuitElement = await item.locator('.cuit_representado').first();
      
      const name = await nameElement.textContent();
      const cuit = await cuitElement.textContent();
      
      if (name && cuit) {
        representados.push({
          name: name.trim(),
          cuit: cuit.trim()
        });
      }
    }
    
    return representados;
  }

  /**
   * Encuentra la mejor coincidencia usando el algoritmo de Levenshtein
   */
  private findBestMatch(
    target: string, 
    candidates: Array<{ name: string; cuit: string }>
  ): { name: string; cuit: string; similarity: number } | null {
    let bestMatch = null;
    let highestSimilarity = 0;
    
    for (const candidate of candidates) {
      const similarity = this.calculateSimilarity(
        target.toLowerCase(), 
        candidate.name.toLowerCase()
      );
      
      if (similarity > highestSimilarity && similarity >= 90) {
        highestSimilarity = similarity;
        bestMatch = { ...candidate, similarity };
      }
    }
    
    return bestMatch;
  }

  /**
   * Calcula la similitud entre dos strings usando el algoritmo de Levenshtein
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 100;
    
    const distance = this.levenshteinDistance(str1, str2);
    return Math.round(((maxLength - distance) / maxLength) * 100);
  }

  /**
   * Implementación del algoritmo de Levenshtein
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Verifica si hay un mensaje de error
   */
  async hasError(): Promise<boolean> {
    return await this.elementExists(this.selectors.errorMessage);
  }

  /**
   * Obtiene el mensaje de error si existe
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasError()) {
      return await this.getElementText(this.selectors.errorMessage);
    }
    return null;
  }

  /**
   * Verifica si hay un captcha presente
   */
  async hasCaptcha(): Promise<boolean> {
    return await this.elementExists(this.selectors.captcha);
  }

  /**
   * Realiza el proceso completo de login
   */
  async login(cuit: string, password: string, representado?: string): Promise<void> {
    this.logger.info('Iniciando proceso de login en AFIP...');
    const stepTracker = (await import('../common/stepTracker')).getStepTracker();
    
    try {
      // Verificar que estemos en la página correcta
      if (!await this.isLoaded()) {
        throw new Error('La página de login de AFIP no está cargada');
      }
      
      // Paso 4: Ingresar CUIT
      stepTracker.startStep(4);
      await this.enterCuit(cuit);
      await this.createDebugSnapshot('after_cuit_input', 'CUIT ingresado');
      stepTracker.logSuccess(4, 'CUIT ingresado');
      
      // Paso 5: Click en Siguiente
      stepTracker.startStep(5);
      await this.clickNext();
      await this.createDebugSnapshot('after_next_click', 'Después de Siguiente');
      stepTracker.logSuccess(5, 'Click en Siguiente');
      
      // Paso 6: Ingresar contraseña
      stepTracker.startStep(6);
      await this.enterPassword(password);
      await this.createDebugSnapshot('after_password_input', 'Contraseña ingresada');
      stepTracker.logSuccess(6, 'Contraseña ingresada');
      
      // Paso 7: Click en Ingresar
      stepTracker.startStep(7);
      await this.clickLogin();
      await this.createDebugSnapshot('after_login_click', 'Después de Ingresar');
      stepTracker.logSuccess(7, 'Click en Ingresar');
      
      // Verificar si hay errores
      if (await this.hasError()) {
        const errorMsg = await this.getErrorMessage();
        throw new Error(`Error de login: ${errorMsg}`);
      }
      
      // Verificar si hay captcha
      if (await this.hasCaptcha()) {
        this.logger.warn('⚠️ Se detectó un CAPTCHA. Resuélvelo manualmente.');
        if (config.DEVELOPER_DEBUG_MODE) {
          await this.pauseForDebug('CAPTCHA detectado. Resuélvelo y presiona Resume.');
        } else {
          throw new Error('CAPTCHA detectado. Login manual requerido.');
        }
      }
      
      // Paso 8: Seleccionar representado
      stepTracker.startStep(8);
      
      // Verificar si hay representado para seleccionar
      if (!representado || representado === null) {
        this.logger.info('📋 No se especificó representado en el JSON, saltando paso 8');
        stepTracker.logSuccess(8, 'Paso saltado - sin representado especificado');
      } else {
        try {
          // Esperar 2 segundos antes de seleccionar
          this.logger.info('⏳ Esperando 2 segundos antes de seleccionar representado...');
          await this.wait(2000);
          
          // Tomar screenshot antes de la selección
          await this.takeScreenshot('before_representado_selection', 'debug');
          
          // Intentar abrir el dropdown de representados
          this.logger.info('🔽 Abriendo dropdown de representados...');
          const dropdownButton = this.page.getByText('▼');
          
          if (await dropdownButton.isVisible()) {
            await dropdownButton.click();
            await this.wait(500); // Pequeña espera para que se abra el dropdown
            
            // Buscar y seleccionar el representado
            this.logger.info(`🔍 Buscando representado: "${representado}"`);
            const representadoOption = this.page.getByText(representado, { exact: true });
            
            if (await representadoOption.isVisible()) {
              await representadoOption.click();
              this.logger.info(`✅ Representado "${representado}" seleccionado exitosamente`);
              
              // Esperar 2 segundos después de seleccionar
              this.logger.info('⏳ Esperando 2 segundos después de seleccionar...');
              await this.wait(2000);
              
              // Tomar screenshot después de la selección
              await this.takeScreenshot('after_representado_selection', 'debug');
              
              stepTracker.logSuccess(8, 'Representado seleccionado');
            } else {
              throw new Error(`No se encontró la opción "${representado}" en el dropdown`);
            }
          } else {
            // Si no hay dropdown, intentar el método anterior por si acaso
            this.logger.warn('⚠️ No se encontró el dropdown de representados');
            this.logger.info('Intentando método alternativo...');
            
            const representadosListExists = await this.elementExists(this.selectors.representadosList);
            
            if (representadosListExists) {
              await this.selectRepresentado(representado);
              await this.wait(2000);
              stepTracker.logSuccess(8, 'Representado seleccionado (método alternativo)');
            } else {
              this.logger.info('Es posible que el usuario solo tenga un representado o ya esté seleccionado');
              await this.takeScreenshot('no_representados_list', 'debug');
              stepTracker.logSuccess(8, 'Sin lista de representados - posiblemente único');
            }
          }
        } catch (error) {
          this.logger.error('Error al seleccionar representado:', error);
          await this.takeScreenshot('representado_selection_error', 'error');
          
          // En modo debug, pausar para intervención manual
          if (config.DEVELOPER_DEBUG_MODE) {
            this.logger.warn('⚠️ Error al seleccionar representado automáticamente');
            this.logger.info('🔄 Pausando para selección manual...');
            await this.pauseForDebug(`Selecciona manualmente el representado: ${representado}`);
            stepTracker.logSuccess(8, 'Representado seleccionado manualmente tras error');
          } else {
            throw error;
          }
        }
      }
      
      this.logger.info('✅ Login en AFIP completado exitosamente');
      
    } catch (error) {
      this.logger.error('Error durante el login:', error);
      await this.takeScreenshot('login_error', 'error');
      throw error;
    }
  }
}
