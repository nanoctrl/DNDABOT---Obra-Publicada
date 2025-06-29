import { Page, Locator } from 'playwright';
import { logger } from './logger';
import { InteractionStrategy } from './interactionHelper';

export interface SelectorPattern {
  name: string;
  patterns: string[];
  attributes?: string[];
  textMatches?: string[];
}

export class DynamicSelectorManager {
  private selectorCache: Map<string, string[]> = new Map();
  private successfulSelectors: Map<string, string> = new Map();
  private logger = logger.child({ context: 'DynamicSelectorManager' });

  /**
   * Registra un selector exitoso para reutilización futura
   */
  recordSuccessfulSelector(key: string, selector: string): void {
    this.successfulSelectors.set(key, selector);
    this.logger.debug(`Selector exitoso guardado para ${key}: ${selector}`);
  }

  /**
   * Obtiene un selector previamente exitoso
   */
  getSuccessfulSelector(key: string): string | undefined {
    return this.successfulSelectors.get(key);
  }

  /**
   * Genera estrategias dinámicas basadas en patrones
   */
  generateDynamicStrategies(pattern: SelectorPattern): InteractionStrategy[] {
    const strategies: InteractionStrategy[] = [];

    // Primero intentar con selector exitoso previo
    const cachedSelector = this.getSuccessfulSelector(pattern.name);
    if (cachedSelector) {
      strategies.push({
        name: `Cached: ${pattern.name}`,
        locator: (page) => page.locator(cachedSelector)
      });
    }

    // Generar estrategias basadas en patrones
    pattern.patterns.forEach((pat, index) => {
      strategies.push({
        name: `Pattern ${index + 1}: ${pat}`,
        locator: (page) => page.locator(pat)
      });
    });

    // Generar estrategias basadas en atributos
    if (pattern.attributes) {
      pattern.attributes.forEach(attr => {
        strategies.push({
          name: `Attribute: ${attr}`,
          locator: (page) => page.locator(`[${attr}]`)
        });
      });
    }

    // Generar estrategias basadas en texto
    if (pattern.textMatches) {
      pattern.textMatches.forEach(text => {
        strategies.push({
          name: `Text match: ${text}`,
          locator: (page) => page.locator(`text="${text}"`)
        });
        strategies.push({
          name: `Text contains: ${text}`,
          locator: (page) => page.locator(`*:has-text("${text}")`)
        });
      });
    }

    return strategies;
  }

  /**
   * Encuentra selectores dinámicamente basándose en el contexto
   */
  async findDynamicSelectors(
    page: Page,
    context: string,
    hints?: { tag?: string; text?: string; attributes?: Record<string, string> }
  ): Promise<string[]> {
    const cacheKey = `${context}_${JSON.stringify(hints)}`;
    
    // Verificar cache
    if (this.selectorCache.has(cacheKey)) {
      return this.selectorCache.get(cacheKey)!;
    }

    const selectors: string[] = [];

    try {
      // Construir selector base
      let baseSelector = hints?.tag || '*';
      
      // Agregar atributos
      if (hints?.attributes) {
        for (const [key, value] of Object.entries(hints.attributes)) {
          baseSelector += `[${key}="${value}"]`;
        }
      }

      // Buscar elementos que coincidan
      const elements = await page.locator(baseSelector).all();
      
      for (const element of elements) {
        // Verificar texto si se proporciona
        if (hints?.text) {
          const elementText = await element.textContent();
          if (!elementText?.includes(hints.text)) continue;
        }

        // Generar selector único para el elemento
        const selector = await this.generateUniqueSelector(page, element);
        if (selector) {
          selectors.push(selector);
        }
      }

      // Cachear resultados
      this.selectorCache.set(cacheKey, selectors);
      
    } catch (error) {
      this.logger.error(`Error finding dynamic selectors for ${context}:`, error);
    }

    return selectors;
  }

  /**
   * Genera un selector único para un elemento
   */
  private async generateUniqueSelector(_page: Page, element: Locator): Promise<string | null> {
    try {
      // Intentar obtener ID
      const id = await element.getAttribute('id');
      if (id) return `#${id}`;

      // Intentar obtener atributos únicos
      const uniqueAttrs = ['data-testid', 'data-id', 'name', 'aria-label'];
      for (const attr of uniqueAttrs) {
        const value = await element.getAttribute(attr);
        if (value) return `[${attr}="${value}"]`;
      }

      // Generar selector por posición y clase
      const className = await element.getAttribute('class');
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      
      if (className) {
        const classes = className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          const classSelector = classes.map(c => `.${c}`).join('');
          return `${tagName}${classSelector}`;
        }
      }

      return `${tagName}`;
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Limpia el cache de selectores
   */
  clearCache(): void {
    this.selectorCache.clear();
    this.logger.debug('Cache de selectores limpiado');
  }

  /**
   * Exporta selectores exitosos para análisis
   */
  exportSuccessfulSelectors(): Record<string, string> {
    return Object.fromEntries(this.successfulSelectors);
  }
}

// Patrones predefinidos para elementos comunes en sitios gubernamentales
export const GOVERNMENT_SELECTOR_PATTERNS = {
  submitButton: {
    name: 'submit_button',
    patterns: [
      'button[type="submit"]',
      'input[type="submit"]',
      'button.btn-primary',
      'button.submit',
      'a.btn-primary[role="button"]'
    ],
    textMatches: ['Enviar', 'Guardar', 'Continuar', 'Siguiente', 'Aceptar']
  },
  
  textInput: {
    name: 'text_input',
    patterns: [
      'input[type="text"]',
      'input:not([type])',
      'input.form-control',
      'input.z-textbox'
    ],
    attributes: ['name', 'id', 'placeholder']
  },
  
  dropdown: {
    name: 'dropdown',
    patterns: [
      'select',
      'div.dropdown',
      'div.z-combobox',
      'ng-select',
      '[role="combobox"]'
    ]
  },
  
  modal: {
    name: 'modal',
    patterns: [
      'div.modal',
      'div[role="dialog"]',
      'div.z-window',
      'div.popup'
    ]
  }
};
