import { Page } from 'playwright';
import { config } from '../config';
import { createLogger } from '../common/logger';
import { takeScreenshot } from '../common/screenshotManager';
import { createDebugSnapshot } from '../common/debugSnapshot';
import { 
  tryInteraction, 
  waitForNavigation,
  buildButtonStrategies,
  InteractionStrategy
} from '../common/interactionHelper';

export class AfipAuthService {
  private page: Page;
  private logger = createLogger('AfipAuthService');

  constructor(page: Page) {
    this.page = page;
  }

  async login(): Promise<void> {
    this.logger.info('Iniciando autenticación en AFIP a través de TAD');
    
    try {
      // 1. Navegar a TAD
      await this.navigateToTad();
      
      // 2. Hacer click en INGRESAR
      await this.clickIngresar();
      
      // 3. Hacer click en "AFIP con tu clave fiscal"
      await this.clickAfipClaveFiscal();
      
      // 4. Ingresar CUIT
      await this.ingresarCuit();
      
      // 5. Hacer click en Siguiente
      await this.clickSiguiente();
      
      // 6. Ingresar clave
      await this.ingresarClave();
      
      // 7. Hacer click en Ingresar (AFIP)
      await this.clickIngresarAfip();
      
      // 8. Seleccionar representado si es necesario
      await this.seleccionarRepresentado();
      
      this.logger.info('✅ Autenticación en AFIP completada exitosamente');
      
    } catch (error) {
      this.logger.error('Error en autenticación AFIP:', error);
      await takeScreenshot(this.page, 'afip_auth_error', 'error');
      throw error;
    }
  }

  private async navigateToTad(): Promise<void> {
    this.logger.info('Navegando a TAD');
    
    const url = "https://tramitesadistancia.gob.ar/#/inicio";
    await this.page.goto(url);
    
    // Esperar a que la página cargue completamente
    await this.page.waitForTimeout(3000);
    await waitForNavigation(this.page);
    
    await takeScreenshot(this.page, 'tad_home', 'milestone');
    
    if (config.DEVELOPER_DEBUG_MODE) {
      await createDebugSnapshot(this.page, 'tad_home', 'Página principal de TAD');
    }
  }

  private async clickIngresar(): Promise<void> {
    this.logger.info('Haciendo click en INGRESAR');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Span with text Ingresar',
        locator: (page) => page.locator("//span[@class='block' and text()='Ingresar']")
      },
      {
        name: 'Button with text Ingresar',
        locator: (page) => page.getByRole('button', { name: 'Ingresar' })
      },
      {
        name: 'Any element with exact text',
        locator: (page) => page.locator("text=Ingresar").first()
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer click en el botón INGRESAR');
    }
    
    await this.page.waitForTimeout(2000);
  }

  private async clickAfipClaveFiscal(): Promise<void> {
    this.logger.info('Haciendo click en AFIP con tu clave fiscal');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Div with class and text',
        locator: (page) => page.locator("//div[@class='q-item__label' and text()='AFIP con tu clave fiscal']")
      },
      {
        name: 'Text contains AFIP',
        locator: (page) => page.locator("text=AFIP con tu clave fiscal")
      },
      {
        name: 'Any clickable with AFIP text',
        locator: (page) => page.locator("//*[contains(text(), 'AFIP con tu clave fiscal')]")
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer click en AFIP con tu clave fiscal');
    }
    
    await waitForNavigation(this.page);
  }

  private async ingresarCuit(): Promise<void> {
    this.logger.info('Ingresando CUIT');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Input by ID F1:username',
        locator: (page) => page.locator('#F1\\:username')
      },
      {
        name: 'Input with name username',
        locator: (page) => page.locator('input[name="username"]')
      },
      {
        name: 'Input for CUIT',
        locator: (page) => page.locator('input[placeholder*="CUIT" i]')
      }
    ];
    
    const result = await tryInteraction(this.page, 'fill', strategies, config.AFIP_CUIT);
    
    if (!result.success) {
      throw new Error('No se pudo ingresar el CUIT');
    }
    
    await takeScreenshot(this.page, 'cuit_ingresado', 'milestone');
  }

  private async clickSiguiente(): Promise<void> {
    this.logger.info('Haciendo click en Siguiente');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Button by ID F1:btnSiguiente',
        locator: (page) => page.locator('#F1\\:btnSiguiente')
      },
      {
        name: 'Button with text Siguiente',
        locator: (page) => page.getByRole('button', { name: 'Siguiente' })
      },
      {
        name: 'Input submit with value Siguiente',
        locator: (page) => page.locator('input[type="submit"][value="Siguiente"]')
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer click en Siguiente');
    }
    
    await this.page.waitForTimeout(2000);
  }

  private async ingresarClave(): Promise<void> {
    this.logger.info('Ingresando clave');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Input by ID F1:password',
        locator: (page) => page.locator('#F1\\:password')
      },
      {
        name: 'Input type password',
        locator: (page) => page.locator('input[type="password"]')
      },
      {
        name: 'Input with name password',
        locator: (page) => page.locator('input[name="password"]')
      }
    ];
    
    const result = await tryInteraction(this.page, 'fill', strategies, config.AFIP_PASSWORD);
    
    if (!result.success) {
      throw new Error('No se pudo ingresar la clave');
    }
  }

  private async clickIngresarAfip(): Promise<void> {
    this.logger.info('Haciendo click en Ingresar (AFIP)');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Button by ID F1:btnIngresar',
        locator: (page) => page.locator('#F1\\:btnIngresar')
      },
      {
        name: 'Button with text Ingresar',
        locator: (page) => page.getByRole('button', { name: 'Ingresar' })
      },
      {
        name: 'Input submit with value Ingresar',
        locator: (page) => page.locator('input[type="submit"][value="Ingresar"]')
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer click en Ingresar');
    }
    
    await waitForNavigation(this.page);
    await takeScreenshot(this.page, 'afip_logged_in', 'milestone');
  }

  private async seleccionarRepresentado(): Promise<void> {
    this.logger.info('Verificando si es necesario seleccionar representado');
    
    // Esperar a que la página cargue completamente
    await this.page.waitForTimeout(3000);
    
    // Tomar screenshot antes de buscar el representado
    await takeScreenshot(this.page, 'before_representado_selection', 'debug');
    
    try {
      // Verificar si existe el selector de representado en la página
      const selectorPresent = await this.page.locator('text="Seleccione a quién representar"').count() > 0 ||
                             await this.page.locator('ng-select').count() > 0 ||
                             await this.page.locator('div.toggle').count() > 0;
      
      if (!selectorPresent) {
        this.logger.info('No se encontró selector de representado, continuando...');
        return;
      }
      
      const inputData = await this.getInputData();
      if (!inputData?.gestor?.representado) {
        this.logger.info('No hay representado configurado, continuando sin selección');
        return;
      }
      
      const representado = inputData.gestor.representado;
      this.logger.info(`Buscando representado similar a: ${representado}`);
      
      // Función para calcular similitud entre strings
      const calculateSimilarity = (str1: string, str2: string): number => {
        const s1 = str1.toLowerCase().replace(/\s+/g, ' ').trim();
        const s2 = str2.toLowerCase().replace(/\s+/g, ' ').trim();
        
        // Si son exactamente iguales
        if (s1 === s2) return 1.0;
        
        // Algoritmo de distancia de Levenshtein normalizado
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = (a: string, b: string): number => {
          const matrix: number[][] = [];
          
          for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
          }
          
          for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
          }
          
          for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
              if (b.charAt(i - 1) === a.charAt(j - 1)) {
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
          
          return matrix[b.length][a.length];
        };
        
        const distance = editDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
      };
      
      // Intentar encontrar opciones con coincidencia aproximada
      const findSimilarOption = async (): Promise<string | null> => {
        try {
          // Obtener todas las opciones visibles
          const options = await this.page.locator('ng-option, .ng-option, [role="option"], div.option, span.option').all();
          
          for (const option of options) {
            const text = await option.textContent();
            if (text) {
              const similarity = calculateSimilarity(representado, text.trim());
              this.logger.debug(`Comparando "${representado}" con "${text.trim()}" - Similitud: ${(similarity * 100).toFixed(1)}%`);
              
              if (similarity >= 0.9) {
                this.logger.info(`✅ Encontrada opción similar (${(similarity * 100).toFixed(1)}%): "${text.trim()}"`);
                return text.trim();
              }
            }
          }
          
          // Si no encontramos en ng-option, buscar en cualquier elemento clickeable
          const allElements = await this.page.locator('*').all();
          for (const element of allElements) {
            try {
              const text = await element.textContent();
              if (text && text.trim().length > 0 && text.trim().length < 100) {
                const similarity = calculateSimilarity(representado, text.trim());
                if (similarity >= 0.9) {
                  const isVisible = await element.isVisible();
                  if (isVisible) {
                    this.logger.info(`✅ Encontrada coincidencia aproximada (${(similarity * 100).toFixed(1)}%): "${text.trim()}"`);
                    return text.trim();
                  }
                }
              }
            } catch (e) {
              // Ignorar elementos que no se pueden leer
            }
          }
        } catch (error) {
          this.logger.debug('Error al buscar opciones similares:', error);
        }
        
        return null;
      };
      
      // Primero intentar encontrar una opción similar sin abrir dropdown
      this.logger.info('🔍 Buscando opciones similares sin abrir dropdown...');
      let similarOption = await findSimilarOption();
      
      if (similarOption) {
        // Intentar hacer click en la opción similar encontrada
        const clickStrategies: InteractionStrategy[] = [
          {
            name: 'Direct text click on similar option',
            locator: (page) => page.getByText(similarOption, { exact: true })
          },
          {
            name: 'Exact text match for similar',
            locator: (page) => page.locator(`text="${similarOption}"`)
          },
          {
            name: 'Contains text for similar',
            locator: (page) => page.locator(`*:has-text("${similarOption}")`).first()
          }
        ];
        
        const directResult = await tryInteraction(this.page, 'click', clickStrategies);
        
        if (directResult.success) {
          this.logger.info(`✅ Opción similar seleccionada directamente: ${similarOption}`);
          await this.page.waitForTimeout(2000);
          await takeScreenshot(this.page, 'representado_selected', 'milestone');
          return;
        }
      }
      
      // Si no funcionó, intentar abrir dropdown primero
      this.logger.info('⚠️ No se encontró opción directa, abriendo dropdown...');
      
      // Estrategias para abrir el dropdown
      const dropdownStrategies: InteractionStrategy[] = [
        {
          name: 'Div toggle with arrow',
          locator: (page) => page.locator('div.toggle')
        },
        {
          name: 'ng-select element click',
          locator: (page) => page.locator('ng-select')
        },
        {
          name: 'Dropdown by placeholder',
          locator: (page) => page.locator('[placeholder*="Seleccione"]')
        },
        {
          name: 'Any clickable area near select text',
          locator: (page) => page.locator('text="Seleccione a quién representar"').locator('..')
        }
      ];
      
      const dropdownResult = await tryInteraction(this.page, 'click', dropdownStrategies);
      
      if (dropdownResult.success) {
        this.logger.info(`✅ Dropdown abierto con estrategia: ${dropdownResult.strategy}`);
        await this.page.waitForTimeout(1500); // Esperar a que se abra y carguen las opciones
        
        // Buscar opciones similares nuevamente con el dropdown abierto
        similarOption = await findSimilarOption();
        
        if (similarOption) {
          const selectionStrategies: InteractionStrategy[] = [
            {
              name: 'Click on similar option in dropdown',
              locator: (page) => page.getByText(similarOption, { exact: true })
            },
            {
              name: 'ng-option with similar text',
              locator: (page) => page.locator(`ng-option:has-text("${similarOption}")`)
            },
            {
              name: 'Any option element with similar text',
              locator: (page) => page.locator(`[role="option"]:has-text("${similarOption}")`)
            }
          ];
          
          const selectionResult = await tryInteraction(this.page, 'click', selectionStrategies);
          
          if (selectionResult.success) {
            this.logger.info(`✅ Representado seleccionado por similitud: ${similarOption}`);
            await this.page.waitForTimeout(2000);
            await takeScreenshot(this.page, 'representado_selected', 'milestone');
            return;
          }
        }
      }
      
      // Si nada funcionó, mostrar las opciones disponibles
      this.logger.warn('⚠️ No se pudo encontrar una opción con similitud >= 90%');
      this.logger.warn(`Buscabas: "${representado}"`);
      
      // Listar todas las opciones disponibles para debug
      try {
        const allOptions = await this.page.locator('ng-option, .ng-option, [role="option"]').all();
        if (allOptions.length > 0) {
          this.logger.info('Opciones disponibles en el dropdown:');
          for (const opt of allOptions) {
            const text = await opt.textContent();
            if (text) {
              const similarity = calculateSimilarity(representado, text.trim());
              this.logger.info(`  - "${text.trim()}" (similitud: ${(similarity * 100).toFixed(1)}%)`);
            }
          }
        }
      } catch (e) {
        // Ignorar si no se pueden listar las opciones
      }
      
      // Continuar sin selección
      this.logger.warn('Continuando sin selección de representado...');
      await takeScreenshot(this.page, 'representado_not_selected_continuing', 'debug');
      
      // En modo debug, pausar para selección manual
      if (config.DEVELOPER_DEBUG_MODE) {
        this.logger.info('📋 Modo debug activo - Selecciona manualmente el representado y presiona Resume');
        await this.page.pause();
      }
      
    } catch (error) {
      this.logger.error('Error al seleccionar representado:', error);
      await takeScreenshot(this.page, 'representado_selection_error', 'error');
      
      // No lanzar el error, continuar con el flujo
      this.logger.warn('Continuando a pesar del error en la selección del representado');
    }
  }

  private async getInputData(): Promise<any> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const dataDir = path.join(process.cwd(), 'data');
      const files = await fs.readdir(dataDir);
      const jsonFile = files.find(f => f.endsWith('.json'));
      
      if (jsonFile) {
        const content = await fs.readFile(path.join(dataDir, jsonFile), 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      this.logger.debug('No se pudieron leer datos de entrada:', error);
    }
    
    return null;
  }

  async logout(): Promise<void> {
    this.logger.info('Cerrando sesión en AFIP');
    
    try {
      const logoutStrategies = buildButtonStrategies('Salir');
      logoutStrategies.push(...buildButtonStrategies('Cerrar Sesión'));
      
      await tryInteraction(this.page, 'click', logoutStrategies);
      await waitForNavigation(this.page);
      
      this.logger.info('Sesión cerrada exitosamente');
    } catch (error) {
      this.logger.warn('No se pudo cerrar sesión:', error);
    }
  }
}
