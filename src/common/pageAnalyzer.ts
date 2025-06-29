import { Page } from 'playwright';
import { createLogger } from './logger';
import { takeScreenshot } from './screenshotManager';
import fs from 'fs/promises';
import path from 'path';

export interface ElementInfo {
  tag: string;
  id?: string;
  classes?: string[];
  text?: string;
  href?: string;
  value?: string;
  placeholder?: string;
  type?: string;
  name?: string;
  ariaLabel?: string;
  role?: string;
  dataTestId?: string;
  isVisible: boolean;
  isEnabled: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ContainerInfo {
  selector: string;
  description: string;
  elements: ElementInfo[];
}

export interface PageAnalysis {
  url: string;
  title: string;
  timestamp: string;
  containers: ContainerInfo[];
  forms: FormAnalysis[];
  navigation: NavigationAnalysis;
  interactiveElements: {
    buttons: ElementInfo[];
    links: ElementInfo[];
    inputs: ElementInfo[];
    selects: ElementInfo[];
  };
}

export interface FormAnalysis {
  selector: string;
  name?: string;
  action?: string;
  method?: string;
  fields: ElementInfo[];
}

export interface NavigationAnalysis {
  mainMenu?: ElementInfo[];
  breadcrumbs?: ElementInfo[];
  sidebar?: ElementInfo[];
}

const logger = createLogger('PageAnalyzer');

// Nueva función para análisis específico de depósito digital
export async function analyzeDepositoDigitalContext(page: Page, captureScreenshot: boolean = false): Promise<{
  section: ElementInfo | null;
  dropdownButtons: ElementInfo[];
  options: ElementInfo[];
  recommendedSelectors: string[];
  fullPageContext: string;
  screenshotPath?: string;
}> {
  const context = {
    section: null as ElementInfo | null,
    dropdownButtons: [] as ElementInfo[],
    options: [] as ElementInfo[],
    recommendedSelectors: [] as string[],
    fullPageContext: '',
    screenshotPath: undefined as string | undefined
  };

  try {
    // Solo log si no estamos en modo silencioso
    if (!captureScreenshot) {
      logger.info('🔍 Analizando contexto específico de depósito digital...');
    }
    
    // Capturar screenshot si se solicita (durante análisis de fallo)
    if (captureScreenshot) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotName = `deposito_context_analysis_${timestamp}`;
      await takeScreenshot(page, screenshotName, 'error');
      context.screenshotPath = `output/screenshots/error/${screenshotName}.png`;
    }
    
    // Obtener HTML completo para análisis
    context.fullPageContext = await page.content();
    
    // Buscar la sección de "Modo de depósito"
    const sectionSelectors = [
      'div:has-text("Modo de depósito")',
      'div:has-text("depósito")',
      'div:has-text("digitalmente")',
      '*:has-text("¿Usted opta por depositar")',
      'label:has-text("depósito")'
    ];

    for (const selector of sectionSelectors) {
      try {
        const elements = await page.locator(selector).all();
        for (const element of elements) {
          if (await element.isVisible()) {
            const info = await getElementInfo(element);
            if (info) {
              context.section = info;
              logger.info(`✅ Sección encontrada: ${selector}`);
              break;
            }
          }
        }
        if (context.section) break;
      } catch (error) {
        // Continuar con siguiente selector
      }
    }

    // Buscar botones de dropdown con múltiples estrategias
    const dropdownStrategies = [
      { name: 'Botones con ID que termina en -btn', selector: 'button[id$="-btn"]' },
      { name: 'Botones con clase dropdown', selector: 'button[class*="dropdown"]' },
      { name: 'Elementos con rol combobox', selector: '[role="combobox"]' },
      { name: 'Botones dentro de form-group', selector: '.form-group button' },
      { name: 'Botones cerca de texto depósito', selector: 'div:has-text("depósito") button' },
      { name: 'Cualquier botón visible', selector: 'button:visible' }
    ];

    for (const strategy of dropdownStrategies) {
      try {
        const elements = await page.locator(strategy.selector).all();
        if (!captureScreenshot) {
          logger.info(`🎯 Probando estrategia: ${strategy.name} - encontrados ${elements.length} elementos`);
        }
        
        for (const element of elements) {
          if (await element.isVisible()) {
            const info = await getElementInfo(element);
            if (info) {
              context.dropdownButtons.push(info);
              context.recommendedSelectors.push(`${strategy.selector} (${strategy.name})`);
              
              // Log detallado del botón encontrado solo si no es modo silencioso
              if (!captureScreenshot) {
                logger.info(`  📌 Botón: ${info.tag}${info.id ? `#${info.id}` : ''}${info.classes ? `.${info.classes[0]}` : ''} - "${info.text}"`);
              }
            }
          }
        }
      } catch (error) {
        if (!captureScreenshot) {
          logger.warn(`⚠️ Error con estrategia ${strategy.name}:`, error);
        }
      }
    }

    // Buscar opciones "Si" con múltiples estrategias
    const optionStrategies = [
      { name: 'Celdas con texto Si', selector: 'td:has-text("Si")' },
      { name: 'Elementos cell con texto Si', selector: '[role="cell"]:has-text("Si")' },
      { name: 'Opciones de select', selector: 'option:has-text("Si")' },
      { name: 'Items de lista', selector: 'li:has-text("Si")' },
      { name: 'Elementos con role option', selector: '[role="option"]:has-text("Si")' },
      { name: 'Cualquier elemento con texto Si', selector: '*:has-text("Si"):visible' }
    ];

    for (const strategy of optionStrategies) {
      try {
        const elements = await page.locator(strategy.selector).all();
        if (!captureScreenshot) {
          logger.info(`🎯 Probando estrategia opciones: ${strategy.name} - encontrados ${elements.length} elementos`);
        }
        
        for (const element of elements) {
          if (await element.isVisible()) {
            const info = await getElementInfo(element);
            if (info && info.text?.includes('Si')) {
              context.options.push(info);
              if (!captureScreenshot) {
                logger.info(`  📌 Opción: ${info.tag}${info.id ? `#${info.id}` : ''} - "${info.text}"`);
              }
            }
          }
        }
      } catch (error) {
        if (!captureScreenshot) {
          logger.warn(`⚠️ Error con estrategia opciones ${strategy.name}:`, error);
        }
      }
    }

    // Log resumen solo si no es modo silencioso
    if (!captureScreenshot) {
      logger.info(`📊 RESUMEN DEL ANÁLISIS:`);
      logger.info(`  • Sección depósito: ${context.section ? '✅ Encontrada' : '❌ No encontrada'}`);
      logger.info(`  • Botones dropdown: ${context.dropdownButtons.length} encontrados`);
      logger.info(`  • Opciones "Si": ${context.options.length} encontradas`);
      logger.info(`  • Selectores recomendados: ${context.recommendedSelectors.length}`);
    }

  } catch (error) {
    if (!captureScreenshot) {
      logger.error('❌ Error durante análisis de contexto depósito digital:', error);
    }
  }

  return context;
}

// Función silenciosa para análisis de depósito digital
async function analyzeDepositoDigitalContextSilently(page: Page, captureScreenshot: boolean = false): Promise<any> {
  return await analyzeDepositoDigitalContext(page, captureScreenshot);
}

// Función silenciosa para análisis general de página
async function analyzePageSilently(page: Page): Promise<PageAnalysis> {
  // Usar la función existente pero sin logs
  return await analyzePage(page, true);
}

// Nueva función para análisis completo de paso EN CASO DE FALLO
export async function analyzeStepFailure(page: Page, stepNumber: number, stepDescription: string, error: Error): Promise<string> {
  try {
    // CREAR DIRECTORIO DE ANÁLISIS CON TIMESTAMP
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const analysisDir = path.join(process.cwd(), 'output', 'analysis', 'failures', `step${stepNumber}_${timestamp}`);
    await fs.mkdir(analysisDir, { recursive: true });
    
    // CAPTURAR SCREENSHOT SILENCIOSAMENTE
    const screenshotName = `FAILURE_step${stepNumber}_${timestamp}`;
    await takeScreenshot(page, screenshotName, 'error');
    
    // ANÁLISIS SILENCIOSO (sin logs detallados al console)
    const analysis = await analyzePageSilently(page);
    
    // Análisis específico si es paso de depósito digital
    let depositoContext = null;
    if (stepDescription.toLowerCase().includes('depósito') || stepNumber === 13) {
      depositoContext = await analyzeDepositoDigitalContextSilently(page, true);
    }
    
    // GUARDAR TODO EN EL DIRECTORIO ESPECÍFICO
    await saveStepFailureAnalysisSilently(analysisDir, stepNumber, stepDescription, analysis, depositoContext, error, screenshotName);
    
    // SOLO MOSTRAR EL DIRECTORIO DONDE SE GUARDÓ TODO
    logger.error(`\n💥 FALLO EN PASO ${stepNumber}: ${stepDescription}`);
    logger.error(`❌ Error: ${error.message}`);
    logger.error(`📁 ANÁLISIS COMPLETO GUARDADO EN: ${analysisDir}`);
    logger.error(`📸 Screenshot: output/screenshots/error/${screenshotName}.png`);
    logger.error(`\n🔄 CERRANDO PROCESO DESPUÉS DEL ANÁLISIS...`);
    
    // CERRAR EL PROCESO DESPUÉS DEL ANÁLISIS
    setTimeout(() => {
      process.exit(1);
    }, 1000); // Dar 1 segundo para que se complete el logging
    
    return analysisDir;
    
  } catch (analysisError) {
    logger.error(`❌ Error durante análisis post-fallo del paso ${stepNumber}:`, analysisError);
    return '';
  }
}

// Función SILENCIOSA para guardar análisis de FALLO
async function saveStepFailureAnalysisSilently(
  analysisDir: string,
  stepNumber: number, 
  stepDescription: string, 
  analysis: PageAnalysis, 
  depositoContext: any,
  error: Error,
  screenshotName: string
): Promise<void> {
  try {
    // ARCHIVO PRINCIPAL DE ANÁLISIS
    const mainAnalysisFile = path.join(analysisDir, 'failure_analysis.json');
    const failureAnalysis = {
      type: 'STEP_FAILURE_ANALYSIS',
      stepNumber,
      stepDescription,
      timestamp: new Date().toISOString(),
      screenshot: {
        filename: `${screenshotName}.png`,
        path: `output/screenshots/error/${screenshotName}.png`,
        description: `Screenshot captured at moment of failure for step ${stepNumber}`
      },
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      recommendations: generateFailureRecommendations(analysis, depositoContext, error),
      possibleSolutions: generatePossibleSolutions(stepNumber, analysis, depositoContext, error)
    };
    await fs.writeFile(mainAnalysisFile, JSON.stringify(failureAnalysis, null, 2));

    // ARCHIVO DETALLADO DE PÁGINA
    const pageAnalysisFile = path.join(analysisDir, 'page_analysis.json');
    await fs.writeFile(pageAnalysisFile, JSON.stringify(analysis, null, 2));

    // ARCHIVO DE CONTEXTO DEPÓSITO (si existe)
    if (depositoContext) {
      const depositoAnalysisFile = path.join(analysisDir, 'deposito_context.json');
      await fs.writeFile(depositoAnalysisFile, JSON.stringify(depositoContext, null, 2));
    }

    // ARCHIVO HTML COMPLETO
    if (depositoContext?.fullPageContext) {
      const htmlFile = path.join(analysisDir, 'page_source.html');
      await fs.writeFile(htmlFile, depositoContext.fullPageContext);
    }

    // ARCHIVO README CON EXPLICACIÓN
    const readmeFile = path.join(analysisDir, 'README.md');
    const readmeContent = `# Análisis de Fallo - Paso ${stepNumber}

## Información del Fallo
- **Paso**: ${stepNumber} - ${stepDescription}
- **Error**: ${error.message}
- **Timestamp**: ${new Date().toISOString()}

## Archivos Generados

### 📊 failure_analysis.json
Análisis principal con error, recomendaciones y soluciones.

### 📄 page_analysis.json  
Análisis detallado de la estructura de la página (botones, formularios, elementos).

${depositoContext ? '### 🎛️ deposito_context.json\nAnálisis específico del contexto de depósito digital (botones dropdown, opciones "Si").\n' : ''}

### 📸 Screenshot
Ver: \`output/screenshots/error/${screenshotName}.png\`

### 🌐 page_source.html
HTML completo de la página en el momento del fallo.

## Próximos Pasos
1. Revisar las recomendaciones en \`failure_analysis.json\`
2. Examinar el screenshot para entender el estado visual
3. Probar las soluciones sugeridas en \`possibleSolutions\`
`;
    await fs.writeFile(readmeFile, readmeContent);

  } catch (saveError) {
    logger.error('❌ Error guardando análisis de fallo:', saveError);
  }
}

// Función para generar recomendaciones basadas en FALLO
function generateFailureRecommendations(analysis: PageAnalysis, depositoContext: any, error: Error): string[] {
  const recommendations: string[] = [];
  
  // Análisis específico del error
  if (error.message.includes('timeout') || error.message.includes('Timeout')) {
    recommendations.push('🕐 TIMEOUT detectado - el elemento puede tardar más en aparecer');
    recommendations.push('🔧 SOLUCIÓN: Aumentar waitForTimeout o usar waitForSelector');
  }
  
  if (error.message.includes('not found') || error.message.includes('No node found')) {
    recommendations.push('🔍 ELEMENTO NO ENCONTRADO - el selector puede haber cambiado');
    recommendations.push('🔧 SOLUCIÓN: Verificar selectores alternativos en el análisis');
  }
  
  if (error.message.includes('not visible') || error.message.includes('not clickable')) {
    recommendations.push('👁️ ELEMENTO NO VISIBLE/CLICKEABLE - puede estar oculto o cubierto');
    recommendations.push('🔧 SOLUCIÓN: Verificar scroll, overlays o elementos que lo cubran');
  }
  
  // Análisis del contexto de depósito digital
  if (depositoContext) {
    if (depositoContext.dropdownButtons.length === 0) {
      recommendations.push('⚠️ CRÍTICO: No se encontraron botones dropdown en la página');
      recommendations.push('🔧 SOLUCIÓN: Verificar si la página cambió o si estamos en la sección correcta');
    } else {
      recommendations.push(`✅ DISPONIBLES: ${depositoContext.dropdownButtons.length} botones dropdown detectados`);
      depositoContext.dropdownButtons.forEach((btn: any, i: number) => {
        recommendations.push(`   ${i + 1}. ${btn.tag}${btn.id ? `#${btn.id}` : ''}${btn.classes ? `.${btn.classes[0]}` : ''} - "${btn.text}"`);
      });
    }
    
    if (depositoContext.options.length === 0) {
      recommendations.push('⚠️ CRÍTICO: No se encontraron opciones "Si" - dropdown puede no estar abierto');
      recommendations.push('🔧 SOLUCIÓN: Verificar que se haga click en dropdown antes de buscar opciones');
    } else {
      recommendations.push(`✅ DISPONIBLES: ${depositoContext.options.length} opciones "Si" detectadas`);
    }
  }
  
  // Análisis general de la página
  if (analysis.forms.length === 0) {
    recommendations.push('⚠️ PÁGINA: No se detectaron formularios - posible problema de navegación');
    recommendations.push('🔧 SOLUCIÓN: Verificar que estemos en la página correcta del trámite');
  }
  
  if (analysis.interactiveElements.buttons.length === 0) {
    recommendations.push('⚠️ PÁGINA: No se detectaron botones - posible problema de carga');
    recommendations.push('🔧 SOLUCIÓN: Esperar más tiempo o verificar si la página terminó de cargar');
  }
  
  return recommendations;
}

// Función para generar soluciones posibles basadas en el fallo
function generatePossibleSolutions(stepNumber: number, _analysis: PageAnalysis, depositoContext: any, error: Error): string[] {
  const solutions: string[] = [];
  
  // Soluciones específicas por paso
  if (stepNumber === 13) {
    solutions.push('SELECTOR ANALYSIS:');
    if (depositoContext?.dropdownButtons?.length > 0) {
      depositoContext.dropdownButtons.forEach((btn: any, i: number) => {
        const selector = btn.id ? `#${btn.id}` : (btn.classes?.length > 0 ? `.${btn.classes[0]}` : btn.tag);
        solutions.push(`  await page.locator('${selector}').click(); // Botón ${i + 1}: "${btn.text}"`);
      });
    }
    
    solutions.push('ALTERNATIVE SELECTORS:');
    solutions.push('  await page.locator(\'button[id$="-btn"]\').first().click();');
    solutions.push('  await page.locator(\'[role="combobox"]\').click();');
    solutions.push('  await page.locator(\'div:has-text("depósito") button\').click();');
  }
  
  // Soluciones generales basadas en el tipo de error
  if (error.message.includes('timeout')) {
    solutions.push('TIMEOUT SOLUTIONS:');
    solutions.push('  await page.waitForSelector(\'selector\', { timeout: 60000 });');
    solutions.push('  await page.waitForLoadState(\'networkidle\');');
    solutions.push('  await page.waitForTimeout(5000);');
  }
  
  if (error.message.includes('not found')) {
    solutions.push('ELEMENT NOT FOUND SOLUTIONS:');
    solutions.push('  // Try waiting for element first');
    solutions.push('  await page.waitForSelector(\'selector\');');
    solutions.push('  // Try alternative selectors');
    solutions.push('  await page.locator(\'alternative-selector\').click();');
  }
  
  if (error.message.includes('not visible')) {
    solutions.push('VISIBILITY SOLUTIONS:');
    solutions.push('  await element.scrollIntoViewIfNeeded();');
    solutions.push('  await page.locator(\'selector\').click({ force: true });');
    solutions.push('  // Check for overlays or modals blocking the element');
  }
  
  return solutions;
}


export async function analyzePage(page: Page, silent: boolean = false): Promise<PageAnalysis> {
  if (!silent) {
    logger.info('Analizando estructura de la página...');
  }
  
  try {
    const analysis: PageAnalysis = {
      url: page.url(),
      title: await page.title(),
      timestamp: new Date().toISOString(),
      containers: [],
      forms: [],
      navigation: {},
      interactiveElements: {
        buttons: [],
        links: [],
        inputs: [],
        selects: []
      }
    };
    
    // Analyze forms
    const forms = await page.locator('form').all();
    for (const form of forms) {
      const formAnalysis = await analyzeForm(form);
      if (formAnalysis) {
        analysis.forms.push(formAnalysis);
      }
    }
    
    // Analyze navigation elements
    analysis.navigation = await analyzeNavigation(page);
    
    // Analyze interactive elements
    analysis.interactiveElements = await analyzeInteractiveElements(page);
    
    // Analyze main containers
    const containers = await analyzeContainers(page);
    analysis.containers = containers;
    
    if (!silent) {
      logger.info(`Análisis completado: ${analysis.containers.length} contenedores, ${analysis.forms.length} formularios encontrados`);
    }
    
    return analysis;
  } catch (error) {
    if (!silent) {
      logger.error('Error al analizar la página:', error);
    }
    throw error;
  }
}

async function analyzeForm(form: any): Promise<FormAnalysis | null> {
  try {
    const formInfo: FormAnalysis = {
      selector: await form.evaluate((el: any) => {
        if (el.id) return `#${el.id}`;
        if (el.name) return `form[name="${el.name}"]`;
        return 'form';
      }),
      name: await form.getAttribute('name'),
      action: await form.getAttribute('action'),
      method: await form.getAttribute('method'),
      fields: []
    };
    
    // Get all form fields
    const inputs = await form.locator('input, select, textarea').all();
    for (const input of inputs) {
      const elementInfo = await getElementInfo(input);
      if (elementInfo) {
        formInfo.fields.push(elementInfo);
      }
    }
    
    return formInfo;
  } catch (error) {
    logger.error('Error al analizar formulario:', error);
    return null;
  }
}

async function analyzeNavigation(page: Page): Promise<NavigationAnalysis> {
  const navigation: NavigationAnalysis = {};
  
  try {
    // Look for main menu
    const menuSelectors = ['nav', '[role="navigation"]', '.menu', '.navbar', '#menu'];
    for (const selector of menuSelectors) {
      const menu = page.locator(selector).first();
      if (await menu.count() > 0) {
        const links = await menu.locator('a').all();
        navigation.mainMenu = [];
        for (const link of links) {
          const info = await getElementInfo(link);
          if (info) {
            navigation.mainMenu.push(info);
          }
        }
        break;
      }
    }
    
    // Look for breadcrumbs
    const breadcrumbSelectors = ['.breadcrumb', '[aria-label="breadcrumb"]', '.breadcrumbs'];
    for (const selector of breadcrumbSelectors) {
      const breadcrumb = page.locator(selector).first();
      if (await breadcrumb.count() > 0) {
        const items = await breadcrumb.locator('a, span').all();
        navigation.breadcrumbs = [];
        for (const item of items) {
          const info = await getElementInfo(item);
          if (info) {
            navigation.breadcrumbs.push(info);
          }
        }
        break;
      }
    }
  } catch (error) {
    logger.error('Error al analizar navegación:', error);
  }
  
  return navigation;
}

async function analyzeInteractiveElements(page: Page) {
  const elements = {
    buttons: [] as ElementInfo[],
    links: [] as ElementInfo[],
    inputs: [] as ElementInfo[],
    selects: [] as ElementInfo[]
  };
  
  try {
    // Analyze buttons
    const buttons = await page.locator('button, [role="button"], input[type="submit"], input[type="button"]').all();
    for (const button of buttons) {
      const info = await getElementInfo(button);
      if (info && info.isVisible) {
        elements.buttons.push(info);
      }
    }
    
    // Analyze links
    const links = await page.locator('a[href]').all();
    for (const link of links) {
      const info = await getElementInfo(link);
      if (info && info.isVisible) {
        elements.links.push(info);
      }
    }
    
    // Analyze inputs
    const inputs = await page.locator('input:not([type="submit"]):not([type="button"]), textarea').all();
    for (const input of inputs) {
      const info = await getElementInfo(input);
      if (info && info.isVisible) {
        elements.inputs.push(info);
      }
    }
    
    // Analyze selects
    const selects = await page.locator('select').all();
    for (const select of selects) {
      const info = await getElementInfo(select);
      if (info && info.isVisible) {
        elements.selects.push(info);
      }
    }
  } catch (error) {
    logger.error('Error al analizar elementos interactivos:', error);
  }
  
  return elements;
}

async function analyzeContainers(page: Page): Promise<ContainerInfo[]> {
  const containers: ContainerInfo[] = [];
  
  try {
    // Common container selectors
    const containerSelectors = [
      { selector: 'main', description: 'Contenido principal' },
      { selector: '[role="main"]', description: 'Contenido principal (ARIA)' },
      { selector: '.content', description: 'Área de contenido' },
      { selector: '#content', description: 'Área de contenido' },
      { selector: 'section', description: 'Sección' },
      { selector: 'article', description: 'Artículo' },
      { selector: '.container', description: 'Contenedor' },
      { selector: '.wrapper', description: 'Envoltorio' }
    ];
    
    for (const { selector, description } of containerSelectors) {
      const elements = await page.locator(selector).all();
      
      for (let i = 0; i < elements.length; i++) {
        const container = elements[i];
        const isVisible = await container.isVisible();
        
        if (isVisible) {
          const containerInfo: ContainerInfo = {
            selector: i === 0 ? selector : `${selector}:nth-of-type(${i + 1})`,
            description: `${description} ${i + 1}`,
            elements: []
          };
          
          // Get interactive elements within container
          const interactiveSelectors = 'button, a, input, select, textarea, [role="button"]';
          const interactiveElements = await container.locator(interactiveSelectors).all();
          
          for (const element of interactiveElements) {
            const info = await getElementInfo(element);
            if (info && info.isVisible) {
              containerInfo.elements.push(info);
            }
          }
          
          if (containerInfo.elements.length > 0) {
            containers.push(containerInfo);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error al analizar contenedores:', error);
  }
  
  return containers;
}

async function getElementInfo(element: any): Promise<ElementInfo | null> {
  try {
    const tagName = await element.evaluate((el: any) => el.tagName.toLowerCase());
    const boundingBox = await element.boundingBox();
    
    const info: ElementInfo = {
      tag: tagName,
      isVisible: await element.isVisible(),
      isEnabled: await element.isEnabled(),
      boundingBox: boundingBox || undefined
    };
    
    // Get attributes
    info.id = await element.getAttribute('id');
    info.name = await element.getAttribute('name');
    info.type = await element.getAttribute('type');
    info.placeholder = await element.getAttribute('placeholder');
    info.value = await element.getAttribute('value');
    info.href = await element.getAttribute('href');
    info.ariaLabel = await element.getAttribute('aria-label');
    info.role = await element.getAttribute('role');
    info.dataTestId = await element.getAttribute('data-testid') || await element.getAttribute('data-test-id');
    
    // Get classes
    const classAttr = await element.getAttribute('class');
    if (classAttr) {
      info.classes = classAttr.split(' ').filter((c: string) => c.trim());
    }
    
    // Get text content
    try {
      info.text = await element.textContent();
      if (info.text) {
        info.text = info.text.trim();
      }
    } catch (error) {
      // Some elements might not have text content
    }
    
    return info;
  } catch (error) {
    logger.error('Error al obtener información del elemento:', error);
    return null;
  }
}

export async function generatePageReport(analysis: PageAnalysis): Promise<string> {
  const report: string[] = [
    `# Análisis de Página`,
    ``,
    `**URL:** ${analysis.url}`,
    `**Título:** ${analysis.title}`,
    `**Fecha:** ${new Date(analysis.timestamp).toLocaleString('es-AR')}`,
    ``,
    `## Resumen`,
    `- Contenedores encontrados: ${analysis.containers.length}`,
    `- Formularios: ${analysis.forms.length}`,
    `- Botones: ${analysis.interactiveElements.buttons.length}`,
    `- Enlaces: ${analysis.interactiveElements.links.length}`,
    `- Campos de entrada: ${analysis.interactiveElements.inputs.length}`,
    `- Selectores: ${analysis.interactiveElements.selects.length}`,
    ``
  ];
  
  // Add forms section
  if (analysis.forms.length > 0) {
    report.push(`## Formularios`);
    report.push(``);
    
    analysis.forms.forEach((form, index) => {
      report.push(`### Formulario ${index + 1}`);
      report.push(`- Selector: \`${form.selector}\``);
      if (form.name) report.push(`- Nombre: ${form.name}`);
      if (form.action) report.push(`- Action: ${form.action}`);
      if (form.method) report.push(`- Método: ${form.method}`);
      report.push(`- Campos: ${form.fields.length}`);
      report.push(``);
      
      if (form.fields.length > 0) {
        report.push(`#### Campos del formulario:`);
        form.fields.forEach(field => {
          const fieldDesc = [];
          if (field.name) fieldDesc.push(`name="${field.name}"`);
          if (field.id) fieldDesc.push(`id="${field.id}"`);
          if (field.type) fieldDesc.push(`type="${field.type}"`);
          if (field.placeholder) fieldDesc.push(`placeholder="${field.placeholder}"`);
          
          report.push(`- \`${field.tag}\` ${fieldDesc.join(', ')}`);
        });
        report.push(``);
      }
    });
  }
  
  // Add navigation section
  if (analysis.navigation.mainMenu || analysis.navigation.breadcrumbs) {
    report.push(`## Navegación`);
    report.push(``);
    
    if (analysis.navigation.mainMenu) {
      report.push(`### Menú principal`);
      analysis.navigation.mainMenu.forEach(item => {
        report.push(`- ${item.text || 'Sin texto'} (${item.href || 'Sin href'})`);
      });
      report.push(``);
    }
    
    if (analysis.navigation.breadcrumbs) {
      report.push(`### Breadcrumbs`);
      const breadcrumbPath = analysis.navigation.breadcrumbs
        .map(item => item.text || 'Sin texto')
        .join(' > ');
      report.push(breadcrumbPath);
      report.push(``);
    }
  }
  
  // Add containers section
  if (analysis.containers.length > 0) {
    report.push(`## Contenedores principales`);
    report.push(``);
    
    analysis.containers.forEach(container => {
      report.push(`### ${container.description}`);
      report.push(`- Selector: \`${container.selector}\``);
      report.push(`- Elementos interactivos: ${container.elements.length}`);
      report.push(``);
    });
  }
  
  return report.join('\n');
}
