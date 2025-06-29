import { Page, Locator } from 'playwright';
import { logger } from './logger';
import { config } from '../config';
import { getStepTracker } from './stepTracker';

export interface InteractionStrategy {
  name: string;
  locator: (page: Page) => Locator;
}

export interface InteractionResult {
  success: boolean;
  strategy?: string;
  error?: Error;
}

export async function tryInteraction(
  page: Page,
  action: 'click' | 'fill' | 'select' | 'check',
  strategies: InteractionStrategy[],
  value?: string,
  stepNumber?: number
): Promise<InteractionResult> {
  logger.info(`Intentando ${action} con ${strategies.length} estrategias`);
  const stepTracker = getStepTracker();
  
  for (const strategy of strategies) {
    try {
      logger.debug(`Probando estrategia: ${strategy.name}`);
      const locator = strategy.locator(page);
      
      // Check if element exists
      const count = await locator.count();
      if (count === 0) {
        logger.debug(`Estrategia ${strategy.name}: elemento no encontrado`);
        continue;
      }
      
      // Wait for element to be visible and enabled
      await locator.first().waitFor({ state: 'visible', timeout: config.INTERACTION_TIMEOUT / 2 });
      
      // Perform action
      switch (action) {
        case 'click':
          await locator.first().click();
          break;
        case 'fill':
          if (!value) throw new Error('Value required for fill action');
          await locator.first().fill(value);
          break;
        case 'select':
          if (!value) throw new Error('Value required for select action');
          await locator.first().selectOption(value);
          break;
        case 'check':
          await locator.first().check();
          break;
      }
      
      logger.info(`✅ SUCCESS_STRATEGY: ${strategy.name} - Acción ${action} completada exitosamente`);
      
      // Log to step tracker if step number provided
      if (stepNumber) {
        stepTracker.logSuccess(stepNumber, strategy.name);
      }
      
      return { success: true, strategy: strategy.name };
      
    } catch (error) {
      logger.debug(`Estrategia ${strategy.name} falló: ${(error as Error).message}`);
      continue;
    }
  }
  
  const error = new Error(`Todas las estrategias fallaron para la acción ${action}`);
  logger.error(error.message);
  
  // Log error to step tracker if step number provided
  if (stepNumber) {
    stepTracker.logError(stepNumber, error.message);
  }
  
  return { success: false, error };
}

export async function waitForNavigation(page: Page, options?: { timeout?: number }): Promise<void> {
  const timeout = options?.timeout || config.NAVIGATION_TIMEOUT;
  
  try {
    // Primero esperar a que el DOM esté cargado
    await page.waitForLoadState('domcontentloaded', { timeout: timeout / 3 });
    
    // Luego intentar esperar a que la red esté inactiva, pero con un timeout más corto
    try {
      await page.waitForLoadState('networkidle', { timeout: timeout / 2 });
    } catch (networkError) {
      // Si la red no se calma, al menos esperamos un poco más
      logger.debug('Network no llegó a estar idle, esperando un momento adicional');
      await page.waitForTimeout(1000);
    }
    
    // Verificar que la página esté lista verificando elementos comunes
    try {
      await page.waitForSelector('body', { timeout: 1000 });
    } catch (e) {
      logger.warn('No se encontró body element, la página podría no estar completamente cargada');
    }
    
  } catch (error) {
    logger.warn('Timeout esperando navegación, continuando...', error);
  }
}

export async function scrollToElement(page: Page, locator: Locator): Promise<void> {
  try {
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // Small delay for scroll animation
  } catch (error) {
    logger.warn('No se pudo hacer scroll al elemento:', error);
  }
}

export async function waitForElementAndClick(
  page: Page,
  strategies: InteractionStrategy[],
  options?: { delay?: number }
): Promise<InteractionResult> {
  const result = await tryInteraction(page, 'click', strategies);
  
  if (result.success && options?.delay) {
    await page.waitForTimeout(options.delay);
  }
  
  return result;
}

export async function fillFormField(
  page: Page,
  strategies: InteractionStrategy[],
  value: string,
  options?: { clear?: boolean; delay?: number }
): Promise<InteractionResult> {
  if (options?.clear) {
    // Try to clear the field first
    for (const strategy of strategies) {
      try {
        const locator = strategy.locator(page);
        if (await locator.count() > 0) {
          await locator.first().clear();
          break;
        }
      } catch (error) {
        // Continue to next strategy
      }
    }
  }
  
  const result = await tryInteraction(page, 'fill', strategies, value);
  
  if (result.success && options?.delay) {
    await page.waitForTimeout(options.delay);
  }
  
  return result;
}

// Common strategy builders
export function buildStrategies(
  selectors: {
    id?: string;
    name?: string;
    text?: string;
    ariaLabel?: string;
    role?: string;
    dataTestId?: string;
    css?: string;
    xpath?: string;
  }
): InteractionStrategy[] {
  const strategies: InteractionStrategy[] = [];
  
  if (selectors.id) {
    strategies.push({
      name: `ID: ${selectors.id}`,
      locator: (page) => page.locator(`#${selectors.id}`)
    });
  }
  
  if (selectors.name) {
    strategies.push({
      name: `Name: ${selectors.name}`,
      locator: (page) => page.locator(`[name="${selectors.name}"]`)
    });
  }
  
  if (selectors.text) {
    strategies.push({
      name: `Text: ${selectors.text}`,
      locator: (page) => page.getByText(selectors.text!, { exact: true })
    });
    strategies.push({
      name: `Text (contains): ${selectors.text}`,
      locator: (page) => page.locator(`text=${selectors.text}`)
    });
  }
  
  if (selectors.ariaLabel) {
    strategies.push({
      name: `ARIA Label: ${selectors.ariaLabel}`,
      locator: (page) => page.getByLabel(selectors.ariaLabel!)
    });
  }
  
  if (selectors.role) {
    strategies.push({
      name: `Role: ${selectors.role}`,
      locator: (page) => page.getByRole(selectors.role as any)
    });
  }
  
  if (selectors.dataTestId) {
    strategies.push({
      name: `Data Test ID: ${selectors.dataTestId}`,
      locator: (page) => page.locator(`[data-testid="${selectors.dataTestId}"]`)
    });
    strategies.push({
      name: `Data Test ID (alt): ${selectors.dataTestId}`,
      locator: (page) => page.locator(`[data-test-id="${selectors.dataTestId}"]`)
    });
  }
  
  if (selectors.css) {
    strategies.push({
      name: `CSS: ${selectors.css}`,
      locator: (page) => page.locator(selectors.css!)
    });
  }
  
  if (selectors.xpath) {
    strategies.push({
      name: `XPath: ${selectors.xpath}`,
      locator: (page) => page.locator(selectors.xpath!)
    });
  }
  
  return strategies;
}

// Helper to handle dynamic IDs
export function buildDynamicIdStrategy(pattern: string, description: string): InteractionStrategy {
  return {
    name: `Dynamic ID Pattern: ${description}`,
    locator: (page) => page.locator(`[id*="${pattern}"]`)
  };
}

// Helper for form field strategies
export function buildFormFieldStrategies(fieldName: string): InteractionStrategy[] {
  return [
    {
      name: `Input by name: ${fieldName}`,
      locator: (page) => page.locator(`input[name="${fieldName}"]`)
    },
    {
      name: `Input by id: ${fieldName}`,
      locator: (page) => page.locator(`input#${fieldName}`)
    },
    {
      name: `Label + Input: ${fieldName}`,
      locator: (page) => page.locator(`label:has-text("${fieldName}") + input`)
    },
    {
      name: `Input by placeholder: ${fieldName}`,
      locator: (page) => page.locator(`input[placeholder*="${fieldName}" i]`)
    }
  ];
}

// Helper for button strategies
export function buildButtonStrategies(buttonText: string): InteractionStrategy[] {
  return [
    {
      name: `Button by text: ${buttonText}`,
      locator: (page) => page.getByRole('button', { name: buttonText })
    },
    {
      name: `Button contains text: ${buttonText}`,
      locator: (page) => page.locator(`button:has-text("${buttonText}")`)
    },
    {
      name: `Input button: ${buttonText}`,
      locator: (page) => page.locator(`input[type="button"][value="${buttonText}"]`)
    },
    {
      name: `Submit button: ${buttonText}`,
      locator: (page) => page.locator(`input[type="submit"][value="${buttonText}"]`)
    },
    {
      name: `Any element as button: ${buttonText}`,
      locator: (page) => page.locator(`[role="button"]:has-text("${buttonText}")`)
    }
  ];
}
