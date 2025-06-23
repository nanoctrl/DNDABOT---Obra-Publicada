import { Page } from 'playwright';
import { logger } from './logger';

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

export async function analyzePage(page: Page): Promise<PageAnalysis> {
  logger.info('Analizando estructura de la página...');
  
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
    
    logger.info(`Análisis completado: ${analysis.containers.length} contenedores, ${analysis.forms.length} formularios encontrados`);
    
    return analysis;
  } catch (error) {
    logger.error('Error al analizar la página:', error);
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
