import { Page } from 'playwright';
import { config } from '../config';
import { createLogger } from '../common/logger';
import { takeScreenshot } from '../common/screenshotManager';
import { createDebugSnapshot } from '../common/debugSnapshot';
import { TramiteData } from '../types/schema';
import { RegistrationResult } from '../types/tad.types';
import { 
  tryInteraction,
  waitForNavigation,
  InteractionStrategy
} from '../common/interactionHelper';

export class TadRegistrationService {
  private page: Page;
  private logger = createLogger('TadRegistrationService');

  constructor(page: Page) {
    this.page = page;
  }

  async registerObra(tramiteData: TramiteData): Promise<RegistrationResult> {
    this.logger.info(`Iniciando registro de obra: ${tramiteData.obra.titulo}`);
    
    try {
      // 9. Buscar trámite
      await this.buscarTramite();
      
      // 10. Hacer click en "Iniciar Trámite"
      await this.clickIniciarTramite();
      
      // 11. Hacer click en "CONTINUAR"
      await this.clickContinuar();
      
      // 12. Hacer click en "Completar" (carátula)
      await this.completarCaratula();
      
      // 13. Seleccionar opción "SI"
      await this.seleccionarOpcionSi();
      
      // 14. Insertar email de notificaciones
      await this.insertarEmailNotificaciones(tramiteData.gestor.emailNotificaciones);
      
      // 15. Guardar datos del trámite
      await this.guardarDatosTramite();
      
      // 16. Completar condiciones del trámite
      await this.completarCondicionesTramite();
      
      // 17. Datos de la obra a registrar
      await this.completarDatosObra(tramiteData);
      
      this.logger.info(`✅ Obra registrada exitosamente: ${tramiteData.obra.titulo}`);
      
      return {
        success: true,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.logger.error(`Error al registrar obra ${tramiteData.obra.titulo}:`, error);
      await takeScreenshot(this.page, `registration_error_${tramiteData.obra.titulo}`, 'error');
      
      if (config.DEVELOPER_DEBUG_MODE) {
        await createDebugSnapshot(
          this.page, 
          `registration_error_${tramiteData.obra.titulo}`,
          `Error durante el registro de ${tramiteData.obra.titulo}`
        );
      }
      
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  private async buscarTramite(): Promise<void> {
    this.logger.info('Buscando trámite: inscripcion de obra publicada - musical');
    
    const searchText = "inscripcion de obra publicada - musical";
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Input with specific classes',
        locator: (page) => page.locator("input.input-lg.form-control.tt-input[name='keys']")
      },
      {
        name: 'Input by ID edit-keys',
        locator: (page) => page.locator('#edit-keys')
      },
      {
        name: 'Input by placeholder',
        locator: (page) => page.locator("input[placeholder*='Buscar trámite']")
      },
      {
        name: 'Any search input',
        locator: (page) => page.locator("input[type='search']")
      }
    ];
    
    const result = await tryInteraction(this.page, 'fill', strategies, searchText);
    
    if (!result.success) {
      throw new Error('No se pudo ingresar el texto de búsqueda');
    }
    
    // Esperar un momento para que aparezcan los resultados
    await this.page.waitForTimeout(2000);
  }

  private async clickIniciarTramite(): Promise<void> {
    this.logger.info('Haciendo click en Iniciar Trámite');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Link with class btn-primary',
        locator: (page) => page.locator("a.btn-primary:has-text('Iniciar Trámite')")
      },
      {
        name: 'Link with type submit',
        locator: (page) => page.locator("a[type='submit']:has-text('Iniciar Trámite')")
      },
      {
        name: 'Any button with text',
        locator: (page) => page.getByRole('button', { name: 'Iniciar Trámite' })
      },
      {
        name: 'Any link with text',
        locator: (page) => page.getByRole('link', { name: 'Iniciar Trámite' })
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer click en Iniciar Trámite');
    }
    
    await waitForNavigation(this.page);
  }

  private async clickContinuar(): Promise<void> {
    this.logger.info('Haciendo click en CONTINUAR');
    
    // Esperar un momento para asegurar que la página esté lista
    await this.page.waitForTimeout(2000);
    
    // Tomar screenshot antes del click
    await takeScreenshot(this.page, 'before_continuar_click', 'debug');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Button by class q-btn with CONTINUAR',
        locator: (page) => page.locator('button.q-btn:has-text("CONTINUAR")')
      },
      {
        name: 'Button with span CONTINUAR',
        locator: (page) => page.locator('button:has(span:text-is("CONTINUAR"))')
      },
      {
        name: 'Direct span click',
        locator: (page) => page.locator('span.block:text-is("CONTINUAR")')
      },
      {
        name: 'Any span with CONTINUAR',
        locator: (page) => page.locator('span:text-is("CONTINUAR")')
      },
      {
        name: 'Button role with text',
        locator: (page) => page.getByRole('button', { name: 'CONTINUAR' })
      },
      {
        name: 'Button contains CONTINUAR',
        locator: (page) => page.locator('button:has-text("CONTINUAR")')
      },
      {
        name: 'Any clickable with CONTINUAR',
        locator: (page) => page.locator('*:has-text("CONTINUAR")').filter({ hasText: /^CONTINUAR$/ })
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      // Si falla, intentar con variaciones
      this.logger.warn('Primer intento fallido, probando variaciones...');
      
      const alternativeStrategies: InteractionStrategy[] = [
        {
          name: 'Text Continuar lowercase',
          locator: (page) => page.locator('text="Continuar"')
        },
        {
          name: 'Button Continuar mixed case',
          locator: (page) => page.getByRole('button', { name: /continuar/i })
        },
        {
          name: 'Any element ending with continuar',
          locator: (page) => page.locator('[class*="btn"]:has-text("ontinuar")')
        }
      ];
      
      const altResult = await tryInteraction(this.page, 'click', alternativeStrategies);
      
      if (!altResult.success) {
        // Si sigue fallando, en modo debug pausar para inspección
        if (config.DEVELOPER_DEBUG_MODE) {
          this.logger.info('📋 Botón CONTINUAR no encontrado - pausando para inspección manual');
          this.logger.info('Busca el botón CONTINUAR y haz click, luego presiona Resume');
          await this.page.pause();
        } else {
          throw new Error('No se pudo hacer click en CONTINUAR');
        }
      }
    }
    
    // Esperar a que la página responda al click
    await this.page.waitForTimeout(3000);
    await takeScreenshot(this.page, 'after_continuar_click', 'milestone');
  }

  private async completarCaratula(): Promise<void> {
    this.logger.info('Haciendo click en Completar (carátula)');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Link with data-target #collapseFormularioCaratula',
        locator: (page) => page.locator("a[data-target='#collapseFormularioCaratula']")
      },
      {
        name: 'Link with btn-default and Completar text',
        locator: (page) => page.locator("a.btn-default:has-text('Completar')")
      },
      {
        name: 'Link with pencil icon',
        locator: (page) => page.locator("a.btn-default:has(i.fa-pencil)")
      },
      {
        name: 'First Completar button',
        locator: (page) => page.locator("text=Completar").first()
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer click en Completar');
    }
    
    await this.page.waitForTimeout(2000);
  }

  private async seleccionarOpcionSi(): Promise<void> {
    this.logger.info('Seleccionando opción SI');
    
    try {
      // Primero verificar si ya está seleccionado
      const siSelected = await this.page.locator("div.z-combobox-selected:text-is('Si')").count();
      if (siSelected > 0) {
        this.logger.info('La opción SI ya está seleccionada');
        return;
      }
      
      // Buscar y hacer click en el dropdown
      const dropdownStrategies: InteractionStrategy[] = [
        {
          name: 'Combobox button icon',
          locator: (page) => page.locator("i.z-combobox-btn")
        },
        {
          name: 'Combobox button by class',
          locator: (page) => page.locator(".z-combobox-btn-icon")
        },
        {
          name: 'Input followed by icon',
          locator: (page) => page.locator("input[type='text'] + i")
        }
      ];
      
      await tryInteraction(this.page, 'click', dropdownStrategies);
      await this.page.waitForTimeout(1000);
      
      // Seleccionar la opción SI
      const siStrategies: InteractionStrategy[] = [
        {
          name: 'Comboitem with text Si',
          locator: (page) => page.locator("td.z-comboitem-text:has-text('Si')")
        },
        {
          name: 'Any td with text Si',
          locator: (page) => page.locator("td:text-is('Si')")
        },
        {
          name: 'Span with text Si',
          locator: (page) => page.locator("span:text-is('Si')")
        }
      ];
      
      const result = await tryInteraction(this.page, 'click', siStrategies);
      
      if (!result.success) {
        // Intentar escribir directamente
        const inputField = this.page.locator("input[type='text']").first();
        await inputField.clear();
        await inputField.fill("Si");
        await inputField.press('Enter');
      }
      
    } catch (error) {
      this.logger.error('Error al seleccionar opción SI:', error);
      throw error;
    }
  }

  private async insertarEmailNotificaciones(email: string): Promise<void> {
    this.logger.info(`Insertando email de notificaciones: ${email}`);
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Input by ID uGxF_0',
        locator: (page) => page.locator('#uGxF_0')
      },
      {
        name: 'Input with name nic_direccion_correo',
        locator: (page) => page.locator("input.z-textbox[name='nic_direccion_correo']")
      },
      {
        name: 'Textbox with z-textbox class',
        locator: (page) => page.locator("input.z-textbox[type='text']")
      },
      {
        name: 'Any email input',
        locator: (page) => page.locator("input[type='email']")
      }
    ];
    
    const result = await tryInteraction(this.page, 'fill', strategies, email);
    
    if (!result.success) {
      throw new Error('No se pudo ingresar el email de notificaciones');
    }
  }

  private async guardarDatosTramite(): Promise<void> {
    this.logger.info('Guardando datos del trámite');
    
    const strategies: InteractionStrategy[] = [
      {
        name: 'Div with GUARDAR text',
        locator: (page) => page.locator("div.z-toolbarbutton-cnt:text-is('GUARDAR')")
      },
      {
        name: 'Any element with GUARDAR',
        locator: (page) => page.locator("text=GUARDAR")
      },
      {
        name: 'Toolbar button with style',
        locator: (page) => page.locator("div[style*='background-color: #767676'].z-toolbarbutton")
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer click en GUARDAR');
    }
    
    await this.page.waitForTimeout(3000);
    await takeScreenshot(this.page, 'datos_tramite_guardados', 'milestone');
  }

  private async completarCondicionesTramite(): Promise<void> {
    this.logger.info('Completando condiciones del trámite');
    
    // Hacer click en Completar
    const completarStrategies: InteractionStrategy[] = [
      {
        name: 'Link with data-target #collapseFormulario52240',
        locator: (page) => page.locator("a[data-target='#collapseFormulario52240']")
      },
      {
        name: 'Second Completar button',
        locator: (page) => page.locator("a.btn-default:has-text('Completar')").nth(1)
      },
      {
        name: 'Completar near Condiciones',
        locator: (page) => page.locator("text=Condiciones del trámite").locator(".. >> a:has-text('Completar')")
      }
    ];
    
    await tryInteraction(this.page, 'click', completarStrategies);
    await this.page.waitForTimeout(3000);
    
    // Hacer click en el dropdown
    const dropdownStrategies: InteractionStrategy[] = [
      {
        name: 'Dropdown after Leído',
        locator: (page) => page.locator("td:text-is('Leído') + td i.z-combobox-btn")
      },
      {
        name: 'Last combobox button',
        locator: (page) => page.locator("i.z-combobox-btn").last()
      }
    ];
    
    await tryInteraction(this.page, 'click', dropdownStrategies);
    await this.page.waitForTimeout(1000);
    
    // Seleccionar SI
    const siStrategies: InteractionStrategy[] = [
      {
        name: 'Comboitem Si with span',
        locator: (page) => page.locator("td.z-comboitem-text span.z-comboitem-spacer").locator(".. >> text=Si")
      },
      {
        name: 'Comboitem text Si',
        locator: (page) => page.locator("td.z-comboitem-text:has-text('Si')")
      }
    ];
    
    await tryInteraction(this.page, 'click', siStrategies);
    await this.page.waitForTimeout(1000);
    
    // Guardar
    const guardarStrategies: InteractionStrategy[] = [
      {
        name: 'GUARDAR button with specific style',
        locator: (page) => page.locator("div[style*='color: white'][style*='background-color: #767676']:text-is('GUARDAR')")
      },
      {
        name: 'Any GUARDAR button',
        locator: (page) => page.locator("div.z-toolbarbutton-cnt:text-is('GUARDAR')")
      }
    ];
    
    await tryInteraction(this.page, 'click', guardarStrategies);
    await this.page.waitForTimeout(3000);
  }

  private async completarDatosObra(_tramiteData: TramiteData): Promise<void> {
    this.logger.info('Completando datos de la obra a registrar');
    
    // Hacer click en Completar para datos de obra
    const strategies: InteractionStrategy[] = [
      {
        name: 'Link with data-target #collapseFormulario47274',
        locator: (page) => page.locator("a[data-target='#collapseFormulario47274']")
      },
      {
        name: 'Completar near Datos de la obra',
        locator: (page) => page.locator("text=Datos de la obra a registrar").locator(".. >> a:has-text('Completar')")
      },
      {
        name: 'Third Completar button',
        locator: (page) => page.locator("a.btn-default:has-text('Completar')").nth(2)
      }
    ];
    
    const result = await tryInteraction(this.page, 'click', strategies);
    
    if (!result.success) {
      throw new Error('No se pudo hacer click en Completar datos de obra');
    }
    
    await this.page.waitForTimeout(3000);
    
    // TODO: Aquí se completarán los campos específicos del formulario de obra
    // Esto será implementado en la siguiente iteración cuando se mapeen los campos exactos
    
    await takeScreenshot(this.page, 'formulario_obra_abierto', 'milestone');
  }
}
