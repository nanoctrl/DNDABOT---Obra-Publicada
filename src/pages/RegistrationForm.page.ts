import { Page } from 'playwright';
import { logger } from '../common/logger';
import { 
  tryInteraction,
  buildFormFieldStrategies,
  buildButtonStrategies,
  buildStrategies,
  fillFormField
} from '../common/interactionHelper';

export class RegistrationFormPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async assertIsReady(): Promise<void> {
    logger.info('Verificando que el formulario de registro esté listo');
    
    // TODO: Ajustar estos selectores basándose en el formulario real
    const formIndicators = [
      'form[name="registroObra"]',
      'text=Registro de Obra Publicada',
      'text=Datos de la Obra',
      '#registration-form',
      '.formulario-registro'
    ];
    
    let found = false;
    for (const selector of formIndicators) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        found = true;
        break;
      } catch {
        // Try next selector
      }
    }
    
    if (!found) {
      throw new Error('No se pudo verificar que el formulario de registro esté cargado');
    }
    
    logger.info('Formulario de registro verificado correctamente');
  }

  async fillField(fieldName: string, value: string): Promise<void> {
    logger.info(`Completando campo: ${fieldName} con valor: ${value}`);
    
    // Build strategies based on common field naming patterns
    const strategies = buildFormFieldStrategies(fieldName);
    
    // Add TAD-specific strategies
    strategies.push({
      name: `Field by data attribute: ${fieldName}`,
      locator: (page) => page.locator(`[data-field="${fieldName}"]`)
    });
    
    strategies.push({
      name: `Field by aria-label: ${fieldName}`,
      locator: (page) => page.locator(`[aria-label*="${fieldName}" i]`)
    });
    
    const result = await fillFormField(this.page, strategies, value, { 
      clear: true, 
      delay: 500 
    });
    
    if (!result.success) {
      throw new Error(`No se pudo completar el campo: ${fieldName}`);
    }
  }

  async selectOption(fieldName: string, value: string): Promise<void> {
    logger.info(`Seleccionando opción: ${value} en campo: ${fieldName}`);
    
    const strategies = [
      {
        name: `Select by name: ${fieldName}`,
        locator: (page: Page) => page.locator(`select[name="${fieldName}"]`)
      },
      {
        name: `Select by id: ${fieldName}`,
        locator: (page: Page) => page.locator(`select#${fieldName}`)
      },
      {
        name: `Select by data attribute: ${fieldName}`,
        locator: (page: Page) => page.locator(`select[data-field="${fieldName}"]`)
      },
      {
        name: `Select with label: ${fieldName}`,
        locator: (page: Page) => page.locator(`label:has-text("${fieldName}") + select`)
      }
    ];
    
    const result = await tryInteraction(this.page, 'select', strategies, value);
    
    if (!result.success) {
      // Try alternative: click to open dropdown and then click option
      logger.info('Intentando método alternativo para seleccionar opción');
      
      const dropdownStrategies = buildStrategies({
        text: fieldName,
        role: 'combobox',
        css: `[data-field="${fieldName}"]`
      });
      
      await tryInteraction(this.page, 'click', dropdownStrategies);
      await this.page.waitForTimeout(500);
      
      const optionStrategies = [
        {
          name: `Option by text: ${value}`,
          locator: (page: Page) => page.locator(`text="${value}"`)
        },
        {
          name: `Option in list: ${value}`,
          locator: (page: Page) => page.locator(`li:has-text("${value}")`)
        },
        {
          name: `Option role: ${value}`,
          locator: (page: Page) => page.locator(`[role="option"]:has-text("${value}")`)
        }
      ];
      
      const optionResult = await tryInteraction(this.page, 'click', optionStrategies);
      
      if (!optionResult.success) {
        throw new Error(`No se pudo seleccionar la opción: ${value} en campo: ${fieldName}`);
      }
    }
  }

  async addCoauthor(name: string): Promise<void> {
    logger.info(`Agregando coautor: ${name}`);
    
    // First, look for "Add coauthor" button
    const addButtonStrategies = buildButtonStrategies('Agregar Coautor');
    addButtonStrategies.push(...buildButtonStrategies('Añadir Coautor'));
    addButtonStrategies.push(...buildButtonStrategies('+ Coautor'));
    addButtonStrategies.push({
      name: 'Add icon button',
      locator: (page) => page.locator('button[aria-label*="coautor" i]')
    });
    
    await tryInteraction(this.page, 'click', addButtonStrategies);
    await this.page.waitForTimeout(1000);
    
    // Find the new coauthor field
    const coauthorFields = await this.page.locator('input[name*="coautor" i]').all();
    const lastField = coauthorFields[coauthorFields.length - 1];
    
    if (lastField) {
      await lastField.fill(name);
    } else {
      throw new Error('No se pudo encontrar el campo para agregar coautor');
    }
  }

  async saveDraft(): Promise<void> {
    logger.info('Guardando borrador');
    
    const saveStrategies = buildButtonStrategies('Guardar Borrador');
    saveStrategies.push(...buildButtonStrategies('Guardar'));
    saveStrategies.push(...buildButtonStrategies('Guardar y Continuar'));
    
    const result = await tryInteraction(this.page, 'click', saveStrategies);
    
    if (!result.success) {
      logger.warn('No se encontró botón para guardar borrador');
      return;
    }
    
    // Wait for save confirmation
    try {
      await this.page.waitForSelector('text=guardado', { timeout: 5000 });
    } catch {
      // Save might not show confirmation
    }
  }

  async submit(): Promise<void> {
    logger.info('Enviando formulario');
    
    const submitStrategies = buildButtonStrategies('Enviar');
    submitStrategies.push(...buildButtonStrategies('Confirmar'));
    submitStrategies.push(...buildButtonStrategies('Finalizar'));
    submitStrategies.push(...buildButtonStrategies('Presentar Trámite'));
    submitStrategies.push({
      name: 'Submit input',
      locator: (page) => page.locator('input[type="submit"]')
    });
    
    const result = await tryInteraction(this.page, 'click', submitStrategies);
    
    if (!result.success) {
      throw new Error('No se pudo enviar el formulario');
    }
    
    // Handle possible confirmation dialog
    try {
      await this.page.waitForSelector('text=¿Está seguro', { timeout: 2000 });
      const confirmStrategies = buildButtonStrategies('Sí');
      confirmStrategies.push(...buildButtonStrategies('Confirmar'));
      confirmStrategies.push(...buildButtonStrategies('Aceptar'));
      
      await tryInteraction(this.page, 'click', confirmStrategies);
    } catch {
      // No confirmation dialog, continue
    }
  }

  async checkCheckbox(fieldName: string): Promise<void> {
    logger.info(`Marcando checkbox: ${fieldName}`);
    
    const strategies = [
      {
        name: `Checkbox by name: ${fieldName}`,
        locator: (page: Page) => page.locator(`input[type="checkbox"][name="${fieldName}"]`)
      },
      {
        name: `Checkbox by id: ${fieldName}`,
        locator: (page: Page) => page.locator(`input[type="checkbox"]#${fieldName}`)
      },
      {
        name: `Checkbox by data attribute: ${fieldName}`,
        locator: (page: Page) => page.locator(`input[type="checkbox"][data-field="${fieldName}"]`)
      },
      {
        name: `Checkbox with label: ${fieldName}`,
        locator: (page: Page) => page.locator(`label:has-text("${fieldName}") input[type="checkbox"]`)
      }
    ];
    
    const result = await tryInteraction(this.page, 'check', strategies);
    
    if (!result.success) {
      throw new Error(`No se pudo marcar el checkbox: ${fieldName}`);
    }
  }

  async clickButton(buttonName: string): Promise<void> {
    logger.info(`Haciendo clic en botón: ${buttonName}`);
    
    const strategies = buildButtonStrategies(buttonName);
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error(`No se pudo hacer clic en el botón: ${buttonName}`);
    }
  }

  async getValidationErrors(): Promise<string[]> {
    logger.info('Obteniendo errores de validación');
    
    const errors: string[] = [];
    
    try {
      const errorElements = await this.page.locator('.error-message, .validation-error, [role="alert"]').all();
      
      for (const element of errorElements) {
        const text = await element.textContent();
        if (text) {
          errors.push(text.trim());
        }
      }
    } catch (error) {
      logger.warn('No se pudieron obtener los errores de validación:', error);
    }
    
    return errors;
  }
}
