import { Page, Locator } from 'playwright';
import { createLogger } from '../common/logger';
import { takeScreenshot } from '../common/screenshotManager';
import { createDebugSnapshot } from '../common/debugSnapshot';
import { config } from '../config';

/**
 * Base Page Object - Clase base para todos los Page Objects
 * Proporciona funcionalidad común y métodos utilitarios
 */
export abstract class BasePage {
  protected page: Page;
  protected logger;

  constructor(page: Page, loggerName: string) {
    this.page = page;
    this.logger = createLogger(loggerName);
  }

  /**
   * Verifica que la página esté cargada correctamente
   */
  abstract isLoaded(): Promise<boolean>;

  /**
   * Espera a que la página esté completamente cargada
   */
  abstract waitForLoad(): Promise<void>;

  /**
   * Obtiene el título de la página
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Obtiene la URL actual
   */
  async getUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Toma una captura de pantalla
   */
  async takeScreenshot(name: string, type: 'debug' | 'milestone' | 'error' = 'debug'): Promise<string> {
    return await takeScreenshot(this.page, name, type);
  }

  /**
   * Crea un snapshot de debug si está habilitado
   */
  async createDebugSnapshot(name: string, description?: string): Promise<void> {
    if (config.DEVELOPER_DEBUG_MODE) {
      await createDebugSnapshot(this.page, name, description);
    }
  }

  /**
   * Espera por un elemento y verifica que esté visible
   */
  async waitForElement(selector: string, timeout = 10000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    return element;
  }

  /**
   * Verifica si un elemento existe en la página
   */
  async elementExists(selector: string): Promise<boolean> {
    const count = await this.page.locator(selector).count();
    return count > 0;
  }

  /**
   * Espera por navegación
   */
  async waitForNavigation(options?: { timeout?: number }): Promise<void> {
    await this.page.waitForLoadState('networkidle', options);
  }

  /**
   * Recarga la página
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForLoad();
  }

  /**
   * Navega a una URL específica
   */
  async navigateTo(url: string): Promise<void> {
    await this.page.goto(url);
    await this.waitForLoad();
  }

  /**
   * Obtiene el texto de un elemento
   */
  async getElementText(selector: string): Promise<string | null> {
    const element = this.page.locator(selector);
    if (await element.count() > 0) {
      return await element.textContent();
    }
    return null;
  }

  /**
   * Verifica si un elemento está habilitado
   */
  async isElementEnabled(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    if (await element.count() > 0) {
      return await element.isEnabled();
    }
    return false;
  }

  /**
   * Verifica si un elemento está visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    if (await element.count() > 0) {
      return await element.isVisible();
    }
    return false;
  }

  /**
   * Espera un tiempo específico (usar con moderación)
   */
  async wait(milliseconds: number): Promise<void> {
    await this.page.waitForTimeout(milliseconds);
  }

  /**
   * Maneja alertas y diálogos
   */
  async handleDialog(accept = true, promptText?: string): Promise<void> {
    this.page.on('dialog', async dialog => {
      this.logger.info(`Diálogo detectado: ${dialog.message()}`);
      if (accept) {
        await dialog.accept(promptText);
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Obtiene todos los textos de elementos que coinciden con un selector
   */
  async getAllElementsText(selector: string): Promise<string[]> {
    const elements = await this.page.locator(selector).all();
    const texts: string[] = [];
    
    for (const element of elements) {
      const text = await element.textContent();
      if (text) {
        texts.push(text.trim());
      }
    }
    
    return texts;
  }

  /**
   * Hace scroll hasta un elemento
   */
  async scrollToElement(selector: string): Promise<void> {
    const element = this.page.locator(selector);
    if (await element.count() > 0) {
      await element.scrollIntoViewIfNeeded();
    }
  }

  /**
   * Obtiene el valor de un atributo de un elemento
   */
  async getElementAttribute(selector: string, attribute: string): Promise<string | null> {
    const element = this.page.locator(selector);
    if (await element.count() > 0) {
      return await element.getAttribute(attribute);
    }
    return null;
  }

  /**
   * Pausa la ejecución para debugging (solo en modo desarrollo)
   */
  async pauseForDebug(message?: string): Promise<void> {
    if (config.DEVELOPER_DEBUG_MODE) {
      if (message) {
        this.logger.info(message);
      }
      await this.page.pause();
    }
  }
}
