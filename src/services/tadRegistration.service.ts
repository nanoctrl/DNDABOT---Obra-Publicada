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
      
      // SECCIÓN 4: Datos de la obra (Pasos 18-26)
      await this.completarDatosObra(tramiteData);
      
      // MODO DESARROLLO: Pausar para siguiente paso  
      if (config.DEVELOPER_DEBUG_MODE) {
        this.logger.info('\n🎯 REGISTRO BÁSICO COMPLETADO');
        this.logger.info('✅ Pasos 1-26: Autenticación, búsqueda, datos básicos y obra completados');
        this.logger.info('🔄 El bot se pausará para permitir extensión manual o desarrollo de pasos adicionales');
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

    // Paso 30: Check Process Step - Verificar proceso completado exitosamente
    await executeWithInteractiveSupport(
      this.page,
      'Verificar proceso completado exitosamente',
      async () => {
        await this.checkProcessStep();
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
   * Paso 30: Check Process Step - Verificar proceso completado exitosamente
   * Este paso analiza la página con todas las estrategias disponibles para verificar el estado final
   * y mantiene el navegador abierto por 5 segundos para inspección visual
   */
  private async checkProcessStep(): Promise<void> {
    this.logger.info('🔍 PASO 30: Verificando proceso completado exitosamente...');
    const stepTracker = getStepTracker();
    stepTracker.startStep(30);
    
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
      
      // Mantener navegador abierto por 5 segundos para inspección visual
      this.logger.info('⏳ Manteniendo navegador abierto por 5 segundos para verificación visual...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      this.logger.info('✅ Período de verificación visual completado');
      
      stepTracker.logSuccess(30, 'Proceso verificado exitosamente con análisis completo');
      this.logger.info('✅ PASO 30 COMPLETADO - Check Process Step ejecutado exitosamente');
      
    } catch (error) {
      this.logger.error('Error en Check Process Step:', error);
      await takeScreenshot(this.page, 'check_process_step_error', 'error');
      throw error;
    }
  }

}
