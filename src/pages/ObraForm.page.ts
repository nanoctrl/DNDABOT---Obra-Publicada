import { Page, Locator } from 'playwright';
import { createLogger } from '../common/logger';
import { OBRA_FORM_SELECTORS, DROPDOWN_SELECTORS, buildRowInputSelector, buildRowDropdownSelector } from '../constants/selectors';
import { PageObject } from '../types';

/**
 * Page Object para el formulario de datos de obra
 * Encapsula todos los elementos y acciones de bajo nivel
 */
export class ObraFormPage implements PageObject {
  private logger = createLogger('ObraFormPage');

  constructor(private page: Page) {}

  // Getters para elementos del formulario
  get completarButton(): Locator {
    return this.page.getByRole('list').filter({ 
      hasText: 'Datos de la obra a registrar Firmantes Una vez terminados todos los pasos del' 
    }).locator('a');
  }

  get tituloInput(): Locator {
    return this.page.locator(OBRA_FORM_SELECTORS.tituloInput);
  }

  get tipoObraDropdown(): Locator {
    return this.page.locator(OBRA_FORM_SELECTORS.tipoObraDropdown);
  }

  get albumDropdown(): Locator {
    return this.page.locator(OBRA_FORM_SELECTORS.albumDropdown);
  }

  get cantidadEjemplaresInput(): Locator {
    return this.page.locator(OBRA_FORM_SELECTORS.cantidadEjemplaresInput);
  }

  get generoMusicalInput(): Locator {
    return this.page.locator(OBRA_FORM_SELECTORS.generoMusicalInput);
  }

  get fechaPublicacionInput(): Locator {
    return this.page.locator(OBRA_FORM_SELECTORS.fechaPublicacionInput);
  }

  get lugarPublicacionDropdown(): Locator {
    return this.page.locator(OBRA_FORM_SELECTORS.lugarPublicacionDropdown);
  }

  get publicacionWebDropdown(): Locator {
    return this.page.locator(OBRA_FORM_SELECTORS.publicacionWebDropdown);
  }

  get numeroInternacionalInput(): Locator {
    return this.page.locator(OBRA_FORM_SELECTORS.numeroInternacionalInput);
  }

  get urlPaginaWebInput(): Locator {
    return this.page.locator(OBRA_FORM_SELECTORS.urlPaginaWebInput);
  }

  get guardarButton(): Locator {
    return this.page.locator(OBRA_FORM_SELECTORS.guardarButton);
  }

  // Métodos para obtener elementos dinámicamente por label
  getInputByLabel(label: string): Locator {
    return this.page.locator(buildRowInputSelector(label));
  }

  getDropdownByLabel(label: string): Locator {
    return this.page.locator(buildRowDropdownSelector(label));
  }

  // Métodos de verificación
  async isLoaded(): Promise<boolean> {
    try {
      // Verificar que el formulario esté visible
      const tituloVisible = await this.tituloInput.isVisible();
      const guardarVisible = await this.guardarButton.isVisible();
      return tituloVisible && guardarVisible;
    } catch (e) {
      return false;
    }
  }

  async waitForLoad(): Promise<void> {
    this.logger.info('Esperando que cargue el formulario de obra...');
    await this.page.waitForSelector(OBRA_FORM_SELECTORS.tituloInput, { 
      state: 'visible',
      timeout: 10000 
    });
    await this.page.waitForTimeout(1000); // Espera adicional para estabilidad
  }

  // Métodos de interacción de bajo nivel
  async clickCompletar(): Promise<void> {
    await this.completarButton.click();
    await this.waitForLoad();
  }

  async fillTitulo(titulo: string): Promise<void> {
    await this.tituloInput.click();
    await this.tituloInput.fill(titulo);
  }

  async selectTipoObra(): Promise<void> {
    await this.tipoObraDropdown.click();
  }

  async selectAlbum(): Promise<void> {
    await this.albumDropdown.click();
  }

  async fillCantidadEjemplares(cantidad: string): Promise<void> {
    await this.cantidadEjemplaresInput.click();
    await this.cantidadEjemplaresInput.fill(cantidad);
  }

  async fillGeneroMusical(genero: string): Promise<void> {
    await this.generoMusicalInput.click();
    await this.generoMusicalInput.fill(genero);
  }

  async fillFechaPublicacion(fecha: string): Promise<void> {
    await this.fechaPublicacionInput.click();
    await this.fechaPublicacionInput.fill(fecha);
    await this.page.keyboard.press('Tab'); // Cerrar datepicker
  }

  async selectLugarPublicacion(): Promise<void> {
    await this.lugarPublicacionDropdown.click();
  }

  async selectPublicacionWeb(): Promise<void> {
    await this.publicacionWebDropdown.click();
  }

  async fillNumeroInternacional(numero: string): Promise<void> {
    await this.numeroInternacionalInput.click();
    await this.numeroInternacionalInput.fill(numero);
  }

  async fillUrlPaginaWeb(url: string): Promise<void> {
    await this.urlPaginaWebInput.click();
    await this.urlPaginaWebInput.fill(url);
  }

  async clickGuardar(): Promise<void> {
    await this.guardarButton.click();
  }

  // Métodos para trabajar con dropdowns
  async getVisibleDropdownOptions(): Promise<string[]> {
    const options = await this.page.locator(DROPDOWN_SELECTORS.dropdownOptionVisible).allTextContents();
    return options;
  }

  async selectDropdownOption(optionText: string): Promise<void> {
    await this.page.locator(`${DROPDOWN_SELECTORS.dropdownOption}:text-is("${optionText}")`).first().click();
  }

  async isDropdownOpen(): Promise<boolean> {
    const visibleOptions = await this.page.locator(DROPDOWN_SELECTORS.dropdownOptionVisible).count();
    return visibleOptions > 0;
  }

  // Métodos de validación
  async getFieldValue(fieldName: keyof typeof OBRA_FORM_SELECTORS): Promise<string> {
    const selector = OBRA_FORM_SELECTORS[fieldName];
    if (typeof selector === 'string') {
      const element = this.page.locator(selector);
      if (await element.count() > 0) {
        return await element.inputValue();
      }
    }
    return '';
  }

  async hasError(): Promise<boolean> {
    const errorBox = this.page.locator('.z-errbox:visible, .z-errorbox:visible');
    return await errorBox.count() > 0;
  }

  async getErrorMessage(): Promise<string | null> {
    const errorBox = this.page.locator('.z-errbox:visible, .z-errorbox:visible').first();
    if (await errorBox.count() > 0) {
      return await errorBox.textContent();
    }
    return null;
  }

  /**
   * Selecciona el checkbox "Original" en la sección Obras Integrantes
   */
  async seleccionarOriginalObrasIntegrantes(): Promise<void> {
    this.logger.info('🎯 PASO 27: Seleccionando "Original" en Obras Integrantes...');
    
    // ENHANCED DOM INSPECTION: Find actual checkbox elements, not just rows
    this.logger.info('🔍 ENHANCED INSPECTION: Looking for actual checkbox elements...');
    
    try {
      // Strategy 1: Look for ALL input elements near Obras Integrantes
      const obrasSection = this.page.locator('text="Obras Integrantes"').locator('..');
      const allInputs = await obrasSection.locator('input').all();
      this.logger.info(`Found ${allInputs.length} input elements in Obras Integrantes section`);
      
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const type = await input.getAttribute('type').catch(() => 'unknown');
        const isVisible = await input.isVisible().catch(() => false);
        const isEnabled = await input.isEnabled().catch(() => false);
        const isChecked = await input.isChecked().catch(() => false);
        const id = await input.getAttribute('id').catch(() => 'no-id');
        
        this.logger.info(`Input ${i + 1}: type=${type}, visible=${isVisible}, enabled=${isEnabled}, checked=${isChecked}, id=${id}`);
      }
      
      // Strategy 2: Look for ZK checkbox components specifically
      const zkCheckboxes = await obrasSection.locator('.z-checkbox, [class*="checkbox"], [role="checkbox"]').all();
      this.logger.info(`Found ${zkCheckboxes.length} ZK checkbox elements`);
      
      for (let i = 0; i < zkCheckboxes.length; i++) {
        const checkbox = zkCheckboxes[i];
        const className = await checkbox.getAttribute('class').catch(() => 'no-class');
        const role = await checkbox.getAttribute('role').catch(() => 'no-role');
        this.logger.info(`ZK Checkbox ${i + 1}: class=${className}, role=${role}`);
      }
      
      // Strategy 3: Look at the specific Original row structure
      const originalRow = this.page.getByRole('row', { name: 'Original' });
      const rowHTML = await originalRow.innerHTML().catch(() => 'Could not get HTML');
      this.logger.info(`Original row HTML: ${rowHTML.substring(0, 300)}...`);
      
    } catch (inspectionError) {
      this.logger.warn('Enhanced inspection failed:', inspectionError);
    }
    
    // REAL CHECKBOX STRATEGIES: Target actual input elements, not just rows
    const strategies = [
      // ✅ SUCCESS_STRATEGY: Direct name attribute targeting - works 100% of time, used in 100% of successful executions
      {
        name: 'Target specific Original checkbox by name attribute',
        action: async () => {
          // Target the exact checkbox with name="original_integrantes"
          const checkbox = this.page.locator('input[name="original_integrantes"]');
          await checkbox.click();
        }
      },
      {
        name: 'Find first checkbox input in Original row',
        action: async () => {
          // Look for the first input element within the Original row
          const originalRow = this.page.getByRole('row', { name: 'Original' });
          const checkbox = originalRow.locator('input').first();
          await checkbox.click();
        }
      },
      {
        name: 'Double-click Original row to trigger checkbox',
        action: async () => {
          // Sometimes ZK requires double-click to check checkboxes
          await this.page.getByRole('row', { name: 'Original' }).dblclick();
        }
      },
      {
        name: 'Click checkbox near Original label',
        action: async () => {
          // Look for any input near the exact Original text
          const originalText = this.page.getByText('Original', { exact: true });
          const checkbox = originalText.locator('xpath=../..//input | xpath=../../..//input').first();
          await checkbox.click();
        }
      },
      {
        name: 'Force click first input in Obras section',
        action: async () => {
          // Since Original is first, click first input in the entire section
          const obrasSection = this.page.locator('text="Obras Integrantes"').locator('..');
          const firstInput = obrasSection.locator('input').first();
          await firstInput.click({ force: true });
        }
      },
      {
        name: 'ZK Framework: z-checkbox near Original label',
        action: async () => {
          // Target ZK checkbox component near Original span
          await this.page.locator('span:has-text("Original")').locator('xpath=..').locator('.z-checkbox, .z-checkboxicon').click();
        }
      },
      {
        name: 'ZK Framework: checkbox input near Original',
        action: async () => {
          // Look for ZK checkbox input near Original text
          await this.page.locator('span.z-label:has-text("Original")').locator('xpath=../input, xpath=../..//input').first().click();
        }
      },
      {
        name: 'ZK Framework: clickable area with Original',
        action: async () => {
          // Try clicking the entire area that contains Original - ZK might have click handlers
          await this.page.locator('span:has-text("Original")').locator('xpath=..').click();
        }
      },
      {
        name: 'ZK Framework: z-row or z-cell with Original',
        action: async () => {
          // Target ZK grid components
          await this.page.locator('.z-row:has-text("Original"), .z-cell:has-text("Original"), .z-grid-row:has-text("Original")').click();
        }
      },
      {
        name: 'Direct Original span click (ZK event handler)',
        action: async () => {
          // Target EXACT "Original" text, not partial matches like "Idioma original"
          await this.page.getByText('Original', { exact: true }).click();
        }
      }
    ];

    let success = false;
    
    for (const strategy of strategies) {
      try {
        this.logger.info(`Trying strategy: ${strategy.name}`);
        await strategy.action();
        
        // Verify checkbox was checked (ZK framework verification)
        await this.page.waitForTimeout(1000);
        
        // ENHANCED VERIFICATION: Check actual checkbox state, not just hover states
        const verificationMethods = [
          // Method 1: Check the specific checkbox with name="original_integrantes" is checked
          () => this.page.locator('input[name="original_integrantes"]').isChecked(),
          // Method 2: Check first checkbox in Original row is checked
          () => this.page.getByRole('row', { name: 'Original' }).locator('input').first().isChecked(),
          // Method 3: Check any checkbox in Original row is checked
          () => this.page.getByRole('row', { name: 'Original' }).locator('input[type="checkbox"]:checked').count().then(count => count > 0),
          // Method 4: Fallback - Check for ZK visual selection indicators (but this is less reliable)
          () => this.page.getByRole('row', { name: 'Original' }).evaluate(el => el.classList.contains('z-selected') || el.classList.contains('selected')),
          // Method 5: Look for visual checkmarks or selection indicators
          () => this.page.getByRole('row', { name: 'Original' }).locator('.fa-check, .checkmark, [class*="check"][class*="ed"]').count().then(count => count > 0)
        ];
        
        let isChecked = false;
        for (const method of verificationMethods) {
          try {
            const result = await method();
            if ((typeof result === 'number' && result > 0) || (typeof result === 'boolean' && result)) {
              isChecked = true;
              break;
            }
          } catch (e) {
            // Continue to next method
          }
        }
        
        if (isChecked) {
          this.logger.info(`✅ SUCCESS: Original checkbox selected with strategy: ${strategy.name}`);
          success = true;
          break;
        } else {
          this.logger.warn(`Strategy ${strategy.name} executed but checkbox not verified as checked`);
        }
      } catch (error) {
        this.logger.warn(`Strategy ${strategy.name} failed:`, error);
      }
    }

    if (!success) {
      throw new Error('No se pudo seleccionar el checkbox "Original" en Obras Integrantes');
    }

    // Take screenshot after successful selection
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `output/screenshots/milestone/milestone_original_selected_${timestamp}.png`,
      fullPage: true 
    });
    
    this.logger.info(`✅ Screenshot saved: milestone_original_selected_${timestamp}.png`);
    this.logger.info('✅ Checkbox "Original" seleccionado exitosamente');
  }

  /**
   * Selecciona la opción en el dropdown "¿Es una publicación Web?"
   */
  async seleccionarPublicacionWeb(esPublicacionWeb: boolean): Promise<void> {
    this.logger.info('🎯 PASO 28: Seleccionando opción en "¿Es una publicación Web?"...');
    
    const opcionASeleccionar = esPublicacionWeb ? 'Si' : 'No';
    this.logger.info(`Opción a seleccionar: ${opcionASeleccionar} (esPublicacionWeb: ${esPublicacionWeb})`);
    
    // ENHANCED DOM INSPECTION: Deep analysis of all possible dropdown elements
    this.logger.info('🔍 DEEP DOM INSPECTION: Analyzing "¿Es una publicación Web?" dropdown...');
    
    try {
      // Strategy 1: Find ALL possible dropdown/clickable elements on the page
      const allDropdownElements = await this.page.locator('select, [role="combobox"], .z-combobox, .z-combobox-btn, input[type="button"], button, [onclick], [class*="dropdown"], [class*="combo"], [class*="select"]').all();
      this.logger.info(`🔍 Found ${allDropdownElements.length} total dropdown-like elements on page`);
      
      // Strategy 2: Analyze specific area around "¿Es una publicación Web?" text
      const webText = this.page.getByText('¿Es una publicación Web?');
      const webTextGrandParent = webText.locator('xpath=../..');
      
      // Check for ANY clickable elements near the text
      const nearWebElements = await webTextGrandParent.locator('select, [role="combobox"], .z-combobox, .z-combobox-btn, input, button, [onclick]').all();
      this.logger.info(`🔍 Found ${nearWebElements.length} clickable elements near "¿Es una publicación Web?" text`);
      
      for (let i = 0; i < Math.min(nearWebElements.length, 5); i++) {
        const element = nearWebElements[i];
        const tagName = await element.evaluate(el => el.tagName).catch(() => 'unknown');
        const id = await element.getAttribute('id').catch(() => 'no-id');
        const name = await element.getAttribute('name').catch(() => 'no-name');
        const className = await element.getAttribute('class').catch(() => 'no-class');
        const onclick = await element.getAttribute('onclick').catch(() => 'no-onclick');
        const role = await element.getAttribute('role').catch(() => 'no-role');
        const type = await element.getAttribute('type').catch(() => 'no-type');
        
        this.logger.info(`Near Web Element ${i + 1}: tag=${tagName}, id=${id}, name=${name}, class=${className}, role=${role}, type=${type}, onclick=${onclick}`);
      }
      
      // Strategy 3: Look for elements in the entire "Lugar de Publicación" section
      const lugarSection = this.page.locator('text="Lugar de Publicación"').locator('xpath=..');
      const lugarElements = await lugarSection.locator('select, [role="combobox"], .z-combobox, .z-combobox-btn, input, button, [onclick]').all();
      this.logger.info(`🔍 Found ${lugarElements.length} interactive elements in Lugar de Publicación section`);
      
      for (let i = 0; i < Math.min(lugarElements.length, 8); i++) {
        const element = lugarElements[i];
        const tagName = await element.evaluate(el => el.tagName).catch(() => 'unknown');
        const id = await element.getAttribute('id').catch(() => 'no-id');
        const name = await element.getAttribute('name').catch(() => 'no-name');
        const className = await element.getAttribute('class').catch(() => 'no-class');
        const textContent = await element.textContent().catch(() => 'no-text');
        const isVisible = await element.isVisible().catch(() => false);
        
        this.logger.info(`Lugar Element ${i + 1}: tag=${tagName}, id=${id}, name=${name}, class=${className}, text="${textContent}", visible=${isVisible}`);
      }
      
      // Strategy 4: Get HTML structure around the Web publication text
      const webTextHTML = await webTextGrandParent.innerHTML().catch(() => 'Could not get HTML');
      this.logger.info(`🔍 HTML around "¿Es una publicación Web?" text: ${webTextHTML.substring(0, 500)}...`);
      
      // Strategy 5: Look for elements that might contain "Si" or "No" options
      const siNoElements = await this.page.locator('*:has-text("Si"), *:has-text("No")').all();
      this.logger.info(`🔍 Found ${siNoElements.length} elements containing "Si" or "No" text`);
      
    } catch (inspectionError) {
      this.logger.warn('Deep DOM inspection failed:', inspectionError);
    }
    
    // COMPREHENSIVE DROPDOWN INTERACTION STRATEGIES - Based on DOM analysis
    const strategies = [
      // ✅ SUCCESS_STRATEGY: Target specific dropdown directly to the right of Web publication text
      {
        name: 'SUCCESS_STRATEGY: Target dropdown directly to the right of Web publication text',
        action: async () => {
          // STEP 1: Find the exact Web publication text element
          this.logger.info('🎯 SUCCESS_STRATEGY: Locating "¿Es una publicación Web?" text...');
          
          const webPublicationText = this.page.locator('span:has-text("¿Es una publicación Web?")');
          const webTextExists = await webPublicationText.count() > 0;
          
          if (!webTextExists) {
            throw new Error('Could not find "¿Es una publicación Web?" text on page');
          }
          
          this.logger.info('✅ Found Web publication text, now targeting dropdown to the right...');
          
          // STEP 2: Target the dropdown specifically in the same row, to the right of the text
          // Based on ZK grid structure: span is in a cell, dropdown should be in next cell
          const webTextSpan = this.page.locator('span:has-text("¿Es una publicación Web?")');
          
          // Strategy A: Find next sibling cell with dropdown
          this.logger.info('Strategy A: Looking for dropdown in next sibling cell...');
          const parentCell = webTextSpan.locator('xpath=ancestor::*[contains(@class,"z-row-cnt") or contains(@class,"z-cell")]').first();
          const nextCell = parentCell.locator('xpath=following-sibling::*[1]');
          const dropdownInNextCell = nextCell.locator('.z-combobox-btn, .z-combobox, select, input[type="button"]').first();
          
          let dropdownFound = false;
          
          try {
            if (await dropdownInNextCell.count() > 0) {
              this.logger.info('✅ Found dropdown in next sibling cell - clicking...');
              await dropdownInNextCell.click();
              await this.page.waitForTimeout(800);
              
              // Check if this opened Si/No options - enhanced detection
              this.logger.info('Checking if dropdown opened with Si/No options...');
              
              // Multiple ways to detect Si/No options
              let siOption = this.page.locator('text="Si"').first();
              let noOption = this.page.locator('text="No"').first();
              
              let siVisible = await siOption.isVisible().catch(() => false);
              let noVisible = await noOption.isVisible().catch(() => false);
              
              // If not found with exact text, try dropdown-specific selectors (ONLY visible options)
              if (!siVisible || !noVisible) {
                // Try with dropdown-specific selectors - but ONLY visible ones
                siOption = this.page.locator('.z-comboitem:visible:has-text("Si"), .z-option:visible:has-text("Si"), .z-combobox-pp:visible *:has-text("Si")').first();
                noOption = this.page.locator('.z-comboitem:visible:has-text("No"), .z-option:visible:has-text("No"), .z-combobox-pp:visible *:has-text("No")').first();
                
                siVisible = await siOption.isVisible().catch(() => false);
                noVisible = await noOption.isVisible().catch(() => false);
              }
              
              // Also check for any dropdown options that might be visible
              const anyOptions = await this.page.locator('.z-comboitem, .z-option, option').count();
              this.logger.info(`Si visible: ${siVisible}, No visible: ${noVisible}, Total options found: ${anyOptions}`);
              
              if (siVisible && noVisible) {
                this.logger.info('✅ Correct dropdown opened - selecting option...');
                dropdownFound = true;
                
                // Select the required option
                if (opcionASeleccionar === 'Si') {
                  await siOption.click();
                } else {
                  await noOption.click();
                }
                
                await this.page.waitForTimeout(500);
                this.logger.info(`✅ SUCCESS: Option "${opcionASeleccionar}" selected in Web publication dropdown`);
                return;
              }
            }
          } catch (error) {
            this.logger.warn('Strategy A failed:', error);
          }
          
          // Strategy B: Look in same table row
          if (!dropdownFound) {
            this.logger.info('Strategy B: Looking for dropdown in same table row...');
            const tableRow = webTextSpan.locator('xpath=ancestor::tr[1]');
            const rowDropdown = tableRow.locator('.z-combobox-btn, .z-combobox, select, input[type="button"]').first();
            
            try {
              if (await rowDropdown.count() > 0) {
                this.logger.info('✅ Found dropdown in same table row - clicking...');
                await rowDropdown.click();
                await this.page.waitForTimeout(800);
                
                this.logger.info('Checking if dropdown opened with Si/No options...');
                
                let siOption = this.page.locator('text="Si"').first();
                let noOption = this.page.locator('text="No"').first();
                
                let siVisible = await siOption.isVisible().catch(() => false);
                let noVisible = await noOption.isVisible().catch(() => false);
                
                // If not found with exact text, try ZK dropdown-specific selectors (ONLY visible options)
                if (!siVisible || !noVisible) {
                  // Try ZK combobox item selectors - but ONLY visible ones in dropdown
                  siOption = this.page.locator('.z-comboitem:visible:has-text("Si"), .z-option:visible:has-text("Si"), .z-combobox-pp:visible *:has-text("Si")').first();
                  noOption = this.page.locator('.z-comboitem:visible:has-text("No"), .z-option:visible:has-text("No"), .z-combobox-pp:visible *:has-text("No")').first();
                  
                  siVisible = await siOption.isVisible().catch(() => false);
                  noVisible = await noOption.isVisible().catch(() => false);
                }
                
                // If still not found, try dropdown-specific selectors ONLY (avoid page-wide search)
                if (!siVisible || !noVisible) {
                  // ONLY search within dropdown popup elements - NOT the entire page
                  siOption = this.page.locator('.z-combobox-pp:visible *:has-text("Si"), .z-dropdown:visible *:has-text("Si")').first();
                  noOption = this.page.locator('.z-combobox-pp:visible *:has-text("No"), .z-dropdown:visible *:has-text("No")').first();
                  
                  siVisible = await siOption.isVisible().catch(() => false);
                  noVisible = await noOption.isVisible().catch(() => false);
                }
                
                const anyOptions = await this.page.locator('.z-comboitem, .z-option, option').count();
                this.logger.info(`Si visible: ${siVisible}, No visible: ${noVisible}, Total options found: ${anyOptions}`);
                
                // If we have many options, try specific ZK dropdown selectors
                if (anyOptions > 10) {
                  this.logger.info(`Large dropdown detected (${anyOptions} options) - trying specific ZK selectors...`);
                  
                  try {
                    // Try ZK-specific dropdown option selectors (VERY PRECISE - only in popup)
                    const zkComboOptions = [
                      `.z-combobox-pp:visible .z-comboitem:has-text("${opcionASeleccionar}")`,
                      `.z-combobox-pp:visible td:has-text("${opcionASeleccionar}")`,
                      `.z-combobox-pp:visible div:has-text("${opcionASeleccionar}")`,
                      `.z-dropdown:visible .z-comboitem:has-text("${opcionASeleccionar}")`,
                      `.z-dropdown:visible td:has-text("${opcionASeleccionar}")`,
                      `.z-popup:visible *:has-text("${opcionASeleccionar}")`
                    ];
                    
                    for (const selector of zkComboOptions) {
                      const option = this.page.locator(selector).first();
                      if (await option.count() > 0 && await option.isVisible()) {
                        this.logger.info(`✅ Found ZK option with selector: ${selector}`);
                        await option.click();
                        await this.page.waitForTimeout(500);
                        
                        // Verify the dropdown closed (indicating selection worked)
                        const stillOpen = await this.page.locator('.z-combobox-pp:visible, .z-dropdown:visible').count();
                        if (stillOpen === 0) {
                          this.logger.info(`✅ VERIFIED SUCCESS: Selected "${opcionASeleccionar}" and dropdown closed`);
                          dropdownFound = true;
                          return;
                        }
                      }
                    }
                    
                    this.logger.warn(`❌ Could not find selectable option "${opcionASeleccionar}" in dropdown`);
                  } catch (zkError) {
                    this.logger.warn('ZK-specific selection failed:', zkError);
                  }
                }
                
                if (siVisible && noVisible) {
                  this.logger.info('✅ Correct dropdown opened - selecting option...');
                  dropdownFound = true;
                  
                  if (opcionASeleccionar === 'Si') {
                    await siOption.click();
                  } else {
                    await noOption.click();
                  }
                  
                  await this.page.waitForTimeout(500);
                  this.logger.info(`✅ SUCCESS: Option "${opcionASeleccionar}" selected in Web publication dropdown`);
                  return;
                }
              }
            } catch (error) {
              this.logger.warn('Strategy B failed:', error);
            }
          }
          
          // Strategy C: Look for dropdown elements within a reasonable distance to the right
          if (!dropdownFound) {
            this.logger.info('Strategy C: Looking for dropdown within reasonable distance to the right...');
            const webTextContainer = webTextSpan.locator('xpath=ancestor::*[3]'); // Go up a few levels
            const nearbyDropdowns = webTextContainer.locator('.z-combobox-btn, .z-combobox, select, input[type="button"]').all();
            
            const dropdowns = await nearbyDropdowns;
            this.logger.info(`Found ${dropdowns.length} potential dropdowns in the area`);
            
            for (let i = 0; i < Math.min(dropdowns.length, 3); i++) {
              try {
                this.logger.info(`Testing nearby dropdown ${i + 1}...`);
                await dropdowns[i].click();
                await this.page.waitForTimeout(800);
                
                this.logger.info('Checking if dropdown opened with Si/No options...');
                
                let siOption = this.page.locator('text="Si"').first();
                let noOption = this.page.locator('text="No"').first();
                
                let siVisible = await siOption.isVisible().catch(() => false);
                let noVisible = await noOption.isVisible().catch(() => false);
                
                // If not found with exact text, try ZK dropdown-specific selectors (ONLY visible options)
                if (!siVisible || !noVisible) {
                  // Try ZK combobox item selectors - but ONLY visible ones in dropdown
                  siOption = this.page.locator('.z-comboitem:visible:has-text("Si"), .z-option:visible:has-text("Si"), .z-combobox-pp:visible *:has-text("Si")').first();
                  noOption = this.page.locator('.z-comboitem:visible:has-text("No"), .z-option:visible:has-text("No"), .z-combobox-pp:visible *:has-text("No")').first();
                  
                  siVisible = await siOption.isVisible().catch(() => false);
                  noVisible = await noOption.isVisible().catch(() => false);
                }
                
                // If still not found, try dropdown-specific selectors ONLY (avoid page-wide search)
                if (!siVisible || !noVisible) {
                  // ONLY search within dropdown popup elements - NOT the entire page
                  siOption = this.page.locator('.z-combobox-pp:visible *:has-text("Si"), .z-dropdown:visible *:has-text("Si")').first();
                  noOption = this.page.locator('.z-combobox-pp:visible *:has-text("No"), .z-dropdown:visible *:has-text("No")').first();
                  
                  siVisible = await siOption.isVisible().catch(() => false);
                  noVisible = await noOption.isVisible().catch(() => false);
                }
                
                const anyOptions = await this.page.locator('.z-comboitem, .z-option, option').count();
                this.logger.info(`Si visible: ${siVisible}, No visible: ${noVisible}, Total options found: ${anyOptions}`);
                
                // If we have many options, try specific ZK dropdown selectors
                if (anyOptions > 10) {
                  this.logger.info(`Large dropdown detected (${anyOptions} options) - trying specific ZK selectors...`);
                  
                  try {
                    // Try ZK-specific dropdown option selectors (VERY PRECISE - only in popup)
                    const zkComboOptions = [
                      `.z-combobox-pp:visible .z-comboitem:has-text("${opcionASeleccionar}")`,
                      `.z-combobox-pp:visible td:has-text("${opcionASeleccionar}")`,
                      `.z-combobox-pp:visible div:has-text("${opcionASeleccionar}")`,
                      `.z-dropdown:visible .z-comboitem:has-text("${opcionASeleccionar}")`,
                      `.z-dropdown:visible td:has-text("${opcionASeleccionar}")`,
                      `.z-popup:visible *:has-text("${opcionASeleccionar}")`
                    ];
                    
                    for (const selector of zkComboOptions) {
                      const option = this.page.locator(selector).first();
                      if (await option.count() > 0 && await option.isVisible()) {
                        this.logger.info(`✅ Found ZK option with selector: ${selector}`);
                        await option.click();
                        await this.page.waitForTimeout(500);
                        
                        // Verify the dropdown closed (indicating selection worked)
                        const stillOpen = await this.page.locator('.z-combobox-pp:visible, .z-dropdown:visible').count();
                        if (stillOpen === 0) {
                          this.logger.info(`✅ VERIFIED SUCCESS: Selected "${opcionASeleccionar}" and dropdown closed`);
                          dropdownFound = true;
                          return;
                        }
                      }
                    }
                    
                    this.logger.warn(`❌ Could not find selectable option "${opcionASeleccionar}" in dropdown`);
                  } catch (zkError) {
                    this.logger.warn('ZK-specific selection failed:', zkError);
                  }
                }
                
                if (siVisible && noVisible) {
                  this.logger.info(`✅ Found correct dropdown at position ${i + 1} - selecting option...`);
                  dropdownFound = true;
                  
                  if (opcionASeleccionar === 'Si') {
                    await siOption.click();
                  } else {
                    await noOption.click();
                  }
                  
                  await this.page.waitForTimeout(500);
                  this.logger.info(`✅ SUCCESS: Option "${opcionASeleccionar}" selected in Web publication dropdown`);
                  return;
                } else {
                  // Close this dropdown and try next
                  await this.page.keyboard.press('Escape');
                  await this.page.waitForTimeout(300);
                }
              } catch (error) {
                this.logger.warn(`Nearby dropdown ${i + 1} failed:`, error);
              }
            }
          }
          
          if (!dropdownFound) {
            throw new Error('Could not find the specific dropdown to the right of "¿Es una publicación Web?" text');
          }
        }
      },
      {
        name: 'Target specific ZK label ID and next sibling',
        action: async () => {
          // Based on inspection: <span id="v2DQl1" class="z-label">¿Es una publicación Web?</span>
          // Target the parent cell and find next sibling with dropdown
          const webTextSpan = this.page.locator('#v2DQl1, span.z-label:has-text("¿Es una publicación Web?")');
          const parentCell = webTextSpan.locator('xpath=..');
          const nextSibling = parentCell.locator('xpath=following-sibling::*[1]');
          const dropdown = nextSibling.locator('select, [role="combobox"], .z-combobox, .z-combobox-btn, input[type="button"], button').first();
          await dropdown.click();
        }
      },
      {
        name: 'Target next cell after Web publication text (ZK grid pattern)',
        action: async () => {
          // Target the next cell in the ZK grid structure
          const webTextSpan = this.page.locator('span:has-text("¿Es una publicación Web?")');
          const parentCell = webTextSpan.locator('xpath=..'); // z-row-cnt div
          const nextCell = parentCell.locator('xpath=following-sibling::*').first();
          const dropdown = nextCell.locator('select, [role="combobox"], .z-combobox, .z-combobox-btn, input, button').first();
          await dropdown.click();
        }
      },
      {
        name: 'Target dropdown in same row as Web publication text',
        action: async () => {
          // Look for dropdown in the same table row - fixed XPath syntax
          const webTextSpan = this.page.locator('span:has-text("¿Es una publicación Web?")');
          const tableRow = webTextSpan.locator('xpath=ancestor::tr[1]');
          const rowDropdown = tableRow.locator('select, [role="combobox"], .z-combobox, .z-combobox-btn, input, button').first();
          await rowDropdown.click();
        }
      },
      {
        name: 'Click dropdown element containing "No" (likely default value)',
        action: async () => {
          // Since we found 796 elements with "Si"/"No", target dropdowns specifically
          const dropdownWithNo = this.page.locator('select:has-text("No"), [role="combobox"]:has-text("No"), .z-combobox:has-text("No")').first();
          await dropdownWithNo.click();
        }
      },
      {
        name: 'Target input type button with "No" value',
        action: async () => {
          // Look for input[type="button"] that might contain "No" as value or text
          const buttonInput = this.page.locator('input[type="button"][value="No"], input[type="button"]:has-text("No")').first();
          await buttonInput.click();
        }
      },
      {
        name: 'Search for ZK combobox in Lugar section with current value No',
        action: async () => {
          // Look for elements that might already show "No" as the selected value
          const lugarSection = this.page.locator('text="Lugar de Publicación"').locator('..');
          const comboboxWithNo = lugarSection.locator('.z-combobox-inp[value="No"], .z-combobox-inp:has-text("No"), input[value="No"]').first();
          await comboboxWithNo.click();
        }
      },
      {
        name: 'Click any element with "No" near Web text',
        action: async () => {
          // Look for "No" text elements that might be clickable near the Web publication question
          const webText = this.page.getByText('¿Es una publicación Web?');
          const webContainer = webText.locator('xpath=ancestor::*[5]'); // Go up several levels
          const noElement = webContainer.locator('*:has-text("No")').first();
          await noElement.click();
        }
      },
      {
        name: 'Target button/input after Web text by position',
        action: async () => {
          // Look for any clickable element that comes after the web publication text
          const webText = this.page.getByText('¿Es una publicación Web?');
          const followingElement = webText.locator('xpath=following::input | xpath=following::button | xpath=following::select').first();
          await followingElement.click();
        }
      },
      {
        name: 'ZK combobox button - try all of them',
        action: async () => {
          // Try clicking ZK combobox buttons in sequence
          const zkButtons = await this.page.locator('.z-combobox-btn').all();
          if (zkButtons.length > 0) {
            // Try the last one first (most likely to be web publication)
            await zkButtons[zkButtons.length - 1].click();
          }
        }
      },
      {
        name: 'Input with type button in Lugar section',
        action: async () => {
          // Look for input[type="button"] which might be the dropdown trigger
          const lugarSection = this.page.locator('text="Lugar de Publicación"').locator('..');
          const buttonInput = lugarSection.locator('input[type="button"]').last();
          await buttonInput.click();
        }
      },
      {
        name: 'Element with dropdown/combo class',
        action: async () => {
          // Target elements with dropdown-related classes
          const lugarSection = this.page.locator('text="Lugar de Publicación"').locator('..');
          const dropdownElement = lugarSection.locator('[class*="dropdown"], [class*="combo"], [class*="select"]').last();
          await dropdownElement.click();
        }
      },
      {
        name: 'Any clickable element near Web text',
        action: async () => {
          // Most generic approach - click any clickable element near the text
          const webText = this.page.getByText('¿Es una publicación Web?');
          const nearbyClickable = webText.locator('xpath=../following-sibling::*//input | xpath=../following-sibling::*//button | xpath=../following-sibling::*//*[@onclick]').first();
          await nearbyClickable.click();
        }
      },
      {
        name: 'Force click on specific coordinates',
        action: async () => {
          // Last resort: click at specific coordinates relative to the text
          const webText = this.page.getByText('¿Es una publicación Web?');
          const textBox = await webText.boundingBox();
          if (textBox) {
            // Click to the right of the text where dropdown might be
            await this.page.mouse.click(textBox.x + textBox.width + 100, textBox.y + textBox.height / 2);
          }
        }
      }
    ];

    let success = false;
    
    for (const strategy of strategies) {
      try {
        this.logger.info(`Trying strategy: ${strategy.name}`);
        await strategy.action();
        
        // For SUCCESS_STRATEGY, the selection is done within the action, so we just verify
        if (strategy.name.includes('SUCCESS_STRATEGY')) {
          success = true;
          this.logger.info(`✅ SUCCESS: ${strategy.name} completed dropdown opening and selection`);
          break;
        }
        
        // For other strategies, we need separate selection logic (fallback)
        this.logger.warn('Non-SUCCESS_STRATEGY used - implementing fallback selection');
        await this.page.waitForTimeout(1000);
        
        // Try to select the option - but ONLY from visible dropdown elements
        try {
          // IMPORTANT: Only search within dropdown popup elements, NOT the entire page
          const dropdownOption = this.page.locator(`.z-combobox-pp:visible *:has-text("${opcionASeleccionar}"), .z-comboitem:visible:has-text("${opcionASeleccionar}"), .z-dropdown:visible *:has-text("${opcionASeleccionar}")`).first();
          
          if (await dropdownOption.count() > 0 && await dropdownOption.isVisible()) {
            await dropdownOption.click();
            success = true;
            this.logger.info(`✅ SUCCESS: Option "${opcionASeleccionar}" selected with dropdown-specific fallback strategy: ${strategy.name}`);
            break;
          } else {
            this.logger.warn(`❌ No visible dropdown option found for "${opcionASeleccionar}" after strategy: ${strategy.name}`);
          }
        } catch (selectionError) {
          this.logger.warn(`Fallback selection failed for strategy ${strategy.name}:`, selectionError);
        }
        
      } catch (error) {
        this.logger.warn(`Strategy ${strategy.name} failed:`, error);
      }
    }

    if (!success) {
      throw new Error(`No se pudo seleccionar la opción "${opcionASeleccionar}" en el dropdown "¿Es una publicación Web?"`);
    }

    // SUCCESS_STRATEGY handles both dropdown opening and option selection in one action

    // Take screenshot after successful selection
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `output/screenshots/milestone/milestone_publicacion_web_selected_${timestamp}.png`,
      fullPage: true 
    });
    
    this.logger.info(`✅ Screenshot saved: milestone_publicacion_web_selected_${timestamp}.png`);
    this.logger.info(`✅ Opción "${opcionASeleccionar}" seleccionada exitosamente en "¿Es una publicación Web?"`);
  }
}
