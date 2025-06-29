import { Page } from 'playwright';
import { logger } from '../common/logger';
import { 
  tryInteraction,
  buildStrategies,
  buildButtonStrategies,
  waitForNavigation
} from '../common/interactionHelper';

export class TadDashboardPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async assertIsReady(): Promise<void> {
    logger.info('Verificando que el dashboard de TAD esté listo');
    
    // TODO: Ajustar estos selectores basándose en el dashboard real de TAD
    const dashboardIndicators = [
      'text=Mis Trámites',
      'text=Nuevo Trámite',
      '[data-testid="dashboard"]',
      '.dashboard-container',
      '#user-dashboard'
    ];
    
    let found = false;
    for (const selector of dashboardIndicators) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        found = true;
        break;
      } catch {
        // Try next selector
      }
    }
    
    if (!found) {
      throw new Error('No se pudo verificar que el dashboard de TAD esté cargado');
    }
    
    logger.info('Dashboard de TAD verificado correctamente');
  }

  async searchTramite(tramiteName: string): Promise<void> {
    logger.info(`Buscando trámite: ${tramiteName}`);
    
    // OPTIMIZED: Successful strategy first based on log analysis
    const searchStrategies = [
      // ✅ SUCCESS_STRATEGY: Search by placeholder - put this first
      {
        name: 'Search by placeholder',
        locator: (page: Page) => page.locator('input[placeholder*="Buscar" i]')
      },
      // Fallback strategies
      ...buildStrategies({
        id: 'search',
        name: 'search',
        text: 'Buscar trámite',
        ariaLabel: 'Buscar',
        css: 'input[type="search"]'
      })
    ];
    
    // Fill search box
    const searchResult = await tryInteraction(
      this.page,
      'fill',
      searchStrategies,
      tramiteName
    );
    
    if (!searchResult.success) {
      throw new Error('No se pudo ingresar el texto de búsqueda');
    }
    
    // Press Enter or click search button
    try {
      await this.page.keyboard.press('Enter');
    } catch {
      // Try clicking search button
      const searchButtonStrategies = buildButtonStrategies('Buscar');
      searchButtonStrategies.push({
        name: 'Search icon button',
        locator: (page) => page.locator('button[aria-label*="buscar" i]')
      });
      
      await tryInteraction(this.page, 'click', searchButtonStrategies);
    }
    
    await waitForNavigation(this.page, { timeout: 5000 });
  }

  async selectTramite(tramiteName: string): Promise<void> {
    logger.info(`Seleccionando trámite: ${tramiteName}`);
    
    // Wait for search results
    await this.page.waitForTimeout(2000);
    
    // Strategies to find and click the tramite
    const tramiteStrategies = [
      {
        name: `Link with text: ${tramiteName}`,
        locator: (page: Page) => page.locator(`a:has-text("${tramiteName}")`)
      },
      {
        name: `Card with tramite name`,
        locator: (page: Page) => page.locator(`.tramite-card:has-text("${tramiteName}")`)
      },
      {
        name: `List item with tramite`,
        locator: (page: Page) => page.locator(`li:has-text("${tramiteName}")`)
      },
      {
        name: `Any clickable with tramite name`,
        locator: (page: Page) => page.locator(`[role="link"]:has-text("${tramiteName}")`)
      }
    ];
    
    const clickResult = await tryInteraction(this.page, 'click', tramiteStrategies);
    
    if (!clickResult.success) {
      throw new Error(`No se pudo seleccionar el trámite: ${tramiteName}`);
    }
    
    await waitForNavigation(this.page);
  }

  async startNewTramite(): Promise<void> {
    logger.info('Iniciando nuevo trámite');
    
    const newTramiteStrategies = buildButtonStrategies('Nuevo Trámite');
    newTramiteStrategies.push(...buildButtonStrategies('Iniciar Trámite'));
    newTramiteStrategies.push(...buildButtonStrategies('Comenzar'));
    
    const result = await tryInteraction(this.page, 'click', newTramiteStrategies);
    
    if (!result.success) {
      throw new Error('No se pudo iniciar un nuevo trámite');
    }
    
    await waitForNavigation(this.page);
  }

  async getTramitesList(): Promise<string[]> {
    logger.info('Obteniendo lista de trámites disponibles');
    
    // TODO: Implementar según la estructura real de TAD
    const tramites: string[] = [];
    
    try {
      const tramiteElements = await this.page.locator('.tramite-item, .tramite-card, [data-tramite]').all();
      
      for (const element of tramiteElements) {
        const text = await element.textContent();
        if (text) {
          tramites.push(text.trim());
        }
      }
    } catch (error) {
      logger.warn('No se pudo obtener la lista de trámites:', error);
    }
    
    return tramites;
  }
}
