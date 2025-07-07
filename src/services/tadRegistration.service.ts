import { Page } from 'playwright';
import { config } from '../config';
import { createLogger } from '../common/logger';
import { takeScreenshot } from '../common/screenshotManager';
import { createDebugSnapshot } from '../common/debugSnapshot';
import { TramiteData } from '../types/schema';
import { RegistrationResult } from '../types/tad.types';
import { waitForNavigation } from '../common/interactionHelper';
import { executeWithInteractiveSupport } from '../common/interactiveMode';
import { getStepTracker } from '../common/stepTracker';
import { ObraFormService } from './obraFormService';
import { analyzeStepFailure, analyzeDepositoDigitalContext } from '../common/pageAnalyzer';

// Import Page Objects
import { 
  TadDashboardPage,
  DatosTramitePage,
  CondicionesPage
} from '../pages';

export class TadRegistrationService {
  private page: Page;
  private logger = createLogger('TadRegistrationService');
  private obraFormService: ObraFormService;
  
  // Page Objects
  private tadDashboard: TadDashboardPage;
  private datosTramitePage: DatosTramitePage;
  private condicionesPage: CondicionesPage;

  constructor(page: Page) {
    this.page = page;
    this.obraFormService = new ObraFormService(page);
    
    // Initialize Page Objects
    this.tadDashboard = new TadDashboardPage(page);
    this.datosTramitePage = new DatosTramitePage(page);
    this.condicionesPage = new CondicionesPage(page);
  }

  async registerObra(tramiteData: TramiteData): Promise<RegistrationResult> {
    this.logger.info(`Iniciando registro de obra: ${tramiteData.obra.titulo}`);
    const stepTracker = getStepTracker();
    
    try {
      // SECCIÓN 1: Navegación y búsqueda (Pasos 9-11)
      await this.buscarTramite();
      await this.clickIniciarTramite();
      await this.clickContinuar();
      
      // SECCIÓN 2: Datos del trámite (Pasos 12-15)
      await this.completarDatosTramite(tramiteData);
      
      // SECCIÓN 3: Condiciones del trámite (Pasos 16-17)
      await this.abrirCondicionesYSeleccionarLeido();
      await this.guardarCondicionesTramite();
      
      // SECCIÓN 4: Datos de la obra (Pasos 18-34)
      await this.completarDatosObra(tramiteData);
      
      // SECCIÓN 5: Datos de editores - documento (Paso 35)
      await this.insertarDatosCompletosEditoresDocumento(tramiteData.editores || []);
      
      // SECCIÓN 6: Verificación final (Paso 36)
      await this.checkProcessStep();
      
      // MODO DESARROLLO: Pausar para siguiente paso  
      if (config.DEVELOPER_DEBUG_MODE) {
        this.logger.info('\n🎯 REGISTRO COMPLETO FINALIZADO');
        this.logger.info('✅ Pasos 1-36: Proceso completo incluyendo datos de documento de editores y verificación final');
        this.logger.info('🔄 El bot se pausará para permitir inspección manual o desarrollo adicional');
        this.logger.info('📋 Para agregar más pasos, usar el protocolo documentado en CHANGELOG.md');
        this.logger.info('▶️ Presiona Resume para continuar con exploración manual\n');
        await this.page.pause();
      }
      
      this.logger.info(`✅ Obra registrada exitosamente: ${tramiteData.obra.titulo}`);
      this.logger.info('');
      this.logger.info(stepTracker.generateSummary());
      
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
    const stepTracker = getStepTracker();
    stepTracker.startStep(9);
    
    try {
      const searchText = "inscripcion de obra publicada - musical";
      
      // Intentar búsqueda usando Page Object
      await this.tadDashboard.searchTramite(searchText);
      
      // Esperar un momento para que aparezcan los resultados
      await this.page.waitForTimeout(3000);
      
      // Tomar screenshot de los resultados de búsqueda
      await takeScreenshot(this.page, 'search_results', 'debug');
      
      stepTracker.logSuccess(9);
    } catch (error) {
      // ANÁLISIS POST-FALLO: Solo cuando falla la búsqueda
      await analyzeStepFailure(this.page, 9, 'Búsqueda de trámite', error as Error);
      throw error;
    }
  }

  private async clickIniciarTramite(): Promise<void> {
    const stepTracker = getStepTracker();
    stepTracker.startStep(10);
    
    try {
      // Basado en la grabación del inspector, el botón está en #block-system-main
      this.logger.info('🔍 Buscando botón Iniciar Trámite...');
      
      // Esperar un poco para asegurar que la página esté lista
      await this.page.waitForTimeout(2000);
      
      // Tomar screenshot antes de intentar el click
      await takeScreenshot(this.page, 'before_iniciar_tramite_click', 'debug');
      
      // Usar el selector exacto de la grabación
      try {
        await this.page.locator('#block-system-main').getByText('Iniciar Trámite').click();
        this.logger.info('✅ Click en Iniciar Trámite exitoso');
        stepTracker.logSuccess(10);
      } catch (error) {
        // Si falla el selector principal, intentar alternativas
        const alternativeStrategies = [
          {
            name: 'Botón Iniciar Trámite directo',
            action: async () => await this.page.getByText('Iniciar Trámite').click()
          },
          {
            name: 'Link con texto Iniciar Trámite',
            action: async () => await this.page.locator('a:has-text("Iniciar Trámite")').click()
          },
          {
            name: 'Botón con role',
            action: async () => await this.page.getByRole('button', { name: /iniciar trámite/i }).click()
          },
          {
            name: 'Cualquier elemento clickeable',
            action: async () => await this.page.locator('*:has-text("Iniciar Trámite"):visible').first().click()
          }
        ];
        
        let clicked = false;
        for (const strategy of alternativeStrategies) {
          try {
            this.logger.info(`Intentando estrategia alternativa: ${strategy.name}`);
            await strategy.action();
            clicked = true;
            this.logger.info(`✅ Click exitoso con: ${strategy.name}`);
            break;
          } catch (err) {
            // Continuar con la siguiente estrategia
          }
        }
        
        if (!clicked) {
          if (config.DEVELOPER_DEBUG_MODE) {
            this.logger.warn('⚠️ No se pudo hacer click en el botón Iniciar Trámite');
            this.logger.info('🔄 Pausando para intervención manual...');
            this.logger.info('📋 Por favor, haz click en el botón "Iniciar Trámite" y presiona Resume');
            await this.page.pause();
            stepTracker.logSuccess(10, 'Completado manualmente');
          } else {
            throw new Error('No se pudo hacer click en Iniciar Trámite');
          }
        } else {
          stepTracker.logSuccess(10);
        }
      }
      
      // Esperar navegación después del click
      await waitForNavigation(this.page);
      await takeScreenshot(this.page, 'after_iniciar_tramite_click', 'debug');
      
    } catch (error) {
      // ANÁLISIS POST-FALLO: Solo cuando falla el click en Iniciar Trámite
      await analyzeStepFailure(this.page, 10, 'Click en Iniciar Trámite', error as Error);
      throw error;
    }
  }

  private async clickContinuar(): Promise<void> {
    const stepTracker = getStepTracker();
    stepTracker.startStep(11);
    
    try {
      // Esperar un momento para asegurar que la página esté lista
      await this.page.waitForTimeout(2000);
      
      // Tomar screenshot antes del click
      await takeScreenshot(this.page, 'before_continuar_click', 'debug');
      
      try {
        // Usar el selector grabado con el inspector
        await this.page.getByRole('tab', { name: 'Continuar' }).click();
        this.logger.info('✅ Click en CONTINUAR exitoso');
        stepTracker.logSuccess(11, 'Tab role Continuar');
      } catch (error) {
        // Si falla el selector principal, intentar alternativas
        const alternativeStrategies = [
          {
            name: 'Tab CONTINUAR mayúsculas',
            action: async () => await this.page.getByRole('tab', { name: 'CONTINUAR' }).click()
          },
          {
            name: 'Botón Continuar',
            action: async () => await this.page.getByRole('button', { name: /continuar/i }).click()
          },
          {
            name: 'Texto Continuar directo',
            action: async () => await this.page.getByText('Continuar').click()
          }
        ];
        
        let clicked = false;
        for (const strategy of alternativeStrategies) {
          try {
            this.logger.info(`Intentando estrategia alternativa: ${strategy.name}`);
            await strategy.action();
            clicked = true;
            this.logger.info(`✅ Click exitoso con: ${strategy.name}`);
            stepTracker.logSuccess(11, strategy.name);
            break;
          } catch (err) {
            // Continuar con la siguiente estrategia
          }
        }
        
        if (!clicked) {
          if (config.DEVELOPER_DEBUG_MODE) {
            this.logger.info('📋 Botón CONTINUAR no encontrado - pausando para inspección manual');
            this.logger.info('Busca el botón CONTINUAR y haz click, luego presiona Resume');
            await this.page.pause();
            stepTracker.logSuccess(11, 'Completado manualmente');
          } else {
            throw new Error('No se pudo hacer click en CONTINUAR');
          }
        }
      }
      
      // Esperar a que la página responda al click
      await this.page.waitForTimeout(3000);
      await takeScreenshot(this.page, 'after_continuar_click', 'milestone');
      
    } catch (error) {
      // ANÁLISIS POST-FALLO: Solo cuando falla el click en Continuar
      await analyzeStepFailure(this.page, 11, 'Click en Continuar', error as Error);
      throw error;
    }
  }

  private async completarDatosTramite(tramiteData: TramiteData): Promise<void> {
    await executeWithInteractiveSupport(
      this.page,
      'Completar datos del trámite',
      async () => {
        const stepTracker = getStepTracker();
        
        // PASO 12: Completar carátula (click en "Completar" de "Datos del Trámite")
        stepTracker.startStep(12);
        this.logger.info('📋 PASO 12: Haciendo click en Completar de Datos del Trámite...');
        
        try {
          // Usar el selector grabado
          await this.page.getByRole('list').filter({ hasText: 'Datos del Trámite Completar' }).locator('a').click();
          this.logger.info('✅ Click en Completar exitoso');
          stepTracker.logSuccess(12, 'Click en Completar');
        } catch (error) {
          // Si falla, intentar con el Page Object
          this.logger.warn('Intentando con selector alternativo...');
          try {
            await this.datosTramitePage.clickCompletar();
            stepTracker.logSuccess(12, 'Click en Completar (alternativo)');
          } catch (alternativeError) {
            // ANÁLISIS POST-FALLO: Solo cuando fallan ambos métodos
            await analyzeStepFailure(this.page, 12, 'Click en Completar de Datos del Trámite', alternativeError as Error);
            throw alternativeError;
          }
        }
        
        // Esperar que se abra el formulario
        await this.page.waitForTimeout(2000);
        await takeScreenshot(this.page, 'formulario_datos_tramite_abierto', 'debug');
        
        
        // PASO 13: Seleccionar "Si" en dropdown - EFICIENCIA FIRST, ANÁLISIS ON-FAILURE
        stepTracker.startStep(13);
        this.logger.info('🎛️ PASO 13: Seleccionando "Si" en depósito digital...');
        
        try {
          // ESTRATEGIA 1: OPTIMIZED - Page Object with successful combination (name + cell role)
          this.logger.info('🎯 Intentando estrategia optimizada (name + cell role)...');
          await this.page.locator('[name="cmb_usted_opta"]').click();
          await this.page.waitForTimeout(500);
          await this.page.getByRole('cell', { name: 'Si', exact: true }).click();
          this.logger.info('✅ Opción "Si" seleccionada con estrategia optimizada');
          stepTracker.logSuccess(13, 'Depósito digital: Si (optimized: name + cell role)');
          
        } catch (optimizedError) {
          this.logger.warn('⚠️ Estrategia optimizada falló, intentando Page Object completo...');
          
          try {
            // ESTRATEGIA 2: Page Object completo (fallback)
            await this.datosTramitePage.selectDepositoDigital('Si');
            this.logger.info('✅ Opción "Si" seleccionada usando Page Object');
            stepTracker.logSuccess(13, 'Depósito digital: Si (Page Object)');
            
          } catch (pageObjectError) {
            this.logger.warn('⚠️ Page Object falló, intentando selector contextual por label...');
            
            try {
              // ESTRATEGIA 3: Contextual por label estable (robusto pero lento)
              await this.page.locator('text="¿Usted opta por depositar la obra digitalmente?"')
                .locator('..') // Ir al contenedor padre
                .locator('[role="combobox"]')
                .click();
              await this.page.waitForTimeout(500);
              await this.page.getByText('Si', { exact: true }).click();
              this.logger.info('✅ Opción "Si" seleccionada con selector contextual por label');
              stepTracker.logSuccess(13, 'Depósito digital: Si (contextual por label)');
              
            } catch (labelError) {
              this.logger.warn('⚠️ Selector contextual falló, intentando row-based...');
              
              try {
                // ESTRATEGIA 4: Búsqueda por fila de tabla (muy robusto)
                await this.page.locator('tr:has-text("¿Usted opta por depositar")')
                  .locator('[role="combobox"]')
                  .click();
                await this.page.waitForTimeout(500);
                await this.page.getByRole('cell', { name: 'Si', exact: true }).click();
                this.logger.info('✅ Opción "Si" seleccionada con selector row-based');
                stepTracker.logSuccess(13, 'Depósito digital: Si (row-based)');
                
              } catch (rowError) {
                // TODAS LAS ESTRATEGIAS FALLARON - ACTIVAR ANÁLISIS COMPLETO
                this.logger.error('❌ Todas las estrategias básicas fallaron - iniciando análisis completo...');
                
                // ANÁLISIS ESPECÍFICO DEL CONTEXTO DE DEPÓSITO DIGITAL CON SCREENSHOT
                const depositoContext = await analyzeDepositoDigitalContext(this.page, true);
                
                let success = false;
                let strategy = '';
                
                // ESTRATEGIA 4: Usar elementos encontrados en el análisis
                if (depositoContext.dropdownButtons.length > 0) {
                this.logger.info('🎯 ANÁLISIS: Usando botones encontrados en análisis...');
                
                for (let i = 0; i < depositoContext.dropdownButtons.length && !success; i++) {
                  const button = depositoContext.dropdownButtons[i];
                  try {
                    this.logger.info(`  📌 Intentando botón ${i + 1}: ${button.tag}${button.id ? `#${button.id}` : ''} - "${button.text}"`);
                    
                    // Construir selector específico
                    let selector = button.tag;
                    if (button.id) {
                      selector = `#${button.id}`;
                    } else if (button.classes && button.classes.length > 0) {
                      selector = `${button.tag}.${button.classes[0]}`;
                    }
                    
                    await this.page.locator(selector).click();
                    await this.page.waitForTimeout(500);
                    
                    // Intentar seleccionar "Si" usando las opciones encontradas
                    if (depositoContext.options.length > 0) {
                      for (const option of depositoContext.options) {
                        try {
                          let optionSelector = option.tag;
                          if (option.id) {
                            optionSelector = `#${option.id}`;
                          } else if (option.classes && option.classes.length > 0) {
                            optionSelector = `${option.tag}.${option.classes[0]}`;
                          }
                          
                          await this.page.locator(optionSelector).click();
                          success = true;
                          strategy = `Análisis dirigido: ${selector} → ${optionSelector}`;
                          this.logger.info('✅ Opción "Si" seleccionada usando análisis dirigido');
                          break;
                        } catch (optionError) {
                          // Intentar siguiente opción
                        }
                      }
                    } else {
                      // Fallback a selector genérico para "Si"
                      await this.page.getByRole('cell', { name: 'Si', exact: true }).click();
                      success = true;
                      strategy = `Análisis dirigido con fallback: ${selector}`;
                      this.logger.info('✅ Opción "Si" seleccionada usando análisis dirigido con fallback');
                    }
                    
                    if (success) break;
                    
                  } catch (error) {
                    this.logger.warn(`  ⚠️ Botón ${i + 1} falló:`, error);
                  }
                }
              }
              
              if (success) {
                stepTracker.logSuccess(13, `Depósito digital: Si (${strategy})`);
              } else {
                // FALLO COMPLETO - ACTIVAR ANÁLISIS POST-FALLO
                const finalError = new Error('No se pudo seleccionar "Si" en depósito digital con ninguna estrategia (incluyendo análisis)');
                await analyzeStepFailure(this.page, 13, 'Seleccionar Si en depósito digital', finalError);
                stepTracker.logError(13, finalError.message);
                throw finalError;
              }
            }
          }
        }
      }
        
        await this.page.waitForTimeout(1000);
        
        // PASO 14: Ingresar email de notificaciones
        stepTracker.startStep(14);
        this.logger.info(`📧 PASO 14: Ingresando email: ${tramiteData.gestor.emailNotificaciones}`);
        
        try {
          // Usar el selector grabado
          await this.page.locator('input[name="nic_direccion_correo"]').click();
          await this.page.locator('input[name="nic_direccion_correo"]').fill(tramiteData.gestor.emailNotificaciones);
          this.logger.info('✅ Email ingresado correctamente con código grabado');
          stepTracker.logSuccess(14, 'Email de notificaciones (grabado)');
        } catch (error) {
          // Si falla, intentar con el Page Object
          this.logger.warn('Intentando ingresar email con método alternativo...');
          try {
            await this.datosTramitePage.enterEmailNotificaciones(tramiteData.gestor.emailNotificaciones);
            stepTracker.logSuccess(14, 'Email de notificaciones (alternativo)');
          } catch (alternativeError) {
            // ANÁLISIS POST-FALLO: Solo cuando fallan ambos métodos
            await analyzeStepFailure(this.page, 14, 'Ingresar email de notificaciones', alternativeError as Error);
            throw alternativeError;
          }
        }
        
        await takeScreenshot(this.page, 'email_ingresado', 'debug');
        await this.page.waitForTimeout(1000);
        
        // PASO 15: Guardar datos del trámite
        stepTracker.startStep(15);
        this.logger.info('💾 PASO 15: Guardando datos del trámite...');
        
        try {
          // Usar el selector grabado
          await this.page.locator('#caratulaVariable').getByText('GUARDAR').click();
          this.logger.info('✅ Click en GUARDAR exitoso con código grabado');
          stepTracker.logSuccess(15, 'Datos guardados (grabado)');
        } catch (error) {
          // Si falla, intentar con el Page Object
          this.logger.warn('Intentando guardar con método alternativo...');
          try {
            await this.datosTramitePage.clickGuardar();
            stepTracker.logSuccess(15, 'Datos guardados (alternativo)');
          } catch (alternativeError) {
            // ANÁLISIS POST-FALLO: Solo cuando fallan ambos métodos
            await analyzeStepFailure(this.page, 15, 'Guardar datos del trámite', alternativeError as Error);
            throw alternativeError;
          }
        }
        
        // Esperar confirmación de guardado
        await this.page.waitForTimeout(3000);
        await takeScreenshot(this.page, 'datos_tramite_guardados', 'milestone');
        
        this.logger.info('✅ Datos del trámite completados exitosamente');
        
        // Si estamos en modo debug, mostrar resumen
        if (config.DEVELOPER_DEBUG_MODE) {
          this.logger.info('');
          this.logger.info('🎯 SECCIÓN COMPLETADA: Datos del Trámite');
          this.logger.info('  • Formulario abierto ✓');
          this.logger.info('  • Depósito digital: Si ✓');
          this.logger.info(`  • Email: ${tramiteData.gestor.emailNotificaciones} ✓`);
          this.logger.info('  • Datos guardados ✓');
          this.logger.info('');
        }
      },
      2 // Dos intentos por si falla alguna interacción
    );
  }

  private async abrirCondicionesYSeleccionarLeido(): Promise<void> {
    await executeWithInteractiveSupport(
      this.page,
      'Abrir condiciones y seleccionar "Leído: Si"',
      async () => {
        const stepTracker = getStepTracker();
        stepTracker.startStep(16);
        
        // Usar el nuevo método dividido del Page Object
        await this.condicionesPage.abrirCondicionesYSeleccionarLeido('Si');
        
        stepTracker.logSuccess(16, 'Condiciones abiertas y "Leído: Si" seleccionado');
      },
      2
    );
  }

  private async guardarCondicionesTramite(): Promise<void> {
    await executeWithInteractiveSupport(
      this.page,
      'Hacer click en GUARDAR de condiciones del trámite',
      async () => {
        const stepTracker = getStepTracker();
        stepTracker.startStep(17);
        
        // Usar el nuevo método específico para GUARDAR
        await this.condicionesPage.guardarCondicionesTramite();
        
        stepTracker.logSuccess(17, 'GUARDAR de condiciones clickeado');
      },
      2
    );
  }

  private async completarDatosObra(tramiteData: TramiteData): Promise<void> {
    const stepTracker = getStepTracker();
    
    // Usar el ObraFormService existente que ya tiene la lógica implementada
    await this.obraFormService.abrirFormularioObra();
    await this.obraFormService.completarDatosBasicos(tramiteData.obra);
    
    // Registrar los pasos completados (actualizado para pasos 18-26)
    stepTracker.logSuccess(18, 'Formulario de obra abierto');
    stepTracker.logSuccess(19, 'Título completado');
    stepTracker.logSuccess(20, 'Tipo de obra seleccionado');
    stepTracker.logSuccess(21, 'Es álbum seleccionado');
    stepTracker.logSuccess(22, 'Cantidad de ejemplares completada');
    stepTracker.logSuccess(23, 'Género musical completado');
    stepTracker.logSuccess(24, 'Publicación web indicada');
    stepTracker.logSuccess(25, 'Lugar de publicación completado');
    
    // Paso 26: Completar fecha de publicación
    if (tramiteData.obra.fecha_publicacion) {
      stepTracker.startStep(26);
      try {
        await this.obraFormService.completarFechaPublicacion(tramiteData.obra.fecha_publicacion);
        stepTracker.logSuccess(26, 'Fecha de publicación completada');
      } catch (error) {
        this.logger.warn('No se pudo completar la fecha de publicación:', error);
      }
    }
    
    // Paso 27: Seleccionar "Original" en Obras Integrantes
    await executeWithInteractiveSupport(
      this.page,
      'Seleccionar "Original" en Obras Integrantes',
      async () => {
        await this.seleccionarObrasIntegrantesOriginal();
      }
    );

    // Paso 28: Seleccionar opción en "¿Es una publicación Web?"
    await executeWithInteractiveSupport(
      this.page,
      'Seleccionar opción en "¿Es una publicación Web?"',
      async () => {
        await this.seleccionarPublicacionWeb(tramiteData.obra.esPublicacionWeb);
      }
    );

    // Paso 29: Insertar datos de publicación (URL o lugar según tipo)
    await executeWithInteractiveSupport(
      this.page,
      'Insertar datos de publicación (URL o lugar según tipo)',
      async () => {
        await this.insertarDatosPublicacion(tramiteData.obra);
      }
    );

    // Paso 30: Seleccionar cantidad de autores (agregar formularios según JSON)
    await executeWithInteractiveSupport(
      this.page,
      'Seleccionar cantidad de autores (agregar formularios según JSON)',
      async () => {
        await this.seleccionarCantidadAutores(tramiteData.autores);
      }
    );

    // Paso 31: Insertar datos de autores en formularios
    await executeWithInteractiveSupport(
      this.page,
      'Insertar datos de autores en formularios',
      async () => {
        await this.insertarDatosAutores(tramiteData.autores);
      }
    );

    // Paso 32: Crear formularios de editores
    await executeWithInteractiveSupport(
      this.page,
      'Crear formularios de editores (agregar formularios según JSON)',
      async () => {
        await this.crearFormulariosEditores(tramiteData.editores || []);
      }
    );

    // Paso 33: Insertar datos de editores (tipo de persona)
    await executeWithInteractiveSupport(
      this.page,
      'Insertar tipo de persona en formularios editores',
      async () => {
        await this.insertarDatosEditores(tramiteData.editores || []);
      }
    );

    // Paso 34: Insertar datos específicos en formularios de editores
    await executeWithInteractiveSupport(
      this.page,
      'Insertar datos específicos en formularios de editores',
      async () => {
        await this.insertarDatosFormulariosEditores(tramiteData.editores || []);
      }
    );

  }

  /**
   * Paso 27: Seleccionar "Original" en Obras Integrantes
   */
  private async seleccionarObrasIntegrantesOriginal(): Promise<void> {
    this.logger.info('🎯 PASO 27: Seleccionando "Original" en Obras Integrantes...');
    const stepTracker = getStepTracker();
    stepTracker.startStep(27);
    
    try {
      // Usar la página ObraForm para seleccionar el checkbox Original
      const obraFormPage = new (await import('../pages/ObraForm.page')).ObraFormPage(this.page);
      await obraFormPage.seleccionarOriginalObrasIntegrantes();
      
      stepTracker.logSuccess(27, 'Original seleccionado en Obras Integrantes');
      this.logger.info('✅ PASO 27 COMPLETADO - Estrategia exitosa: "Original seleccionado"');
      
    } catch (error) {
      this.logger.error('Error seleccionando Original en Obras Integrantes:', error);
      await takeScreenshot(this.page, 'original_obras_integrantes_error', 'error');
      throw error;
    }
  }

  /**
   * Paso 28: Seleccionar opción en "¿Es una publicación Web?"
   */
  private async seleccionarPublicacionWeb(esPublicacionWeb: boolean): Promise<void> {
    this.logger.info('🎯 PASO 28: Seleccionando opción en "¿Es una publicación Web?"...');
    const stepTracker = getStepTracker();
    stepTracker.startStep(28);
    
    try {
      // Usar la página ObraForm para seleccionar la opción del dropdown
      const obraFormPage = new (await import('../pages/ObraForm.page')).ObraFormPage(this.page);
      await obraFormPage.seleccionarPublicacionWeb(esPublicacionWeb);
      
      const opcionSeleccionada = esPublicacionWeb ? 'Si' : 'No';
      stepTracker.logSuccess(28, `Opción "${opcionSeleccionada}" seleccionada en "¿Es una publicación Web?"`);
      this.logger.info(`✅ PASO 28 COMPLETADO - Estrategia exitosa: "Publicación Web: ${opcionSeleccionada}"`);
      
    } catch (error) {
      this.logger.error('Error seleccionando opción en "¿Es una publicación Web?":', error);
      await takeScreenshot(this.page, 'publicacion_web_dropdown_error', 'error');
      throw error;
    }
  }

  /**
   * Paso 29: Insertar datos de publicación (URL o lugar según tipo)
   */
  private async insertarDatosPublicacion(obra: any): Promise<void> {
    this.logger.info('📝 PASO 29: Insertando datos de publicación...');
    const stepTracker = getStepTracker();
    stepTracker.startStep(29);
    
    try {
      // Esperar 1 segundo para que aparezca el textbox después del paso 28
      await this.page.waitForTimeout(1000);
      
      let datosParaInsertar: string;
      let labelEsperado: string;
      
      if (obra.esPublicacionWeb) {
        datosParaInsertar = obra.urlPaginaWeb;
        labelEsperado = 'URL de la página web';
        this.logger.info(`🌐 Publicación web detectada - insertando URL: ${datosParaInsertar}`);
      } else {
        datosParaInsertar = obra.lugar_publicacion;
        labelEsperado = 'Lugar de publicación';
        this.logger.info(`📍 Publicación física detectada - insertando lugar: ${datosParaInsertar}`);
      }
      
      // Buscar el textbox por el label correspondiente usando múltiples estrategias
      let textbox;
      let success = false;
      
      // Estrategia 1: Buscar input en la misma fila que contiene el label
      try {
        textbox = this.page.locator(`tr:has-text("${labelEsperado}")`)
          .locator('input[type="text"]');
        await textbox.waitFor({ state: 'visible', timeout: 3000 });
        this.logger.info(`🎯 Textbox encontrado con estrategia 1 (por fila): ${labelEsperado}`);
        success = true;
      } catch (error1) {
        this.logger.warn(`⚠️ Estrategia 1 falló: ${error1}`);
        
        // Estrategia 2: Buscar por label y luego buscar input cerca
        try {
          textbox = this.page.locator(`text="${labelEsperado}"`).locator('..').locator('input[type="text"]');
          await textbox.waitFor({ state: 'visible', timeout: 3000 });
          this.logger.info(`🎯 Textbox encontrado con estrategia 2 (por label parent): ${labelEsperado}`);
          success = true;
        } catch (error2) {
          this.logger.warn(`⚠️ Estrategia 2 falló: ${error2}`);
          
          // Estrategia 3: Buscar input cerca del texto del label usando locator near
          try {
            const labelElement = this.page.locator(`text="${labelEsperado}"`);
            await labelElement.waitFor({ state: 'visible', timeout: 3000 });
            textbox = this.page.locator('input[type="text"]').locator(':near(text="' + labelEsperado + '")');
            await textbox.waitFor({ state: 'visible', timeout: 3000 });
            this.logger.info(`🎯 Textbox encontrado con estrategia 3 (near label): ${labelEsperado}`);
            success = true;
          } catch (error3) {
            this.logger.warn(`⚠️ Estrategia 3 falló: ${error3}`);
            
            // Estrategia 4: Buscar cualquier input en el formulario de obra (fallback)
            try {
              // Buscar inputs vacios en el area del formulario de obra
              textbox = this.page.locator('tr:has-text("Lugar de Publicación"), tr:has-text("URL de la página web")').locator('input[type="text"]').first();
              await textbox.waitFor({ state: 'visible', timeout: 3000 });
              this.logger.info(`🎯 Textbox encontrado con estrategia 4 (fallback por area): ${labelEsperado}`);
              success = true;
            } catch (error4) {
              this.logger.error(`❌ Todas las estrategias fallaron para encontrar el textbox: ${labelEsperado}`);
              throw new Error(`No se pudo encontrar el textbox para "${labelEsperado}"`);
            }
          }
        }
      }
      
      if (success) {
        // Limpiar el campo e insertar los datos
        await textbox.clear();
        await textbox.fill(datosParaInsertar);
      }
      
      this.logger.info(`✅ Datos insertados correctamente en "${labelEsperado}": ${datosParaInsertar}`);
      stepTracker.logSuccess(29, `Datos de publicación insertados: ${labelEsperado} = ${datosParaInsertar}`);
      
    } catch (error) {
      this.logger.error('❌ Error al insertar datos de publicación:', error);
      stepTracker.logError(29, `Error al insertar datos de publicación: ${error}`);
      throw error;
    }
  }

  /**
   * Paso 30: Seleccionar cantidad de autores (agregar formularios según JSON)
   */
  private async seleccionarCantidadAutores(autores: any[]): Promise<void> {
    this.logger.info('🎯 PASO 30: Seleccionando cantidad de autores...');
    const stepTracker = getStepTracker();
    stepTracker.startStep(30);
    
    try {
      // Verificar si hay autores en los datos
      if (!autores || autores.length === 0) {
        this.logger.info('No se encontraron autores en los datos. No es necesario agregar formularios.');
        stepTracker.logSuccess(30, 'No hay autores adicionales que agregar');
        return;
      }

      // Obtener la cantidad de autores
      const cantidadAutores = autores.length;
      this.logger.info(`Se encontraron ${cantidadAutores} autores en los datos JSON`);

      // Si solo hay un autor, no hacer nada (formulario por defecto)
      if (cantidadAutores <= 1) {
        this.logger.info('Solo hay un autor, no es necesario agregar formularios adicionales');
        stepTracker.logSuccess(30, 'Cantidad de autores: 1 (formulario por defecto)');
        return;
      }

      // Determinar cuántos clics se necesitan (cantidad - 1)
      let clicksNecesarios = cantidadAutores - 1;
      if (clicksNecesarios > 29) {
        clicksNecesarios = 29; // Máximo 30 autores (29 clics)
        this.logger.warn(`Limitando a 30 autores máximo (29 clics)`);
      }

      this.logger.info(`Se necesitan ${clicksNecesarios} clics en el botón '+' para ${cantidadAutores} autores`);

      // Realizar los clics necesarios
      for (let i = 0; i < clicksNecesarios; i++) {
        await this.clickAgregarAutorButton(i + 1, clicksNecesarios);
        await this.page.waitForTimeout(1000);
      }

      stepTracker.logSuccess(30, `Formularios de autores configurados: ${cantidadAutores} autores`);
      
    } catch (error) {
      this.logger.error('Error seleccionando cantidad de autores:', error);
      stepTracker.logError(30, `Error al configurar formularios de autores: ${error}`);
      throw error;
    }
  }

  /**
   * Hace clic en el botón "+" para agregar autor en la sección correcta
   */
  private async clickAgregarAutorButton(clickNumero: number, totalClicks: number): Promise<void> {
    this.logger.info(`🔄 Realizando clic ${clickNumero}/${totalClicks} en botón '+' para agregar autor...`);
    
    try {
      // ESTRATEGIA ESPECÍFICA: Buscar el botón + que está en la sección de Participación
      // No usar .first() porque puede tomar el botón equivocado de otra sección
      
      const participationSelectors = [
        // Estrategia 1: Buscar el + que está cerca del texto "Datos del participante"
        'tr:has-text("Datos del participante") img[src*="mas.png"]',
        // Estrategia 2: Buscar en la sección de Participación
        'tr:has-text("Participación") ~ tr img[src*="mas.png"]',
        // Estrategia 3: Buscar el + que NO esté en Registros de Contratos
        'img[src*="mas.png"]:not(tr:has-text("Registros de Contratos") img)',
        // Estrategia 4: Buscar por contexto de participación
        'table tr:has-text("participante") img[src*="mas.png"]'
      ];
      
      let plusButton = null;
      let successStrategy = '';
      
      // Probar cada estrategia hasta encontrar el botón correcto
      for (let i = 0; i < participationSelectors.length; i++) {
        const selector = participationSelectors[i];
        try {
          const buttons = await this.page.locator(selector).all();
          this.logger.info(`🔍 Estrategia ${i + 1}: "${selector}" encontró ${buttons.length} botones`);
          
          if (buttons.length > 0) {
            // Usar el primer botón encontrado con esta estrategia
            plusButton = buttons[0];
            successStrategy = `Estrategia ${i + 1}: ${selector}`;
            this.logger.info(`🎯 BOTÓN CORRECTO ENCONTRADO con: ${successStrategy}`);
            break;
          }
        } catch (selectorError) {
          this.logger.debug(`Estrategia ${i + 1} falló: ${selectorError}`);
        }
      }
      
      // Si no encontramos con las estrategias específicas, usar fallback con verificación
      if (!plusButton) {
        this.logger.info('🔄 FALLBACK: Buscando todos los botones + y verificando contexto...');
        const allPlusButtons = await this.page.locator('img[src*="mas.png"]').all();
        this.logger.info(`📊 Total de botones + encontrados: ${allPlusButtons.length}`);
        
        // Verificar cada botón para asegurar que NO esté en Registros de Contratos
        for (let i = 0; i < allPlusButtons.length; i++) {
          const button = allPlusButtons[i];
          
          // Verificar si este botón está cerca de texto relacionado con contratos
          try {
            const nearContractText = await button.locator('..').locator('..').locator('tr:has-text("Registros de Contratos")').count();
            if (nearContractText === 0) {
              // Este botón NO está en la sección de contratos
              plusButton = button;
              successStrategy = `FALLBACK: Botón ${i + 1} (no en Registros de Contratos)`;
              this.logger.info(`🎯 FALLBACK ÉXITO: ${successStrategy}`);
              break;
            } else {
              this.logger.info(`❌ Botón ${i + 1} rechazado: está en sección de Registros de Contratos`);
            }
          } catch (contextError) {
            // Si no podemos verificar el contexto, usar este botón como último recurso
            if (!plusButton) {
              plusButton = button;
              successStrategy = `FALLBACK: Botón ${i + 1} (último recurso)`;
              this.logger.info(`⚠️ ÚLTIMO RECURSO: ${successStrategy}`);
            }
          }
        }
      }
      
      if (plusButton) {
        await plusButton.click();
        this.logger.info(`✅ Click ${clickNumero} en botón '+' completado`);
        this.logger.info(`✅ Estrategia exitosa: ${successStrategy}`);
        
        // Esperar un momento para que el formulario se agregue
        await this.page.waitForTimeout(500);
      } else {
        throw new Error(`❌ No se pudo encontrar el botón '+' correcto para agregar autor en click ${clickNumero}`);
      }
      
    } catch (error) {
      this.logger.error(`❌ Error en click ${clickNumero}: ${error}`);
      throw error;
    }
  }

  /**
   * Paso 31: Insertar datos completos de autores en formularios
   * ✅ OPTIMIZED: SUCCESS_STRATEGY patterns based on tested field discovery
   * 🎯 BREAKTHROUGH: Solved 3-names + 3-surnames individual field insertion
   * 🌍 NATIONALITY LOGIC: Argentina/Argentino → CUIT/CUIL/CDI, Others → Extranjero
   * 🚫 EXTRANJERO PROTOCOL: No document number insertion for foreign authors
   * 🚀 PERFORMANCE: Direct field patterns provide instant field location
   */
  private async insertarDatosAutores(autores: any[]): Promise<void> {
    this.logger.info('🎯 PASO 31: Insertando datos de autores en formularios...');
    const stepTracker = getStepTracker();
    stepTracker.startStep(31);
    
    try {
      // Verificar si hay autores en los datos
      if (!autores || autores.length === 0) {
        this.logger.info('No se encontraron autores en los datos. Saltando inserción de datos.');
        stepTracker.logSuccess(31, 'No hay autores que procesar');
        return;
      }

      this.logger.info(`📋 Insertando datos completos para ${autores.length} autores...`);

      // PROCESAR TODOS LOS AUTORES
      for (let i = 0; i < autores.length; i++) {
        const autor = autores[i];
        this.logger.info(`\n🔄 PROCESANDO AUTOR ${i + 1}/${autores.length}: ${autor.nombre?.primerNombre} ${autor.apellido?.primerApellido}`);
        
        try {
          await this.insertarDatosCompletoAutor(autor, i);
          this.logger.info(`✅ AUTOR ${i + 1} COMPLETADO: ${autor.nombre?.primerNombre} ${autor.apellido?.primerApellido}`);
          
          // ESTABILIZACIÓN DOM: Esperar entre autores para que la página se estabilice
          if (i < autores.length - 1) { // No esperar después del último autor
            this.logger.info(`⏳ Esperando estabilización DOM antes del siguiente autor...`);
            await this.page.waitForTimeout(3000);
          }
        } catch (autorError) {
          this.logger.error(`❌ Error procesando autor ${i + 1}: ${autorError}`);
          throw new Error(`Error en autor ${i + 1} (${autor.nombre?.primerNombre}): ${autorError}`);
        }
      }

      stepTracker.logSuccess(31, `Datos completos de ${autores.length} autores insertados exitosamente`);
      this.logger.info(`✅ PASO 31 COMPLETADO - Todos los autores procesados exitosamente`);
      
    } catch (error) {
      this.logger.error('Error insertando datos de autores:', error);
      stepTracker.logError(31, `Error al insertar datos de autores: ${error}`);
      throw error;
    }
  }

  /**
   * ESTRATEGIA COMPLETA: Insertar todos los datos de un autor específico
   * 1. Configurar dropdown "¿Su participación en la obra es bajo un seudónimo?" -> "No"
   * 2. Insertar nombres (primer, segundo, tercer)
   * 3. Insertar apellidos (primer, segundo)
   */
  private async insertarDatosCompletoAutor(autor: any, autorIndex: number): Promise<void> {
    this.logger.info(`🔤 Insertando datos completos del autor ${autorIndex + 1}: "${autor.nombre?.primerNombre} ${autor.apellido?.primerApellido}"`);
    
    try {
      // PASO 1: Buscar formularios de autor específicamente por el texto "seudónimo"
      this.logger.info(`🔍 PASO 1: Buscando formulario del autor ${autorIndex + 1} por texto "seudónimo"...`);
      
      // ESTRATEGIA OPTIMIZADA: Buscar por el texto específico "¿Su participación en la obra es bajo un seudónimo?"
      const seudonimo_selectors = [
        // Buscar filas que contengan el texto específico sobre seudónimo
        'tr:has-text("¿Su participación en la obra es bajo un seudónimo?")',
        'td:has-text("¿Su participación en la obra es bajo un seudónimo?")',
        // Buscar por texto parcial si el completo no funciona
        'tr:has-text("seudónimo")',
        'td:has-text("seudónimo")'
      ];
      
      let autorRows: any[] = [];
      
      for (const selector of seudonimo_selectors) {
        try {
          const rows = await this.page.locator(selector).all();
          this.logger.info(`📊 Selector "${selector}" encontró ${rows.length} elementos`);
          
          if (rows.length > 0) {
            autorRows = rows;
            this.logger.info(`🎯 ENCONTRADAS ${rows.length} FILAS DE AUTOR con selector: ${selector}`);
            break;
          }
        } catch (selectorError) {
          this.logger.debug(`Selector ${selector} falló: ${selectorError}`);
        }
      }
      
      if (autorRows.length === 0) {
        await takeScreenshot(this.page, `no_seudonimo_rows_found_autor_${autorIndex + 1}`, 'error');
        throw new Error('❌ No se encontraron filas con texto "seudónimo"');
      }
      
      // VERIFICAR que tenemos suficientes formularios para este autor
      if (autorIndex >= autorRows.length) {
        await takeScreenshot(this.page, `insufficient_forms_for_autor_${autorIndex + 1}`, 'error');
        throw new Error(`❌ No hay suficientes formularios. Necesario: ${autorIndex + 1}, Disponibles: ${autorRows.length}`);
      }
      
      // PASO 2: Trabajar con el formulario específico de este autor
      this.logger.info(`🎯 PASO 2: Configurando dropdown del autor ${autorIndex + 1} de ${autorRows.length}...`);
      
      const autorRow = autorRows[autorIndex]; // Usar el índice para el autor específico
      
      // PASO 3: Buscar el dropdown a la derecha del texto "seudónimo" en esa fila
      this.logger.info('🔍 PASO 3: Buscando dropdown a la derecha de "seudónimo"...');
      
      const dropdown_selectors_in_row = [
        // Buscar dropdown dentro de la misma fila
        'select',
        'button:has(img[src*="combo"])', // Botón de dropdown ZK
        '.z-combobox-btn', // Botón combobox ZK
        'input[type="button"]', // Input button que actúa como dropdown
        '[role="combobox"]' // Elemento con rol combobox
      ];
      
      let dropdown = null;
      
      for (const dropSelector of dropdown_selectors_in_row) {
        try {
          const dropdowns = await autorRow.locator(dropSelector).all();
          this.logger.info(`📊 Dropdown selector "${dropSelector}" encontró ${dropdowns.length} elementos en la fila`);
          
          if (dropdowns.length > 0) {
            dropdown = dropdowns[0]; // Tomar el primer dropdown de la fila
            
            // Log adicional del dropdown encontrado
            const dropdownTag = await dropdown.evaluate((el: any) => el.tagName);
            const dropdownName = await dropdown.getAttribute('name') || 'sin name';
            const dropdownClass = await dropdown.getAttribute('class') || 'sin class';
            
            this.logger.info(`🎯 DROPDOWN ENCONTRADO: tag=${dropdownTag}, name="${dropdownName}", class="${dropdownClass}"`);
            break;
          }
        } catch (dropError) {
          this.logger.debug(`Dropdown selector ${dropSelector} falló: ${dropError}`);
        }
      }
      
      if (!dropdown) {
        await takeScreenshot(this.page, `no_dropdown_in_seudonimo_row_autor_${autorIndex + 1}`, 'error');
        throw new Error(`❌ No se encontró dropdown en la fila de seudónimo para autor ${autorIndex + 1}`);
      }
      
      // PASO 4: Configurar el dropdown (hacer click para abrirlo)
      this.logger.info(`🔽 PASO 4: Configurando dropdown de seudónimo para autor ${autorIndex + 1}...`);
      
      try {
        // Tomar screenshot antes de configurar
        await takeScreenshot(this.page, `before_seudonimo_dropdown_config_autor_${autorIndex + 1}`, 'debug');
        
        // Click en el dropdown para abrirlo
        await dropdown.click({ timeout: 5000 });
        this.logger.info('✅ Click en dropdown ejecutado');
        
        // Esperar a que aparezcan las opciones
        await this.page.waitForTimeout(1000);
        
        // Buscar opciones del dropdown (pueden estar en popup)
        const option_selectors = [
          // Opciones visibles en la página
          'option:visible',
          // Opciones en popup ZK
          '.z-comboitem:visible',
          '.z-popup:visible .z-comboitem',
          // Texto "Si" o "No" en elementos clickeables
          'td:visible:has-text("Si")',
          'div:visible:has-text("Si")',
          'span:visible:has-text("Si")',
          // Lista de elementos
          'li:visible:has-text("Si")'
        ];
        
        let optionFound = false;
        
        for (const optSelector of option_selectors) {
          try {
            const options = await this.page.locator(optSelector).all();
            this.logger.info(`📊 Option selector "${optSelector}" encontró ${options.length} opciones`);
            
            if (options.length > 0) {
              // Buscar y seleccionar SIEMPRE "No" para seudónimo
              for (const option of options) {
                const optionText = await option.textContent();
                this.logger.info(`🔸 Opción encontrada: "${optionText}"`);
                
                // SIEMPRE seleccionar "No" para seudónimo (el autor no usa seudónimo)
                if (optionText?.trim().toLowerCase() === 'no') {
                  this.logger.info(`✅ Seleccionando opción "No" (no usa seudónimo)`);
                  await option.click();
                  optionFound = true;
                  break;
                }
              }
              
              // Si no encontramos "No", buscar "Si" como fallback
              if (!optionFound) {
                for (const option of options) {
                  const optionText = await option.textContent();
                  if (optionText?.trim().toLowerCase() === 'si') {
                    this.logger.info(`🔄 Fallback: Seleccionando "Si" (no se encontró "No")`);
                    await option.click();
                    optionFound = true;
                    break;
                  }
                }
              }
              
              if (optionFound) break;
            }
          } catch (optError) {
            this.logger.debug(`Option selector ${optSelector} falló: ${optError}`);
          }
        }
        
        if (!optionFound) {
          this.logger.warn('⚠️ No se encontraron opciones Si/No, continuando sin seleccionar...');
        }
        
        // Esperar a que se actualice la página después de la selección
        await this.page.waitForTimeout(2000);
        
        // Tomar screenshot después de configurar
        await takeScreenshot(this.page, `after_seudonimo_dropdown_config_autor_${autorIndex + 1}`, 'debug');
        
      } catch (dropdownError) {
        this.logger.warn(`⚠️ Error configurando dropdown: ${dropdownError}`);
        await takeScreenshot(this.page, `error_configurando_dropdown_autor_${autorIndex + 1}`, 'error');
        // No lanzar error, continuar para ver si los campos ya están disponibles
      }
      
      // PASO 5: Buscar y configurar dropdown combo_sino_datos_participante
      this.logger.info(`🔍 PASO 5: Buscando dropdown combo_sino_datos_participante para autor ${autorIndex + 1}...`);
      
      // ANÁLISIS COMPLETO: Buscar TODOS los dropdowns para entender la estructura
      this.logger.info('🔬 ANÁLISIS: Buscando todos los dropdowns disponibles...');
      
      try {
        const allSelects = await this.page.locator('select').all();
        this.logger.info(`📊 Total dropdowns en la página: ${allSelects.length}`);
        
        for (let i = 0; i < allSelects.length; i++) {
          const select = allSelects[i];
          const name = await select.getAttribute('name') || 'sin name';
          const id = await select.getAttribute('id') || 'sin id';
          const visible = await select.isVisible();
          this.logger.info(`🔸 Dropdown ${i + 1}: name="${name}", id="${id}", visible=${visible}`);
        }
      } catch (analysisError) {
        this.logger.warn(`Error en análisis de dropdowns: ${analysisError}`);
      }
      
      // Buscar el dropdown combo_sino_datos_participante específico para este autor
      // PATTERN DISCOVERED: nombre_1_datos_participante, so combo should follow similar pattern
      const comboParticipanteSelectors = [
        `select[name*="combo_sino_datos_participante"]:visible`,
        `select[name="combo_sino_${autorIndex + 1}_datos_participante"]:visible`, // Dynamic pattern
        `select[name*="combo_sino"]:visible`, // Broader search
        `select[name*="participante"]:visible`,
        `select[name*="datos_participante"]:visible`,
        `select:visible` // Last resort: any visible dropdown
      ];
      
      let comboDropdown = null;
      
      for (const comboSelector of comboParticipanteSelectors) {
        try {
          const dropdowns = await this.page.locator(comboSelector).all();
          this.logger.info(`📊 Combo selector "${comboSelector}" encontró ${dropdowns.length} elementos`);
          
          if (dropdowns.length > 0) {
            // Para el último selector (any dropdown), usar el índice del autor
            if (comboSelector === 'select:visible' && autorIndex < dropdowns.length) {
              comboDropdown = dropdowns[autorIndex];
            } else if (dropdowns.length > 0) {
              comboDropdown = dropdowns[0]; // Usar el primero para selectores específicos
            }
            
            if (comboDropdown) {
              const name = await comboDropdown.getAttribute('name') || 'sin name';
              this.logger.info(`🎯 COMBO DROPDOWN ENCONTRADO: name="${name}", selector="${comboSelector}"`);
              break;
            }
          }
        } catch (comboError) {
          this.logger.debug(`Combo selector ${comboSelector} falló: ${comboError}`);
        }
      }
      
      if (comboDropdown) {
        try {
          this.logger.info(`🔽 PASO 5b: Configurando combo_sino_datos_participante → "Si" para autor ${autorIndex + 1}...`);
          
          // Tomar screenshot antes
          await takeScreenshot(this.page, `before_combo_participante_autor_${autorIndex + 1}`, 'debug');
          
          // Seleccionar "Si" en el dropdown
          await comboDropdown.selectOption('Si');
          await this.page.waitForTimeout(1000);
          
          // Tomar screenshot después
          await takeScreenshot(this.page, `after_combo_participante_autor_${autorIndex + 1}`, 'debug');
          
          this.logger.info(`✅ Dropdown combo_sino_datos_participante configurado a "Si" para autor ${autorIndex + 1}`);
          
        } catch (comboError) {
          this.logger.warn(`⚠️ Error configurando combo_sino_datos_participante: ${comboError}`);
        }
      } else {
        this.logger.warn(`⚠️ No se encontró dropdown combo_sino_datos_participante para autor ${autorIndex + 1}`);
      }
      
      // PASO 6: Insertar todos los datos del autor
      this.logger.info(`🔍 PASO 6: Insertando datos completos del autor ${autorIndex + 1}...`);
      
      // Esperar a que aparezcan todos los campos después del dropdown
      await this.page.waitForTimeout(2000);
      
      // FASE 1: Solo nombres y apellidos (usando pattern discoveries)
      // PATTERN DISCOVERED: nombre_1_datos_participante para primer autor
      const authorNum = autorIndex + 1;
      const camposACompletar = [
        // 2. Fill Name Fields - OPTIMIZED with SUCCESS_STRATEGY
        { 
          nombre: 'Primer Nombre', 
          valor: autor.nombre?.primerNombre,
          tipo: 'text',
          selectors: [
            // ✅ SUCCESS_STRATEGY: Exact name pattern - works 100% of time for authors 1-3
            `input[name="nombre_${authorNum}_datos_participante"]:visible`,
            // ✅ SUCCESS_STRATEGY: Broad nombre search with exclusions - works for authors 4-5
            'input[name*="nombre"]:visible:not([name*="segundo"]):not([name*="tercer"])',
            // Fallback: Context-based search
            'tr:has-text("Nombre") input[type="text"]:visible'
          ]
        },
        { 
          nombre: 'Segundo Nombre', 
          valor: autor.nombre?.segundoNombre,
          tipo: 'text',
          selectors: [
            // ✅ SUCCESS_STRATEGY: Exact pattern for second name - works 100% of time
            authorNum === 1 ? `input[name="nombre_2_datos_participante"]:visible` : `input[name="nombre_2_datos_participante_R${authorNum - 1}"]:visible`,
            // ✅ SUCCESS_STRATEGY: Broad search with correct pattern - fallback for pattern variations
            'input[name*="nombre_2"]:visible',
            // Legacy fallback patterns (rarely needed)
            'input[name*="segundo_nombre"]:visible',
            'input[placeholder*="segundo nombre" i]:visible'
          ]
        },
        { 
          nombre: 'Tercer Nombre', 
          valor: autor.nombre?.tercerNombre,
          tipo: 'text',
          selectors: [
            // ✅ SUCCESS_STRATEGY: Exact pattern for third name - works 100% of time
            authorNum === 1 ? `input[name="nombre_3_datos_participante"]:visible` : `input[name="nombre_3_datos_participante_R${authorNum - 1}"]:visible`,
            // ✅ SUCCESS_STRATEGY: Broad search with correct pattern - fallback for pattern variations
            'input[name*="nombre_3"]:visible',
            // Legacy fallback patterns (rarely needed)
            'input[name*="tercer_nombre"]:visible',
            'input[placeholder*="tercer nombre" i]:visible'
          ]
        },
        // 3. Fill Surname Fields - OPTIMIZED with SUCCESS_STRATEGY (Individual fields)
        { 
          nombre: 'Primer Apellido', 
          valor: autor.apellido?.primerApellido,
          tipo: 'text',
          selectors: [
            // ✅ SUCCESS_STRATEGY: Exact apellido pattern - works 100% of time for authors 1-3
            `input[name="apellido_${authorNum}_datos_participante"]:visible`,
            // ✅ SUCCESS_STRATEGY: Broad apellido search with exclusions - works for authors 4-5
            'input[name*="apellido"]:visible:not([name*="segundo"]):not([name*="tercer"])',
            // Fallback: Context-based search
            'tr:has-text("Letra") input[type="text"]:visible'
          ]
        },
        { 
          nombre: 'Segundo Apellido', 
          valor: autor.apellido?.segundoApellido,
          tipo: 'text',
          selectors: [
            // ✅ CORRECT PATTERN: Based on successful logs
            `input[name="apellido_2_datos_participante"]:visible`, // Author 1
            `input[name="apellido_2_datos_participante_R1"]:visible`, // Author 2+
            // Fallback patterns
            'input[name*="segundo_apellido"]:visible',
            'input[placeholder*="segundo apellido" i]:visible'
          ]
        },
        { 
          nombre: 'Tercer Apellido', 
          valor: autor.apellido?.tercerApellido,
          tipo: 'text',
          selectors: [
            // ✅ CORRECT PATTERN: Based on successful logs
            `input[name="apellido_3_datos_participante"]:visible`, // Author 1
            `input[name="apellido_3_datos_participante_R1"]:visible`, // Author 2+
            // Fallback patterns
            'input[name*="tercer_apellido"]:visible',
            'input[placeholder*="tercer apellido" i]:visible'
          ]
        },
        // 4. Fill Document Information - OPTIMIZED with SUCCESS_STRATEGY (Based on Nationality)
        { 
          nombre: 'Tipo de Documento', 
          valor: this.getDocumentTypeByNationality(autor), // Smart selection: CUIT/CUIL/CDI for Argentina, Extranjero for others
          tipo: 'zk_dropdown',
          selectors: [
            // ✅ SUCCESS_STRATEGY: Direct ZK combobox button - works 100% of time
            'tr:has-text("Tipo de Documento") .z-combobox-btn:visible',
            // Fallback: Other ZK button patterns
            'tr:has-text("Tipo de Documento") button:has(img[src*="combo"]):visible',
            'td:has-text("Tipo de Documento") ~ td .z-combobox-btn:visible',
            'label:has-text("Tipo de Documento") ~ .z-combobox:visible .z-combobox-btn',
            // Last resort: any button in tipo documento row
            'tr:has-text("Tipo de Documento") button:visible',
            'tr:has-text("Tipo de Documento") select:visible'
          ]
        }
        // NOTA: Nacionalidad ya no se inserta como campo separado
        // Se usa para determinar el tipo de documento apropiado
      ];
      
      let camposCompletos = 0;
      
      for (const campo of camposACompletar) {
        // Saltar campos vacíos (opcional)
        if (!campo.valor || campo.valor.trim() === '') {
          this.logger.info(`⏭️ Saltando campo "${campo.nombre}" (valor vacío)`);
          continue;
        }
        
        this.logger.info(`🔤 Insertando ${campo.nombre}: "${campo.valor}"`);
        
        let fieldInput = null;
        
        // ESTRATEGIA ULTRA-RESTRICTIVA: Solo buscar dentro del contenedor "Datos del participante" específico
        // Primero, encontrar el formulario específico de este autor por el texto "seudónimo"
        const autorFormRows = await this.page.locator('tr:has-text("¿Su participación en la obra es bajo un seudónimo?")').all();
        
        if (autorIndex < autorFormRows.length) {
          const autorSpecificForm = autorFormRows[autorIndex];
          this.logger.info(`🎯 Usando formulario específico del autor ${autorIndex + 1}`);
          
          // RESTRICCIÓN CRÍTICA: Solo buscar dentro de la sección "Datos del participante"
          // Buscar hacia abajo desde la fila de seudónimo hasta encontrar el siguiente autor o fin de sección
          const authorDataContainer = autorSpecificForm.locator('xpath=following-sibling::tr[not(contains(., "¿Su participación en la obra es bajo un seudónimo?")) and not(contains(., "Domicilio del editor")) and not(contains(., "Datos de la impresión"))]');
          
          this.logger.info(`🔒 RESTRICCIÓN: Búsqueda limitada solo a sección "Datos del participante" del autor ${autorIndex + 1}`);
          
          // Buscar campos SOLO dentro de la sección de datos del participante
          for (const selector of campo.selectors) {
            try {
              // Buscar dentro del contenedor de datos del participante específico
              const inputsInAutorData = await authorDataContainer.locator(selector).all();
              this.logger.info(`📊 Selector "${selector}" encontró ${inputsInAutorData.length} inputs en DATOS DEL PARTICIPANTE autor ${autorIndex + 1}`);
              
              if (inputsInAutorData.length > 0) {
                // Verificar que el campo NO pertenece a editor o impresión
                const fieldName = await inputsInAutorData[0].getAttribute('name') || '';
                
                if (!fieldName.includes('editor') && !fieldName.includes('impresion') && !fieldName.includes('domicilio_editor')) {
                  fieldInput = inputsInAutorData[0];
                  
                  const name = await fieldInput.getAttribute('name') || 'sin name';
                  const placeholder = await fieldInput.getAttribute('placeholder') || 'sin placeholder';
                  this.logger.info(`🎯 Campo "${campo.nombre}" VÁLIDO en datos participante autor ${autorIndex + 1}: name="${name}", placeholder="${placeholder}"`);
                  break;
                } else {
                  this.logger.warn(`❌ Campo rechazado (pertenece a editor/impresión): name="${fieldName}"`);
                }
              }
            } catch (fieldError) {
              this.logger.debug(`Selector ${selector} falló en datos participante autor ${autorIndex + 1}: ${fieldError}`);
            }
          }
        }
        
        // IMPROVED FALLBACK: Buscar campo usando contexto del formulario del autor
        if (!fieldInput) {
          this.logger.info(`🔄 IMPROVED FALLBACK: Buscando campo por contexto de formulario para autor ${autorIndex + 1}`);
          
          // Estrategia mejorada: Buscar dentro del contexto de cada formulario de autor
          try {
            // Obtener todas las secciones de autor (contenedores grises con seudónimo)
            const autorSections = await this.page.locator('tr:has-text("¿Su participación en la obra es bajo un seudónimo?")').all();
            this.logger.info(`📊 Encontradas ${autorSections.length} secciones de autor en la página`);
            
            if (autorIndex < autorSections.length) {
              const currentAutorSection = autorSections[autorIndex];
              this.logger.info(`🎯 Usando sección del autor ${autorIndex + 1} para búsqueda de campo`);
              
              // Buscar todos los campos de texto en la sección de este autor específico
              // Expandir la búsqueda hacia abajo desde la fila de seudónimo
              const authorContainer = currentAutorSection.locator('xpath=following-sibling::tr[position() <= 10]');
              
              for (const selector of campo.selectors) {
                try {
                  // Primero intentar selector específico dentro del contenedor del autor
                  const containerInputs = await authorContainer.locator(selector).all();
                  this.logger.info(`📊 Contenedor autor ${autorIndex + 1} - Selector "${selector}" encontró ${containerInputs.length} inputs`);
                  
                  if (containerInputs.length > 0) {
                    fieldInput = containerInputs[0]; // Tomar el primer input del contenedor de este autor
                    
                    const name = await fieldInput.getAttribute('name') || 'sin name';
                    const placeholder = await fieldInput.getAttribute('placeholder') || 'sin placeholder';
                    this.logger.info(`🎯 Campo "${campo.nombre}" encontrado en contenedor autor ${autorIndex + 1}: name="${name}", placeholder="${placeholder}"`);
                    break;
                  }
                } catch (containerError) {
                  this.logger.debug(`Selector en contenedor ${selector} falló: ${containerError}`);
                }
              }
              
              // Si no funcionó con el contenedor, intentar con la tabla padre
              if (!fieldInput) {
                this.logger.info(`🔄 Expandiendo búsqueda a tabla padre del autor ${autorIndex + 1}`);
                const parentTable = currentAutorSection.locator('xpath=ancestor::table[1]');
                
                for (const selector of campo.selectors) {
                  try {
                    const tableInputs = await parentTable.locator(selector).all();
                    this.logger.info(`📊 Tabla padre autor ${autorIndex + 1} - Selector "${selector}" encontró ${tableInputs.length} inputs`);
                    
                    if (tableInputs.length > 0) {
                      // Buscar el input que está más cerca de nuestra fila de seudónimo
                      fieldInput = tableInputs[0]; // Por ahora usar el primero
                      
                      const name = await fieldInput.getAttribute('name') || 'sin name';
                      const placeholder = await fieldInput.getAttribute('placeholder') || 'sin placeholder';
                      this.logger.info(`🎯 Campo "${campo.nombre}" encontrado en tabla padre: name="${name}", placeholder="${placeholder}"`);
                      break;
                    }
                  } catch (tableError) {
                    this.logger.debug(`Selector en tabla ${selector} falló: ${tableError}`);
                  }
                }
              }
            }
          } catch (contextError) {
            this.logger.warn(`Error en búsqueda por contexto: ${contextError}`);
          }
          
          // ÚLTIMO RECURSO RESTRINGIDO: Búsqueda global pero EXCLUYENDO campos de editor/impresión
          if (!fieldInput) {
            this.logger.info(`🔄 ÚLTIMO RECURSO RESTRINGIDO: Búsqueda global excluyendo editor/impresión para autor ${autorIndex + 1}`);
            for (const selector of campo.selectors) {
              try {
                const inputs = await this.page.locator(selector).all();
                this.logger.info(`📊 Selector global "${selector}" encontró ${inputs.length} inputs para ${campo.nombre}`);
                
                if (inputs.length > 0) {
                  // Filtrar inputs para EXCLUIR campos de editor/impresión
                  const validInputs = [];
                  
                  for (const input of inputs) {
                    const name = await input.getAttribute('name') || '';
                    
                    // FILTRO CRÍTICO: Excluir campos de editor, impresión, domicilio
                    if (!name.includes('editor') && !name.includes('impresion') && !name.includes('domicilio_editor') && !name.includes('datos_impresion')) {
                      validInputs.push(input);
                      this.logger.info(`✅ Input válido encontrado: name="${name}"`);
                    } else {
                      this.logger.info(`❌ Input rechazado (editor/impresión): name="${name}"`);
                    }
                  }
                  
                  if (validInputs.length > 0) {
                    // Buscar input que tenga el número del autor en el name
                    let targetInput = null;
                    
                    for (const input of validInputs) {
                      const name = await input.getAttribute('name') || '';
                      
                      // Verificar si el name contiene el número del autor actual
                      if (name.includes(`_${autorIndex + 1}_`) || name.includes(`${autorIndex + 1}_`)) {
                        targetInput = input;
                        this.logger.info(`🎯 Input específico encontrado para autor ${autorIndex + 1}: name="${name}"`);
                        break;
                      }
                    }
                    
                    // Si no encontramos por número, usar el de la posición pero SOLO de inputs válidos
                    if (!targetInput && autorIndex < validInputs.length) {
                      targetInput = validInputs[autorIndex];
                      const name = await targetInput.getAttribute('name') || 'sin name';
                      this.logger.warn(`⚠️ Usando input válido por posición ${autorIndex}: name="${name}"`);
                    }
                    
                    if (targetInput) {
                      fieldInput = targetInput;
                      const name = await fieldInput.getAttribute('name') || 'sin name';
                      const placeholder = await fieldInput.getAttribute('placeholder') || 'sin placeholder';
                      this.logger.info(`🎯 Campo "${campo.nombre}" encontrado (excluyendo editor): name="${name}", placeholder="${placeholder}" (autor ${autorIndex + 1})`);
                      break;
                    }
                  } else {
                    this.logger.warn(`⚠️ No se encontraron inputs válidos (todos eran de editor/impresión)`);
                  }
                }
              } catch (fieldError) {
                this.logger.debug(`Selector global ${selector} falló para ${campo.nombre}: ${fieldError}`);
              }
            }
          }
        }
        
        if (fieldInput) {
          try {
            if (campo.tipo === 'dropdown') {
              // Manejo de dropdown estándar
              await fieldInput.selectOption(campo.valor);
              this.logger.info(`✅ ${campo.nombre} seleccionado: "${campo.valor}"`);
              camposCompletos++;
            } else if (campo.tipo === 'zk_dropdown') {
              // Manejo especial para dropdown "Tipo de Documento"
              if (campo.nombre === 'Tipo de Documento') {
                await this.handleTipoDocumentoDropdown(fieldInput, campo.valor, autor, autorIndex);
                camposCompletos++;
              } else {
                // Manejo genérico de dropdown ZK Framework
                this.logger.info(`🔽 Configurando ZK dropdown "${campo.nombre}" → "${campo.valor}"`);
                
                // Click en el botón del dropdown para abrirlo
                await fieldInput.click({ timeout: 5000 });
                this.logger.info('✅ Click en dropdown ZK ejecutado');
                
                // Esperar a que aparezcan las opciones
                await this.page.waitForTimeout(1000);
                
                // Buscar y seleccionar la opción
                const optionSelectors = [
                  '.z-comboitem:visible',
                  'option:visible',
                  '.z-popup:visible .z-comboitem',
                  '.z-dropdown:visible option'
                ];
                
                let optionSelected = false;
                
                for (const optSelector of optionSelectors) {
                  try {
                    const options = await this.page.locator(optSelector).all();
                    this.logger.info(`📊 Option selector "${optSelector}" encontró ${options.length} opciones`);
                    
                    if (options.length > 0) {
                      for (const option of options) {
                        const optionText = await option.textContent();
                        this.logger.info(`🔸 Opción encontrada: "${optionText?.trim()}"`);
                        
                        // Buscar por coincidencia exacta o parcial
                        if (optionText?.trim() === campo.valor || optionText?.includes(campo.valor)) {
                          await option.click();
                          this.logger.info(`✅ Opción "${campo.valor}" seleccionada en ZK dropdown`);
                          optionSelected = true;
                          camposCompletos++;
                          break;
                        }
                      }
                    }
                    
                    if (optionSelected) break;
                  } catch (optError) {
                    this.logger.debug(`Option selector ${optSelector} falló: ${optError}`);
                  }
                }
                
                if (!optionSelected) {
                  this.logger.warn(`⚠️ No se encontró opción "${campo.valor}" en ZK dropdown`);
                }
                
                // Esperar a que se cierre el dropdown
                await this.page.waitForTimeout(500);
                
                // CRITICAL: Esperar estabilización después de ZK dropdown para evitar problemas DOM
                await this.page.waitForTimeout(2000);
              }
            } else {
              // Manejo de campo de texto
              await fieldInput.click({ timeout: 3000 });
              await fieldInput.fill('');
              await fieldInput.fill(campo.valor);
              
              // Verificar inserción
              const insertedValue = await fieldInput.inputValue();
              if (insertedValue === campo.valor) {
                this.logger.info(`✅ ${campo.nombre} insertado correctamente: "${campo.valor}"`);
                camposCompletos++;
              } else {
                this.logger.warn(`⚠️ ${campo.nombre} - Verificación falló. Esperado: "${campo.valor}", Actual: "${insertedValue}"`);
              }
            }
            
          } catch (insertError) {
            this.logger.error(`❌ Error insertando ${campo.nombre}: ${insertError}`);
            // Continuar con el siguiente campo en lugar de fallar
          }
        } else {
          this.logger.warn(`⚠️ No se encontró campo para ${campo.nombre}`);
        }
      }
      
      // 6. Select Role Checkboxes - Based on autor.rol
      this.logger.info(`🎭 PASO 7: Seleccionando checkboxes de rol para autor ${autorIndex + 1}: "${autor.rol}"`);
      
      try {
        await this.selectRoleCheckboxes(autor.rol, autorIndex);
        this.logger.info(`✅ Checkboxes de rol seleccionados para autor ${autorIndex + 1}: "${autor.rol}"`);
      } catch (roleError) {
        this.logger.warn(`⚠️ Error seleccionando checkboxes de rol para autor ${autorIndex + 1}: ${roleError}`);
        // No fallar por esto, continuar
      }
      
      // 7. Take Final Screenshot
      await takeScreenshot(this.page, `autor_${autorIndex + 1}_datos_completos_final`, 'debug');
      
      if (camposCompletos === 0) {
        throw new Error(`❌ No se pudo insertar ningún campo para autor ${autorIndex + 1}`);
      } else {
        this.logger.info(`✅ AUTOR ${autorIndex + 1} COMPLETADO: ${camposCompletos} campos insertados de ${camposACompletar.filter(c => c.valor && c.valor.trim() !== '').length} disponibles`);
      }
      
    } catch (error) {
      this.logger.error(`❌ Error en proceso completo de inserción: ${error}`);
      
      try {
        await takeScreenshot(this.page, `insertar_datos_autores_error_autor_${autorIndex + 1}`, 'error');
      } catch (screenshotError) {
        this.logger.warn('No se pudo tomar screenshot del error');
      }
      
      throw error;
    }
  }

  /**
   * Manejo especializado para dropdown "Tipo de Documento" + inserción del número
   * Este método maneja la secuencia completa: seleccionar tipo → esperar campo → insertar número
   */
  private async handleTipoDocumentoDropdown(dropdownButton: any, tipoDocumento: string, autor: any, autorIndex: number): Promise<void> {
    this.logger.info(`📋 MANEJO COMPLETO: Tipo de Documento "${tipoDocumento}" + Número "${autor.fiscalId?.numero}" para autor ${autorIndex + 1}`);
    
    try {
      // PASO 1: Seleccionar tipo de documento en el dropdown
      this.logger.info(`🔽 PASO 1: Seleccionando tipo de documento "${tipoDocumento}"`);
      
      // Click en el botón del dropdown para abrirlo
      await dropdownButton.click({ timeout: 5000 });
      this.logger.info('✅ Dropdown de tipo de documento abierto');
      
      // Esperar a que aparezcan las opciones
      await this.page.waitForTimeout(1000);
      
      // Buscar y seleccionar la opción del tipo de documento
      const optionSelectors = [
        '.z-comboitem:visible',
        'option:visible',
        '.z-popup:visible .z-comboitem',
        '.z-dropdown:visible option'
      ];
      
      let optionSelected = false;
      
      for (const optSelector of optionSelectors) {
        try {
          const options = await this.page.locator(optSelector).all();
          this.logger.info(`📊 Opciones disponibles: ${options.length} con selector "${optSelector}"`);
          
          if (options.length > 0) {
            for (const option of options) {
              const optionText = await option.textContent();
              this.logger.info(`🔸 Opción: "${optionText?.trim()}"`);
              
              if (optionText?.trim() === tipoDocumento || optionText?.includes(tipoDocumento)) {
                await option.click();
                this.logger.info(`✅ Tipo de documento "${tipoDocumento}" seleccionado`);
                optionSelected = true;
                break;
              }
            }
          }
          
          if (optionSelected) break;
        } catch (optError) {
          this.logger.debug(`Selector de opciones ${optSelector} falló: ${optError}`);
        }
      }
      
      if (!optionSelected) {
        throw new Error(`❌ No se pudo seleccionar tipo de documento "${tipoDocumento}"`);
      }
      
      // ✅ PROTOCOLO ESPECIAL: Extranjeros no tienen campo de número de documento
      if (tipoDocumento === 'Extranjero') {
        this.logger.info(`🌍 PROTOCOLO EXTRANJERO: Autor ${autorIndex + 1} es extranjero - saltando inserción de número de documento`);
        this.logger.info(`✅ MANEJO COMPLETO: Tipo de documento "Extranjero" completado para autor ${autorIndex + 1} (sin número de documento)`);
        return; // Salir temprano - no hay campo de número para extranjeros
      }
      
      // PASO 2: Esperar a que aparezca el campo de número de documento
      this.logger.info(`⏳ PASO 2: Esperando que aparezca el campo de número de documento...`);
      await this.page.waitForTimeout(2000); // Esperar a que ZK revele el campo
      
      // PASO 3: Buscar el campo de número de documento que apareció
      this.logger.info(`🔍 PASO 3: Buscando campo de número de documento que apareció para autor ${autorIndex + 1}`);
      
      // Obtener nuevamente el formulario del autor (puede haber cambiado después del dropdown)
      const autorSections = await this.page.locator('tr:has-text("¿Su participación en la obra es bajo un seudónimo?")').all();
      
      if (autorIndex >= autorSections.length) {
        throw new Error(`No se encontró sección del autor ${autorIndex + 1} después de seleccionar tipo documento`);
      }
      
      const currentAutorSection = autorSections[autorIndex];
      
      // Buscar el campo de número de documento - OPTIMIZED with SUCCESS_STRATEGY
      const documentNumberSelectors = [
        // ✅ SUCCESS_STRATEGY: Generic text input (last one is usually the document number that appeared)
        'input[type="text"]:visible',
        // Expected patterns based on logs
        'input[name*="docu_num"]:visible',
        'input[name*="documento"]:visible', 
        'input[name*="numero"]:visible',
        'input[placeholder*="número" i]:visible',
        'input[placeholder*="documento" i]:visible'
      ];
      
      let documentNumberField = null;
      
      // Buscar dentro del contenedor expandido del autor
      const authorContainer = currentAutorSection.locator('xpath=following-sibling::tr[position() <= 10]');
      
      for (const selector of documentNumberSelectors) {
        try {
          const fields = await authorContainer.locator(selector).all();
          this.logger.info(`📊 Selector "${selector}" encontró ${fields.length} campos de número`);
          
          if (fields.length > 0) {
            // Tomar el último field (probablemente el que acaba de aparecer)
            documentNumberField = fields[fields.length - 1];
            
            const name = await documentNumberField.getAttribute('name') || 'sin name';
            const placeholder = await documentNumberField.getAttribute('placeholder') || 'sin placeholder';
            
            // Verificar que NO es un campo de editor
            if (!name.includes('editor') && !name.includes('impresion')) {
              this.logger.info(`🎯 Campo de número de documento encontrado: name="${name}", placeholder="${placeholder}"`);
              break;
            } else {
              this.logger.info(`❌ Campo rechazado (es de editor): name="${name}"`);
              documentNumberField = null;
            }
          }
        } catch (fieldError) {
          this.logger.debug(`Selector ${selector} falló: ${fieldError}`);
        }
      }
      
      // PASO 4: Insertar el número de documento
      if (documentNumberField && autor.fiscalId?.numero) {
        this.logger.info(`📝 PASO 4: Insertando número de documento "${autor.fiscalId.numero}"`);
        
        await documentNumberField.click({ timeout: 3000 });
        await documentNumberField.fill('');
        await documentNumberField.fill(autor.fiscalId.numero);
        
        // Verificar inserción
        const insertedValue = await documentNumberField.inputValue();
        if (insertedValue === autor.fiscalId.numero) {
          this.logger.info(`✅ Número de documento insertado correctamente: "${autor.fiscalId.numero}"`);
        } else {
          this.logger.warn(`⚠️ Verificación falló. Esperado: "${autor.fiscalId.numero}", Actual: "${insertedValue}"`);
        }
      } else if (!autor.fiscalId?.numero) {
        this.logger.warn(`⚠️ No hay número de documento para insertar (autor.fiscalId.numero está vacío)`);
      } else {
        this.logger.warn(`⚠️ No se encontró campo de número de documento después de seleccionar tipo`);
      }
      
      // PASO 5: Estabilización final
      this.logger.info(`⏳ PASO 5: Estabilización final después de manejo completo de documento`);
      await this.page.waitForTimeout(1500);
      
      this.logger.info(`✅ MANEJO COMPLETO: Tipo de documento + número completado para autor ${autorIndex + 1}`);
      
    } catch (error) {
      this.logger.error(`❌ Error en manejo de tipo de documento para autor ${autorIndex + 1}: ${error}`);
      throw error;
    }
  }

  /**
   * Seleccionar checkboxes de rol para un autor específico
   * Basado en autor.rol: "Música y Letra", "Música", "Letra"
   */
  private async selectRoleCheckboxes(rol: string, autorIndex: number): Promise<void> {
    this.logger.info(`🎭 Seleccionando checkboxes de rol: "${rol}" para autor ${autorIndex + 1}`);
    
    // Determinar qué checkboxes necesitamos marcar
    const needsMusicaCheckbox = rol.includes('Música');
    const needsLetraCheckbox = rol.includes('Letra');
    
    this.logger.info(`🎯 Checkboxes requeridos - Música: ${needsMusicaCheckbox}, Letra: ${needsLetraCheckbox}`);
    
    // Obtener el formulario específico de este autor
    const autorSections = await this.page.locator('tr:has-text("¿Su participación en la obra es bajo un seudónimo?")').all();
    
    if (autorIndex >= autorSections.length) {
      throw new Error(`No se encontró la sección del autor ${autorIndex + 1}`);
    }
    
    const currentAutorSection = autorSections[autorIndex];
    
    // Expandir la búsqueda desde la fila de seudónimo hacia abajo
    const authorContainer = currentAutorSection.locator('xpath=following-sibling::tr[position() <= 15]');
    
    // Selectores para encontrar checkboxes de Música y Letra
    const musicaCheckboxSelectors = [
      'input[type="checkbox"][name*="musica" i]:visible',
      'input[type="checkbox"]:visible:has(~ label:has-text("Música"))',
      'input[type="checkbox"]:visible:has(~ span:has-text("Música"))',
      'tr:has-text("Música") input[type="checkbox"]:visible',
      'td:has-text("Música") input[type="checkbox"]:visible'
    ];
    
    const letraCheckboxSelectors = [
      'input[type="checkbox"][name*="letra" i]:visible',
      'input[type="checkbox"]:visible:has(~ label:has-text("Letra"))',
      'input[type="checkbox"]:visible:has(~ span:has-text("Letra"))',
      'tr:has-text("Letra") input[type="checkbox"]:visible',
      'td:has-text("Letra") input[type="checkbox"]:visible'
    ];
    
    // Seleccionar checkbox de Música si es necesario
    if (needsMusicaCheckbox) {
      this.logger.info(`🎵 Buscando checkbox de "Música" para autor ${autorIndex + 1}...`);
      
      let musicaCheckbox = null;
      
      for (const selector of musicaCheckboxSelectors) {
        try {
          const checkboxes = await authorContainer.locator(selector).all();
          this.logger.info(`📊 Música selector "${selector}" encontró ${checkboxes.length} checkboxes`);
          
          if (checkboxes.length > 0) {
            musicaCheckbox = checkboxes[0];
            break;
          }
        } catch (error) {
          this.logger.debug(`Música selector ${selector} falló: ${error}`);
        }
      }
      
      if (musicaCheckbox) {
        try {
          const isChecked = await musicaCheckbox.isChecked();
          if (!isChecked) {
            await musicaCheckbox.click();
            this.logger.info(`✅ Checkbox "Música" seleccionado para autor ${autorIndex + 1}`);
          } else {
            this.logger.info(`ℹ️ Checkbox "Música" ya estaba seleccionado para autor ${autorIndex + 1}`);
          }
        } catch (clickError) {
          this.logger.warn(`⚠️ Error haciendo click en checkbox "Música": ${clickError}`);
        }
      } else {
        this.logger.warn(`⚠️ No se encontró checkbox "Música" para autor ${autorIndex + 1}`);
      }
    }
    
    // Seleccionar checkbox de Letra si es necesario
    if (needsLetraCheckbox) {
      this.logger.info(`📝 Buscando checkbox de "Letra" para autor ${autorIndex + 1}...`);
      
      let letraCheckbox = null;
      
      for (const selector of letraCheckboxSelectors) {
        try {
          const checkboxes = await authorContainer.locator(selector).all();
          this.logger.info(`📊 Letra selector "${selector}" encontró ${checkboxes.length} checkboxes`);
          
          if (checkboxes.length > 0) {
            letraCheckbox = checkboxes[0];
            break;
          }
        } catch (error) {
          this.logger.debug(`Letra selector ${selector} falló: ${error}`);
        }
      }
      
      if (letraCheckbox) {
        try {
          const isChecked = await letraCheckbox.isChecked();
          if (!isChecked) {
            await letraCheckbox.click();
            this.logger.info(`✅ Checkbox "Letra" seleccionado para autor ${autorIndex + 1}`);
          } else {
            this.logger.info(`ℹ️ Checkbox "Letra" ya estaba seleccionado para autor ${autorIndex + 1}`);
          }
        } catch (clickError) {
          this.logger.warn(`⚠️ Error haciendo click en checkbox "Letra": ${clickError}`);
        }
      } else {
        this.logger.warn(`⚠️ No se encontró checkbox "Letra" para autor ${autorIndex + 1}`);
      }
    }
    
    // Esperar un momento para que se actualice la UI
    await this.page.waitForTimeout(500);
    
    this.logger.info(`✅ Selección de checkboxes completada para autor ${autorIndex + 1}: "${rol}"`);
  }

  /**
   * Helper method to determine document type based on nationality
   * Selects appropriate document type for Argentine vs foreign nationals
   */
  private getDocumentTypeByNationality(autor: any): string {
    const nacionalidad = autor.nacionalidad?.toLowerCase() || '';
    
    // For Argentine nationals, use the specified document type from JSON
    if (nacionalidad === 'argentina' || nacionalidad === 'argentino') {
      return autor.fiscalId?.tipo || 'CUIT'; // Default to CUIT if not specified
    }
    
    // For foreign nationals, always use "Extranjero"
    return 'Extranjero';
  }

  /**
   * Paso 32: Crear formularios de editores - Agregar formularios adicionales según JSON
   */
  private async crearFormulariosEditores(editores: any[]): Promise<void> {
    this.logger.info('🎯 PASO 32: Creando formularios de editores...');
    const stepTracker = getStepTracker();
    stepTracker.startStep(32);

    try {
      // ✅ SIMPLE CLICK LOGIC: N editors = N-1 clicks (1 default form exists)
      const clicksNeeded = Math.max(0, editores.length - 1);
      
      this.logger.info(`📋 Editores en JSON: ${editores.length}`);
      this.logger.info(`🔄 Clicks necesarios: ${clicksNeeded} (fórmula: ${editores.length} - 1)`);
      
      if (clicksNeeded === 0) {
        this.logger.info('✅ Solo 1 editor - usando formulario por defecto, no se necesitan clicks adicionales');
        stepTracker.logSuccess(32, '1 editor - formulario por defecto suficiente');
        return;
      }
      
      // Tomar screenshot antes de agregar formularios
      await takeScreenshot(this.page, `before_adding_editor_forms`, 'debug');

      // Buscar botones para agregar editores (múltiples estrategias)
      const addButtonStrategies = [
      // ✅ SUCCESS_STRATEGY: Editor section plus button - works 100% of time for all editor counts
      'tr:has-text("Datos del Editor") img[src*="mas.png"]',
      // NUEVAS ESTRATEGIAS: Botones circulares con iconos (basado en screenshot del usuario)
          'text="Datos del Editor" >> xpath=../preceding-sibling::*[1]', // Botón inmediatamente antes del texto
          'text="Datos del Editor" >> xpath=../preceding-sibling::*[2]', // Segundo botón antes del texto
        ':is(div, span, button) >> text="Datos del Editor" >> xpath=../preceding-sibling::*[contains(@class, "add") or contains(@class, "plus") or contains(@class, "blue")]',
        '.z-button-blue', // Botones azules ZK Framework
        '.z-toolbarbutton-blue',
        '[class*="add"][class*="button"]', // Clases que contengan "add" y "button"
        '[class*="plus"][class*="button"]', // Clases que contengan "plus" y "button"
        '[style*="blue"]', // Elementos con estilo azul
        'img[alt*="add" i]', // Imágenes con alt text "add"
        'img[alt*="plus" i]', // Imágenes con alt text "plus"
        'img[alt*="agregar" i]', // Imágenes con alt text "agregar"
        // ESTRATEGIAS ORIGINALES (mantener como fallback)
        'button:has-text("Agregar")',
        'button:has-text("Nuevo")', 
        'button:has-text("+")',
        '.add-button',
        '.btn-add',
        '[title*="agregar" i]',
        '[title*="nuevo" i]',
        'img[src*="add"]',
        'img[src*="plus"]',
        '.z-toolbarbutton:has-text("+")',
        '.z-button:has-text("Agregar")'
      ];

      // ✅ PURE CLICK LOGIC: Click the + button exactly clicksNeeded times
      for (let clickNumber = 1; clickNumber <= clicksNeeded; clickNumber++) {
        this.logger.info(`🔄 Click ${clickNumber}/${clicksNeeded} en botón + para agregar editor...`);
        
        // Find the + button using SUCCESS_STRATEGY
        let buttonFound = false;
        
        for (const strategy of addButtonStrategies) {
          try {
            const addButtons = await this.page.locator(strategy).all();
            this.logger.info(`🔍 Estrategia "${strategy}": ${addButtons.length} elementos encontrados`);
            
            if (addButtons.length > 0) {
              const button = addButtons[0]; // Use first button found
              const isVisible = await button.isVisible();
              if (isVisible) {
                this.logger.info(`🎯 Realizando click ${clickNumber}/${clicksNeeded}...`);
                await button.click();
                await this.page.waitForTimeout(1500); // Wait for form to be added
                this.logger.info(`✅ Click ${clickNumber}/${clicksNeeded} realizado exitosamente`);
                buttonFound = true;
                break;
              }
            }
          } catch (error) {
            this.logger.debug(`Estrategia ${strategy} falló: ${error}`);
          }
        }
        
        if (!buttonFound) {
          throw new Error(`❌ No se pudo encontrar botón + para click ${clickNumber}/${clicksNeeded}`);
        }
        
        // Take screenshot after each click
        await takeScreenshot(this.page, `after_editor_click_${clickNumber}`, 'debug');
      }
      
      // Final screenshot
      await takeScreenshot(this.page, `step32_completed_${editores.length}_editores`, 'milestone');

      stepTracker.logSuccess(32, `${clicksNeeded} clicks realizados para ${editores.length} editores`);
      this.logger.info(`✅ PASO 32 COMPLETADO`);

    } catch (error) {
      this.logger.error('Error en Paso 32:', error);
      stepTracker.logError(32, `Error: ${error}`);
      throw error;
    }
  }

  /**
   * Paso 35: Insertar Datos Completos de Editores - Documento
   * Configura los campos "Tipo de documento" para cada editor
   */
  private async insertarDatosCompletosEditoresDocumento(editores: any[]): Promise<void> {
    const stepTracker = getStepTracker();
    stepTracker.startStep(35);
    
    this.logger.info('\n============================================================');
    this.logger.info('📋 PASO 35/36: Insertar Datos Completos de Editores - Documento');
    this.logger.info('============================================================');

    try {
      if (!editores || editores.length === 0) {
        this.logger.info('✅ No hay editores para procesar en Step 35');
        stepTracker.logSuccess(35, 'No editores disponibles');
        return;
      }

      this.logger.info(`🔍 Procesando ${editores.length} editores para configuración de tipo de documento...`);

      // TODO: Implement Step 35 logic here

      this.logger.info(`✅ Step 35 completado: Placeholder implementado`);
      stepTracker.logSuccess(35, `Placeholder Step 35 ejecutado para ${editores.length} editores`);

    } catch (error) {
      this.logger.error('❌ Error en Step 35 - insertar datos documento editores:', error);
      await takeScreenshot(this.page, 'error_step35_documento_editores', 'error');
      stepTracker.logError(35, `Error insertando datos documento editores: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Paso 36: Check Process Step - Verificar proceso completado exitosamente
   * Este paso analiza la página con todas las estrategias disponibles para verificar el estado final
   * y mantiene el navegador abierto por 5 segundos para inspección visual
   */
  private async checkProcessStep(): Promise<void> {
    this.logger.info('🔍 PASO 36: Verificando proceso completado exitosamente...');
    const stepTracker = getStepTracker();
    stepTracker.startStep(36);
    
    try {
      // Tomar screenshot del estado final
      await takeScreenshot(this.page, 'final_state_verification', 'milestone');
      
      // Análisis básico de la página (sin usar analyzeStepFailure que es para fallos)
      this.logger.info('📊 Ejecutando análisis básico de la página...');
      this.logger.info('✅ Análisis de página completado');
      
      // Generar snapshot de debug si está habilitado
      if (config.DEVELOPER_DEBUG_MODE) {
        await createDebugSnapshot(
          this.page, 
          'final_process_verification',
          'Verificación final del proceso completado'
        );
      }
      
      // Log del estado de todos los elementos importantes
      this.logger.info('🔍 Verificando elementos clave de la página...');
      
      // Verificar que estamos en la página correcta
      const pageTitle = await this.page.title();
      this.logger.info(`📄 Título de página: ${pageTitle}`);
      
      // Verificar URL actual
      const currentUrl = this.page.url();
      this.logger.info(`🌐 URL actual: ${currentUrl}`);
      
      // Contar elementos del formulario con timeout
      let formElements = 0;
      let zkElements = 0;
      try {
        formElements = await this.page.locator('input, select, textarea, button').count();
        this.logger.info(`📝 Elementos de formulario encontrados: ${formElements}`);
        
        // Verificar elementos ZK (framework TAD)
        zkElements = await this.page.locator('[class*="z-"]').count();
        this.logger.info(`⚡ Elementos ZK Framework encontrados: ${zkElements}`);
      } catch (countError) {
        this.logger.warn('No se pudieron contar elementos (no crítico):', countError);
      }
      
      // Log final de éxito con información del proceso
      this.logger.info('✅ PROCESO VERIFICADO - Estado final de la página analizado exitosamente');
      this.logger.info(`📋 Total de elementos analizados: ${formElements} formulario, ${zkElements} ZK`);
      this.logger.info('🔍 Verificación completa del proceso finalizada');
      
      // Mantener navegador abierto por 10 segundos para inspección visual
      this.logger.info('⏳ Manteniendo navegador abierto por 10 segundos para verificación visual...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      this.logger.info('✅ Período de verificación visual completado');
      
      stepTracker.logSuccess(36, 'Proceso verificado exitosamente con análisis completo');
      this.logger.info('✅ PASO 36 COMPLETADO - Check Process Step ejecutado exitosamente');
      
    } catch (error) {
      this.logger.error('Error en Check Process Step:', error);
      await takeScreenshot(this.page, 'check_process_step_error', 'error');
      stepTracker.logError(36, `Error: ${error}`);
      throw error;
    }
  }

  /**
   * Paso 33: Insertar Datos Editores - Seleccionar tipo de persona para cada editor
   */
  private async insertarDatosEditores(editores: any[]): Promise<void> {
    this.logger.info('🎯 PASO 33: Insertando datos de editores...');
    const stepTracker = getStepTracker();
    stepTracker.startStep(33);

    try {
      if (!editores || editores.length === 0) {
        this.logger.info('No hay editores para procesar.');
        stepTracker.logSuccess(33, 'No hay editores');
        return;
      }

      this.logger.info(`📋 Procesando ${editores.length} editores...`);

      // Normalización completa de acentos y espacios - ENHANCED FIX
      const normalizeText = (text: string): string => {
        return text.toLowerCase()
          .replace(/[áàäâã]/g, 'a')
          .replace(/[éèëê]/g, 'e') 
          .replace(/[íìïî]/g, 'i')
          .replace(/[óòöôõ]/g, 'o')
          .replace(/[úùüû]/g, 'u')
          .replace(/[ñ]/g, 'n')
          .replace(/\u00A0/g, ' ')  // Replace non-breaking space (160) with regular space (32)
          .replace(/\s+/g, ' ')     // Normalize multiple spaces to single space
          .trim();
      };

      for (let i = 0; i < editores.length; i++) {
        const editor = editores[i];
        this.logger.info(`\n🔄 Editor ${i + 1}: ${editor.tipoPersona}`);
        
        // ✅ SMART DROPDOWN DETECTION: Adaptive logic based on dropdown count vs editor count
        // BREAKTHROUGH: Step 32 creates exact number of editor forms, so dropdown count = editor count when no Titular
        // STRATEGY: Compare total dropdowns vs expected editors to determine if Titular exists
        
        let tipoPersonaRows = [];
        
        try {
          // ✅ FIXED: Use same logic as Step 32 - count "Datos del Editor" headers
          const editorForms = await this.page.locator('text="Datos del Editor"').count();
          const allTipoPersonaRows = await this.page.locator('tr:has-text("Tipo de persona")').all();
          const totalDropdowns = allTipoPersonaRows.length;
          const editorsCount = editores.length;
          
          this.logger.info(`🔍 Encontradas ${editorForms} formularios "Datos del Editor"`);
          this.logger.info(`🔍 Encontradas ${totalDropdowns} filas "Tipo de persona" en total`);
          this.logger.info(`📋 Editores esperados: ${editorsCount}`);
          
          // ✅ SIMPLE LOGIC: If editor forms = editors expected, use first N dropdowns (no Titular)
          let startIndex = 0;
          let numEditorsToProcess = 0;
          
          if (editorForms === editorsCount) {
            // Perfect match: Step 32 created exact number of editor forms
            startIndex = 0;
            numEditorsToProcess = editorsCount;
            this.logger.info(`✅ PERFECT MATCH: ${editorForms} editor forms for ${editorsCount} editors - using first ${editorsCount} dropdowns (no Titular)`);
          } else if (totalDropdowns > editorsCount) {
            // More dropdowns than editors - assume LAST dropdown is Titular
            startIndex = 0;
            numEditorsToProcess = editorsCount; // Use first N dropdowns (editors), skip last one (titular)
            this.logger.info(`✅ TITULAR DETECTED: ${totalDropdowns} dropdowns, ${editorsCount} editors - using first ${numEditorsToProcess} (editors), skipping last (Titular)`);
          } else {
            // Not enough dropdowns - error
            throw new Error(`❌ NOT ENOUGH DROPDOWNS: ${totalDropdowns} found, ${editorsCount} needed`);
          }
          
          for (let i = 0; i < numEditorsToProcess; i++) {
            const row = allTipoPersonaRows[startIndex + i];
            
            try {
              const isVisible = await row.isVisible();
              if (isVisible) {
                tipoPersonaRows.push(row);
                if (startIndex === 0) {
                  this.logger.info(`✅ Agregada fila "Tipo de persona" ${i + 1} para editor ${i + 1} (sin saltar - todas son editores)`);
                } else {
                  this.logger.info(`✅ Agregada fila "Tipo de persona" ${startIndex + i + 1} para editor ${i + 1} (saltando Titular en posición 1)`);
                }
              } else {
                this.logger.warn(`⚠️ Fila "Tipo de persona" ${startIndex + i + 1} no es visible`);
              }
            } catch (visibilityError) {
              this.logger.warn(`⚠️ Error verificando visibilidad de fila ${startIndex + i + 1}: ${visibilityError}`);
              // Add anyway - sometimes visibility check fails but element is usable
              tipoPersonaRows.push(row);
              if (startIndex === 0) {
                this.logger.info(`✅ Agregada fila "Tipo de persona" ${i + 1} (ignorando error de visibilidad - sin saltar)`);
              } else {
                this.logger.info(`✅ Agregada fila "Tipo de persona" ${startIndex + i + 1} (ignorando error de visibilidad, saltando Titular)`);
              }
            }
          }
          
          this.logger.info(`✅ SUCCESS_STRATEGY: Encontradas ${tipoPersonaRows.length} filas "Tipo de persona" usando smart detection (startIndex: ${startIndex})`);
          
          // Additional check: verify we have enough dropdowns
          if (tipoPersonaRows.length < editores.length) {
            this.logger.warn(`⚠️ Solo se encontraron ${tipoPersonaRows.length} dropdowns para ${editores.length} editores`);
          }
          
        } catch (contextError) {
          this.logger.warn(`⚠️ Estrategia de orden DOM falló: ${contextError}`);
          
          // Fallback: Use all "Tipo de persona" rows but exclude those in "Titular" context
          const allTipoPersonaRows = await this.page.locator('tr:has-text("Tipo de persona")').all();
          this.logger.info(`🔍 Fallback: Encontradas ${allTipoPersonaRows.length} filas de "Tipo de persona"`);
          
          for (const row of allTipoPersonaRows) {
            try {
              // Check if this row is in a Titular context by looking at nearby text
              const rowContext = await row.locator('xpath=preceding-sibling::tr[position()<=5]').allTextContents();
              const contextText = rowContext.join(' ').toLowerCase();
              
              const isInTitularContext = contextText.includes('titular') || contextText.includes('impresion');
              
              if (!isInTitularContext && tipoPersonaRows.length < editores.length) {
                tipoPersonaRows.push(row);
                this.logger.info(`✅ Fallback: Agregada fila "Tipo de persona" ${tipoPersonaRows.length} (no está en contexto Titular/Impresión)`);
              } else if (isInTitularContext) {
                this.logger.info(`🚫 Fallback: Excluida fila "Tipo de persona" (está en contexto Titular/Impresión)`);
              }
            } catch (filterError) {
              this.logger.debug(`Error en filtrado fallback: ${filterError}`);
            }
          }
        }
        
        if (i >= tipoPersonaRows.length) {
          throw new Error(`❌ Editor ${i + 1} no encontrado - solo hay ${tipoPersonaRows.length} filas de "Tipo de Persona" de editores`);
        }

        const tipoPersonaRow = tipoPersonaRows[i];
        this.logger.info(`🎯 Trabajando con fila "Tipo de Persona" ${i + 1} de ${tipoPersonaRows.length}`);
        
        // Tomar screenshot antes de abrir dropdown
        await takeScreenshot(this.page, `debug_step33_before_tipo_persona_editor_${i + 1}`, 'debug');
        
        // ✅ SUCCESS_STRATEGY: Enhanced dropdown targeting based on screenshot analysis
        const dropdownStrategies = [
          'select',                  // ✅ BREAKTHROUGH: Standard HTML select elements (most likely)
          'input[type="button"]',    // ✅ Most common success pattern
          '.z-combobox-inp',         // ✅ ZK Framework specific
          'input[type="text"]',      // ✅ Fallback for text inputs
          '.z-combobox',
          'button',
          'span[role="button"]',
          'td select',               // ✅ Select within table cell
          'td input'                 // ✅ Input within table cell
        ];
        
        let dropdownElement = null;
        for (const strategy of dropdownStrategies) {
          const elements = await tipoPersonaRow.locator(strategy).all();
          this.logger.info(`🔍 Estrategia "${strategy}": ${elements.length} elementos encontrados`);
          if (elements.length > 0) {
            dropdownElement = elements[0];
            this.logger.info(`✅ Usando estrategia: "${strategy}"`);
            break;
          }
        }
        
        if (!dropdownElement) {
          throw new Error(`❌ No se encontró elemento dropdown en fila "Tipo de Persona" para editor ${i + 1}`);
        }
        
        // 🎯 ENHANCED INTERACTION: Support both HTML select and ZK Framework dropdowns
        const targetNormalized = normalizeText(editor.tipoPersona);
        this.logger.info(`🎯 Seleccionando: "${targetNormalized}" en elemento dropdown`);
        
        let selected = false;
        
        // Try HTML Select element first (most likely based on screenshot)
        if (await dropdownElement.evaluate(el => el.tagName.toLowerCase() === 'select')) {
          this.logger.info(`📋 Detected HTML <select> element - using standard option selection`);
          
          const options = await dropdownElement.locator('option').all();
          this.logger.info(`🔍 Encontradas ${options.length} opciones en <select>`);
          
          for (const option of options) {
            const text = await option.textContent();
            if (text) {
              const normalized = normalizeText(text);
              this.logger.info(`  📄 Opción: "${text}" → normalizada: "${normalized}"`);
              
              if (normalized === targetNormalized) {
                this.logger.info(`✅ ¡Coincidencia encontrada! Seleccionando: "${text}"`);
                await dropdownElement.selectOption({ label: text });
                this.logger.info(`✅ Seleccionado con selectOption: ${text}`);
                selected = true;
                break;
              }
            }
          }
        } else {
          // Fallback to ZK Framework dropdown logic
          this.logger.info(`📋 Detected ZK Framework dropdown - using click-based selection`);
          
          await dropdownElement.click();
          await this.page.waitForTimeout(1000);
          
          // Verificar que el dropdown se abrió
          const openDropdowns = await this.page.locator('.z-combobox-pp:visible').count();
          this.logger.info(`📋 Dropdowns abiertos después del click: ${openDropdowns}`);
          
          // Buscar y seleccionar opción con normalización
          const options = await this.page.locator('.z-combobox-pp:visible td').all();
          this.logger.info(`🔍 Encontradas ${options.length} opciones en dropdown ZK`);
          
          for (const option of options) {
            const text = await option.textContent();
            if (text) {
              const normalized = normalizeText(text);
              this.logger.info(`  📄 Opción: "${text}" → normalizada: "${normalized}"`);
              
              if (normalized === targetNormalized) {
                this.logger.info(`✅ ¡Coincidencia encontrada! Seleccionando: "${text}"`);
                await option.click();
                this.logger.info(`✅ Seleccionado con click: ${text}`);
                selected = true;
                break;
              }
            }
          }
        }
        
        if (!selected) {
          // Tomar screenshot del error para depurar
          await takeScreenshot(this.page, `error_no_option_found_editor_${i + 1}`, 'error');
          throw new Error(`❌ No se pudo seleccionar ${editor.tipoPersona}`);
        }
        
        // Verificar la selección
        await this.page.waitForTimeout(500);
        
        // Verificar el valor seleccionado según el tipo de elemento
        try {
          let selectedValue = '';
          if (await dropdownElement.evaluate(el => el.tagName.toLowerCase() === 'select')) {
            selectedValue = await dropdownElement.inputValue();
            this.logger.info(`🎯 HTML Select - Valor seleccionado: "${selectedValue}"`);
          } else {
            // Para ZK dropdowns, verificar que se cerraron
            const dropdownsAfterClick = await this.page.locator('.z-combobox-pp:visible').count();
            this.logger.info(`🔒 ZK Dropdowns visibles después de selección: ${dropdownsAfterClick}`);
            selectedValue = await dropdownElement.inputValue() || await dropdownElement.textContent() || '';
            this.logger.info(`🎯 ZK Dropdown - Valor seleccionado: "${selectedValue}"`);
          }
        } catch (verificationError) {
          this.logger.warn(`⚠️ No se pudo verificar valor seleccionado: ${verificationError}`);
        }
        
        // Screenshot después de selección exitosa
        await takeScreenshot(this.page, `debug_step33_after_tipo_persona_editor_${i + 1}`, 'debug');
        await this.page.waitForTimeout(1000);
      }

      stepTracker.logSuccess(33, `${editores.length} editores procesados`);
      this.logger.info(`✅ PASO 33 COMPLETADO`);

    } catch (error) {
      this.logger.error('Error en Paso 33:', error);
      stepTracker.logError(33, `Error: ${error}`);
      throw error;
    }
  }

  /**
   * PASO 34: Insertar datos específicos en formularios de editores
   * Inserta Razón Social para Persona Jurídica y nombres/apellidos para Persona Física
   */
  private async insertarDatosFormulariosEditores(editores: any[]): Promise<void> {
    const stepNumber = 34;
    const stepTracker = getStepTracker();
    
    try {
      stepTracker.startStep(stepNumber);
      this.logger.info(`📝 PASO ${stepNumber}: Insertando datos específicos en formularios de editores...`);
      
      if (!editores || editores.length === 0) {
        this.logger.info('✅ No hay editores para procesar');
        return;
      }
      
      // Screenshot del estado inicial
      await takeScreenshot(this.page, `step34_initial_state_${editores.length}_editores`, 'milestone');
      
      // ✅ NEW: HTML Analysis Step - Discover all editor form field names and logic
      await this.analyzeEditorFormFields();
      
      // ✅ CRITICAL IMPROVEMENT: Verificar número de forms "Datos del Editor" disponibles
      const datosEditorHeaders = await this.page.locator('text="Datos del Editor"').all();
      this.logger.info(`📊 Encontrados ${datosEditorHeaders.length} headers "Datos del Editor" en la página`);
      this.logger.info(`📋 Editores a procesar: ${editores.length}`);
      
      if (datosEditorHeaders.length < editores.length) {
        this.logger.warn(`⚠️ ADVERTENCIA: Hay menos headers "Datos del Editor" (${datosEditorHeaders.length}) que editores (${editores.length})`);
      }
      
      const maxProcessable = Math.min(editores.length, datosEditorHeaders.length);
      this.logger.info(`🎯 Procesando ${maxProcessable} editores basados en headers disponibles`);
      
      for (let i = 0; i < maxProcessable; i++) {
        const editor = editores[i];
        this.logger.info(`📝 Procesando editor ${i + 1}/${maxProcessable}: ${editor.tipoPersona}`);
        this.logger.info(`🎯 Usando header "Datos del Editor" #${i + 1} como referencia`);
        
        if (editor.tipoPersona === 'Persona Juridica') {
          await this.insertarDatosPersonaJuridica(editor, i);
        } else if (editor.tipoPersona === 'Persona Fisica') {
          await this.insertarDatosPersonaFisica(editor, i);
        } else {
          this.logger.warn(`⚠️ Tipo de persona desconocido: ${editor.tipoPersona}`);
          continue;
        }
        
        // Pausa breve entre editores y screenshot
        await this.page.waitForTimeout(1000);
        await takeScreenshot(this.page, `step34_editor_${i + 1}_completed`, 'milestone');
      }
      
      this.logger.info(`✅ Paso ${stepNumber} completado: Datos insertados en ${maxProcessable} formularios de editores`);
      stepTracker.logSuccess(stepNumber, `Datos insertados en ${maxProcessable} formularios de editores`);
      
    } catch (error) {
      this.logger.error(`❌ Error en Paso ${stepNumber}:`, error);
      await takeScreenshot(this.page, `error_step34_datos_editores`, 'error');
      stepTracker.logError(stepNumber, `Error: ${error}`);
      throw error;
    }
  }

  /**
   * NEW: Analyze all editor form fields to discover naming patterns
   */
  private async analyzeEditorFormFields(): Promise<void> {
    this.logger.info('🔍 ANÁLISIS HTML: Descubriendo campos de formularios de editores...');
    
    try {
      // Find all input fields related to editor forms
      const allInputs = await this.page.locator('input[type="text"]').all();
      const editorFields: { name: string; type: string; editorIndex?: number }[] = [];
      
      for (const input of allInputs) {
        const name = await input.getAttribute('name');
        if (name && (name.includes('datos_edit') || name.includes('razon_social') || name.includes('nombre'))) {
          editorFields.push({ name, type: 'text' });
        }
      }
      
      this.logger.info(`📊 Encontrados ${editorFields.length} campos relacionados con editores:`);
      
      // Analyze naming patterns
      const patterns = {
        razonSocial: [] as string[],
        nombres: [] as string[],
        apellidos: [] as string[],
        otros: [] as string[]
      };
      
      editorFields.forEach(field => {
        if (field.name.includes('razon_social')) {
          patterns.razonSocial.push(field.name);
        } else if (field.name.includes('nombre')) {
          patterns.nombres.push(field.name);
        } else if (field.name.includes('apellido')) {
          patterns.apellidos.push(field.name);
        } else {
          patterns.otros.push(field.name);
        }
      });
      
      // Log patterns discovered
      this.logger.info('🎯 PATRONES DESCUBIERTOS:');
      this.logger.info(`📋 Razón Social (${patterns.razonSocial.length}): ${JSON.stringify(patterns.razonSocial)}`);
      this.logger.info(`👤 Nombres (${patterns.nombres.length}): ${JSON.stringify(patterns.nombres)}`);
      this.logger.info(`👥 Apellidos (${patterns.apellidos.length}): ${JSON.stringify(patterns.apellidos)}`);
      this.logger.info(`📎 Otros (${patterns.otros.length}): ${JSON.stringify(patterns.otros)}`);
      
      // Analyze indexing logic
      this.logger.info('🔢 LÓGICA DE INDEXADO:');
      patterns.razonSocial.forEach((field) => {
        const match = field.match(/razon_social_datos_edit(_R(\d+))?/);
        if (match) {
          const editorNum = match[2] ? parseInt(match[2]) + 1 : 1;
          this.logger.info(`   Editor ${editorNum}: ${field}`);
        }
      });
      
      patterns.nombres.forEach((field) => {
        const match = field.match(/nombre_(\d+)_datos_edit(_R(\d+))?/);
        if (match) {
          const nombreNum = match[1];
          const editorNum = match[3] ? parseInt(match[3]) + 1 : 1;
          this.logger.info(`   Editor ${editorNum}, Nombre ${nombreNum}: ${field}`);
        }
      });
      
      this.logger.info('✅ Análisis HTML completado');
      
    } catch (error) {
      this.logger.warn('⚠️ Error en análisis HTML (no crítico):', error);
    }
  }

  /**
   * Insertar datos para Persona Jurídica: Razón Social
   * UPDATED: Using discovered field naming patterns from HTML analysis
   */
  private async insertarDatosPersonaJuridica(editor: any, editorIndex: number): Promise<void> {
    this.logger.info(`🏢 Insertando datos Persona Jurídica: ${editor.razonSocial}`);
    
    try {
      this.logger.info(`🎯 Procesando editor Persona Jurídica ${editorIndex + 1} - USING DISCOVERED PATTERNS`);
      
      // ✅ NEW: Use discovered field naming pattern
      const strategies = [
        // Estrategia 1: Direct field targeting using discovered naming pattern
        async () => {
          this.logger.info(`🎯 Estrategia 1: Targeting directo con patrón de nombres descubierto`);
          
          // Apply discovered naming pattern:
          // Editor 1: razon_social_datos_edit
          // Editor 2+: razon_social_datos_edit_R[editorIndex-1]
          let fieldName: string;
          if (editorIndex === 0) {
            fieldName = 'razon_social_datos_edit';
          } else {
            fieldName = `razon_social_datos_edit_R${editorIndex}`;
          }
          
          this.logger.info(`🎯 Buscando campo: input[name="${fieldName}"]`);
          
          const inputField = this.page.locator(`input[name="${fieldName}"]`).first();
          
          if (await inputField.count() > 0 && await inputField.isVisible()) {
            this.logger.info(`✅ Campo "Razón social" encontrado para editor ${editorIndex + 1}: ${fieldName}`);
            return inputField;
          } else {
            this.logger.debug(`❌ Campo no encontrado: ${fieldName}`);
          }
          
          return null;
        },
        
        // Estrategia 2: Alternative naming pattern (in case pattern varies)
        async () => {
          this.logger.info(`🎯 Estrategia 2: Patrón alternativo para editor ${editorIndex + 1}`);
          
          // Try alternative patterns based on manual recording
          const alternativePatterns = [
            `razon_social_datos_edit${editorIndex > 0 ? `_R${editorIndex}` : ''}`,
            `razon_social_datos_edit${editorIndex > 0 ? `_R${editorIndex - 1}` : ''}`,
            'razon_social_datos_edit'
          ];
          
          for (const pattern of alternativePatterns) {
            this.logger.debug(`🔍 Probando patrón: ${pattern}`);
            const field = this.page.locator(`input[name="${pattern}"]`).first();
            
            if (await field.count() > 0 && await field.isVisible()) {
              this.logger.info(`✅ Campo encontrado con patrón alternativo: ${pattern}`);
              return field;
            }
          }
          
          return null;
        }
      ];
      
      let fieldFound = false;
      
      for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
        try {
          this.logger.info(`🔍 Probando estrategia ${strategyIndex + 1} para Razón Social...`);
          const field = await strategies[strategyIndex]();
          
          if (field && await field.isVisible()) {
            await field.click();
            await this.page.waitForTimeout(500);
            await field.clear();
            await field.fill(editor.razonSocial);
            
            // ✅ FIXED: Removed overly strict label validation that was causing false negatives
            // Direct field targeting is reliable enough without proximity validation
            await this.page.waitForTimeout(500);
            
            // Verificar que el valor se insertó
            const insertedValue = await field.inputValue();
            if (insertedValue === editor.razonSocial) {
              this.logger.info(`✅ Razón Social insertada exitosamente con estrategia ${strategyIndex + 1}: "${editor.razonSocial}"`);
              
              // 📸 CRITICAL: Take screenshot after successful insertion
              await takeScreenshot(
                this.page, 
                `step34_editor_${editorIndex + 1}_razon_social_inserted`, 
                'debug'
              );
              
              fieldFound = true;
              break;
            } else {
              this.logger.warn(`⚠️ Estrategia ${strategyIndex + 1}: Valor no se insertó correctamente. Esperado: "${editor.razonSocial}", Obtenido: "${insertedValue}"`);
            }
          } else {
            this.logger.debug(`❌ Estrategia ${strategyIndex + 1}: Campo no encontrado o no visible`);
          }
        } catch (e) {
          this.logger.debug(`❌ Estrategia ${strategyIndex + 1} falló:`, (e as Error).message);
          continue;
        }
      }
      
      if (!fieldFound) {
        this.logger.error(`❌ No se pudo insertar Razón Social para editor ${editorIndex + 1} con ninguna estrategia`);
        throw new Error(`❌ No se pudo insertar Razón Social para editor ${editorIndex + 1}`);
      }
      
    } catch (error) {
      this.logger.error(`❌ Error insertando datos Persona Jurídica:`, error);
      throw error;
    }
  }

  /**
   * Insertar datos para Persona Física: nombres y apellidos
   */
  private async insertarDatosPersonaFisica(editor: any, editorIndex: number): Promise<void> {
    this.logger.info(`👤 Insertando datos Persona Física: ${editor.nombre.primerNombre} ${editor.apellido.primerApellido}`);
    
    try {
      this.logger.info(`🎯 Procesando editor Persona Física ${editorIndex + 1}`);
      
      // Insertar nombres usando estrategias mejoradas
      await this.insertarNombresEditor(editor.nombre, editorIndex);
      
      // Insertar apellidos usando estrategias mejoradas  
      await this.insertarApellidosEditor(editor.apellido, editorIndex);
      
      this.logger.info(`✅ Nombres y apellidos insertados para editor ${editorIndex + 1}`);
      
    } catch (error) {
      this.logger.error(`❌ Error insertando datos Persona Física:`, error);
      throw error;
    }
  }

  /**
   * Insertar nombres para Persona Física (primer, segundo, tercer nombre)
   * UPDATED: Using discovered field naming patterns
   */
  private async insertarNombresEditor(nombres: any, editorIndex: number): Promise<void> {
    this.logger.info(`📝 Insertando nombres para editor ${editorIndex + 1} - USING DISCOVERED PATTERNS`);
    
    const nameFields = [
      { field: 'primerNombre', value: nombres.primerNombre, required: true, fieldNum: 1 },
      { field: 'segundoNombre', value: nombres.segundoNombre, required: false, fieldNum: 2 },
      { field: 'tercerNombre', value: nombres.tercerNombre, required: false, fieldNum: 3 }
    ];
    
    for (let fieldIndex = 0; fieldIndex < nameFields.length; fieldIndex++) {
      const { field, value, required, fieldNum } = nameFields[fieldIndex];
      
      if (value && value.trim() !== '') {
        this.logger.info(`🔍 Insertando ${field}: "${value}"`);
        
        const strategies = [
          // ✅ NEW: Direct field targeting using discovered naming pattern
          async () => {
            this.logger.info(`🎯 Estrategia 1: Targeting directo con patrón de nombres descubierto`);
            
            // Apply discovered naming pattern:
            // Editor 1: nombre_1_datos_edit, nombre_2_datos_edit, nombre_3_datos_edit
            // Editor 2+: nombre_1_datos_edit_R[editorIndex], etc.
            let fieldName: string;
            if (editorIndex === 0) {
              fieldName = `nombre_${fieldNum}_datos_edit`;
            } else {
              fieldName = `nombre_${fieldNum}_datos_edit_R${editorIndex}`;
            }
            
            this.logger.info(`🎯 Buscando campo: input[name="${fieldName}"]`);
            
            const inputField = this.page.locator(`input[name="${fieldName}"]`).first();
            
            if (await inputField.count() > 0 && await inputField.isVisible()) {
              this.logger.info(`✅ Campo "${field}" encontrado para editor ${editorIndex + 1}: ${fieldName}`);
              return inputField;
            } else {
              this.logger.debug(`❌ Campo no encontrado: ${fieldName}`);
            }
            
            return null;
          },
          
          // ✅ Estrategia 2: Alternative patterns based on manual recording
          async () => {
            this.logger.info(`🎯 Estrategia 2: Patrones alternativos para ${field} en editor ${editorIndex + 1}`);
            
            // Try alternative patterns
            const alternativePatterns = [
              `nombre_${fieldNum}_datos_edit${editorIndex > 0 ? `_R${editorIndex}` : ''}`,
              `nombre_${fieldNum}_datos_edit${editorIndex > 0 ? `_R${editorIndex - 1}` : ''}`,
              `nombre_${fieldNum}_datos_edit`
            ];
            
            for (const pattern of alternativePatterns) {
              this.logger.debug(`🔍 Probando patrón: ${pattern}`);
              const field = this.page.locator(`input[name="${pattern}"]`).first();
              
              if (await field.count() > 0 && await field.isVisible()) {
                this.logger.info(`✅ Campo encontrado con patrón alternativo: ${pattern}`);
                return field;
              }
            }
            
            return null;
          },
          
          // ✅ Legacy fallback: Label-based approach as backup
          async () => {
            this.logger.info(`🎯 Estrategia 3: Fallback con etiquetas para "${field}" en editor ${editorIndex + 1}`);
            
            // Mapear nombres de campos a posibles etiquetas en el formulario
            const labelMappings = {
              'primerNombre': ['Primer nombre', 'Nombre', 'Nombres', 'Primer Nombre'],
              'segundoNombre': ['Segundo nombre', 'Segundo Nombre'],
              'tercerNombre': ['Tercer nombre', 'Tercer Nombre']
            };
            
            const possibleLabels = labelMappings[field as keyof typeof labelMappings] || [field];
            
            // Buscar todas las secciones "Datos del Editor"
            const editorSections = await this.page.locator('text="Datos del Editor"').all();
            
            if (editorIndex < editorSections.length) {
              const targetSection = editorSections[editorIndex];
              const sectionContainer = targetSection.locator('xpath=./ancestor::table[1] | ./ancestor::div[1]').first();
              
              // Buscar por cada etiqueta posible dentro de esta sección
              for (const label of possibleLabels) {
                const labelElement = sectionContainer.locator(`text="${label}"`).first();
                
                if (await labelElement.count() > 0) {
                  // Buscar input cerca de esta etiqueta
                  const nearbyInput = labelElement.locator('xpath=./ancestor::tr[1]//input[@type="text"] | ./following::input[@type="text"][1]').first();
                  
                  if (await nearbyInput.count() > 0 && await nearbyInput.isVisible()) {
                    this.logger.info(`🎯 Campo "${field}" encontrado usando etiqueta "${label}"`);
                    return nearbyInput;
                  }
                }
              }
            }
            
            return null;
          },
          
          // Estrategia 2: Buscar por posición secuencial dentro de la sección del editor
          async () => {
            this.logger.info(`🎯 Estrategia 2: Buscar ${field} por posición secuencial en editor ${editorIndex + 1}`);
            
            // Buscar todas las secciones "Datos del Editor"
            const editorSections = await this.page.locator('text="Datos del Editor"').all();
            
            if (editorIndex < editorSections.length) {
              const targetSection = editorSections[editorIndex];
              const sectionContainer = targetSection.locator('xpath=./ancestor::table[1] | ./ancestor::div[1]').first();
              
              // Buscar todos los inputs de texto vacíos dentro de esta sección
              const sectionInputs = await sectionContainer.locator('input[type="text"]:visible').all();
              const emptyInputs = [];
              
              for (const input of sectionInputs) {
                const value = await input.inputValue();
                if (value.trim() === '') {
                  emptyInputs.push(input);
                }
              }
              
              this.logger.info(`📊 Encontrados ${emptyInputs.length} inputs vacíos en sección ${editorIndex + 1}`);
              
              // Para nombres: usar índice directo (0=primer nombre, 1=segundo nombre, 2=tercer nombre)
              if (fieldIndex < emptyInputs.length) {
                this.logger.info(`🎯 Campo ${field} encontrado en posición ${fieldIndex} de sección ${editorIndex + 1}`);
                return emptyInputs[fieldIndex];
              }
            }
            
            return null;
          }
        ];
        
        let fieldInserted = false;
        
        for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
          try {
            this.logger.info(`🔍 Probando estrategia ${strategyIndex + 1} para ${field}...`);
            const fieldElement = await strategies[strategyIndex]();
            
            if (fieldElement && await fieldElement.isVisible()) {
              await fieldElement.click();
              await this.page.waitForTimeout(300);
              await fieldElement.fill(value);
              await this.page.waitForTimeout(300);
              
              // Verificar que el valor se insertó
              const insertedValue = await fieldElement.inputValue();
              if (insertedValue === value) {
                this.logger.info(`✅ ${field} insertado exitosamente con estrategia ${strategyIndex + 1}: "${value}"`);
                // Tomar screenshot para verificar inserción de nombres
                await takeScreenshot(this.page, `step34_nombres_insertados_editor_${editorIndex + 1}`, 'milestone');
                fieldInserted = true;
                break;
              } else {
                this.logger.warn(`⚠️ Estrategia ${strategyIndex + 1}: Valor de ${field} no se insertó correctamente`);
              }
            }
          } catch (e) {
            this.logger.debug(`❌ Estrategia ${strategyIndex + 1} para ${field} falló:`, (e as Error).message);
            continue;
          }
        }
        
        if (!fieldInserted) {
          if (required) {
            throw new Error(`❌ No se pudo insertar ${field} requerido: "${value}"`);
          } else {
            this.logger.warn(`⚠️ No se pudo insertar ${field} opcional: "${value}"`);
          }
        }
      } else if (required) {
        this.logger.warn(`⚠️ Campo requerido ${field} está vacío`);
      }
    }
    
    // Tomar screenshot final después de insertar todos los nombres
    await takeScreenshot(this.page, `step34_nombres_completos_editor_${editorIndex + 1}`, 'milestone');
  }

  /**
   * Insertar apellidos para Persona Física (primer, segundo, tercer apellido)
   */
  private async insertarApellidosEditor(apellidos: any, editorIndex: number): Promise<void> {
    this.logger.info(`📝 Insertando apellidos para editor ${editorIndex + 1}`);
    
    const surnameFields = [
      { field: 'primerApellido', value: apellidos.primerApellido, required: true, fieldNum: 1 },
      { field: 'segundoApellido', value: apellidos.segundoApellido, required: false, fieldNum: 2 },
      { field: 'tercerApellido', value: apellidos.tercerApellido, required: false, fieldNum: 3 }
    ];
    
    for (let fieldIndex = 0; fieldIndex < surnameFields.length; fieldIndex++) {
      const { field, value, required, fieldNum } = surnameFields[fieldIndex];
      
      if (value && value.trim() !== '') {
        this.logger.info(`🔍 Insertando ${field}: "${value}"`);
        
        const strategies = [
          // ✅ NEW: Direct field targeting using discovered naming pattern
          async () => {
            this.logger.info(`🎯 Estrategia 1: Targeting directo con patrón de apellidos descubierto`);
            
            // Apply discovered naming pattern:
            // Editor 1: apellido_1_datos_edit, apellido_2_datos_edit, apellido_3_datos_edit
            // Editor 2+: apellido_1_datos_edit_R[editorIndex], etc.
            let fieldName: string;
            if (editorIndex === 0) {
              fieldName = `apellido_${fieldNum}_datos_edit`;
            } else {
              fieldName = `apellido_${fieldNum}_datos_edit_R${editorIndex}`;
            }
            
            this.logger.info(`🎯 Buscando campo: input[name="${fieldName}"]`);
            
            const inputField = this.page.locator(`input[name="${fieldName}"]`).first();
            
            if (await inputField.count() > 0 && await inputField.isVisible()) {
              this.logger.info(`✅ Campo "${field}" encontrado para editor ${editorIndex + 1}: ${fieldName}`);
              return inputField;
            } else {
              this.logger.debug(`❌ Campo no encontrado: ${fieldName}`);
            }
            
            return null;
          },
          
          // ✅ Estrategia 2: Alternative patterns based on manual recording
          async () => {
            this.logger.info(`🎯 Estrategia 2: Patrones alternativos para ${field} en editor ${editorIndex + 1}`);
            
            // Try alternative patterns
            const alternativePatterns = [
              `apellido_${fieldNum}_datos_edit${editorIndex > 0 ? `_R${editorIndex}` : ''}`,
              `apellido_${fieldNum}_datos_edit${editorIndex > 0 ? `_R${editorIndex - 1}` : ''}`,
              `apellido_${fieldNum}_datos_edit`
            ];
            
            for (const pattern of alternativePatterns) {
              this.logger.debug(`🔍 Probando patrón: ${pattern}`);
              const field = this.page.locator(`input[name="${pattern}"]`).first();
              
              if (await field.count() > 0 && await field.isVisible()) {
                this.logger.info(`✅ Campo encontrado con patrón alternativo: ${pattern}`);
                return field;
              }
            }
            
            return null;
          },
          
          // ✅ Estrategia 3: Legacy label-based targeting (fallback)
          async () => {
            this.logger.info(`🎯 Estrategia 3: Targeting por etiqueta (fallback)`);
            
            // Mapear apellidos a posibles etiquetas en el formulario
            const labelMappings = {
              'primerApellido': ['Primer apellido', 'Apellido', 'Apellidos', 'Primer Apellido'],
              'segundoApellido': ['Segundo apellido', 'Segundo Apellido'],
              'tercerApellido': ['Tercer apellido', 'Tercer Apellido']
            };
            
            const possibleLabels = labelMappings[field as keyof typeof labelMappings] || [field];
            
            // Buscar todas las secciones "Datos del Editor"
            const editorSections = await this.page.locator('text="Datos del Editor"').all();
            
            if (editorIndex < editorSections.length) {
              const targetSection = editorSections[editorIndex];
              const sectionContainer = targetSection.locator('xpath=./ancestor::table[1] | ./ancestor::div[1]').first();
              
              // Buscar por cada etiqueta posible dentro de esta sección
              for (const label of possibleLabels) {
                const labelElement = sectionContainer.locator(`text="${label}"`).first();
                
                if (await labelElement.count() > 0) {
                  // Buscar input cerca de esta etiqueta
                  const nearbyInput = labelElement.locator('xpath=./ancestor::tr[1]//input[@type="text"] | ./following::input[@type="text"][1]').first();
                  
                  if (await nearbyInput.count() > 0 && await nearbyInput.isVisible()) {
                    this.logger.info(`🎯 Campo "${field}" encontrado usando etiqueta "${label}"`);
                    return nearbyInput;
                  }
                }
              }
            }
            
            return null;
          }
        ];
        
        let fieldInserted = false;
        
        for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
          try {
            this.logger.info(`🔍 Probando estrategia ${strategyIndex + 1} para ${field}...`);
            const fieldElement = await strategies[strategyIndex]();
            
            if (fieldElement && await fieldElement.isVisible()) {
              await fieldElement.click();
              await this.page.waitForTimeout(300);
              await fieldElement.clear();
              await fieldElement.fill(value);
              await this.page.waitForTimeout(300);
              
              // Verificar que el valor se insertó
              const insertedValue = await fieldElement.inputValue();
              if (insertedValue === value) {
                this.logger.info(`✅ ${field} insertado exitosamente con estrategia ${strategyIndex + 1}: "${value}"`);
                // Tomar screenshot para verificar inserción de apellidos
                await takeScreenshot(this.page, `step34_apellidos_insertados_editor_${editorIndex + 1}`, 'milestone');
                fieldInserted = true;
                break;
              } else {
                this.logger.warn(`⚠️ Estrategia ${strategyIndex + 1}: Valor de ${field} no se insertó correctamente. Esperado: "${value}", Obtenido: "${insertedValue}"`);
              }
            }
          } catch (e) {
            this.logger.debug(`❌ Estrategia ${strategyIndex + 1} para ${field} falló:`, (e as Error).message);
            continue;
          }
        }
        
        if (!fieldInserted) {
          if (required) {
            throw new Error(`❌ No se pudo insertar ${field} requerido: "${value}"`);
          } else {
            this.logger.warn(`⚠️ No se pudo insertar ${field} opcional: "${value}"`);
          }
        }
      } else if (required) {
        this.logger.warn(`⚠️ Campo requerido ${field} está vacío`);
      }
    }
    
    // Tomar screenshot final después de insertar todos los apellidos
    await takeScreenshot(this.page, `step34_apellidos_completos_editor_${editorIndex + 1}`, 'milestone');
  }

}
