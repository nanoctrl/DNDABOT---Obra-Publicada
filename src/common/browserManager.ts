import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { logger } from './logger';
import { config } from '../config';

export interface BrowserManager {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export async function initializeBrowser(): Promise<BrowserManager> {
  logger.info('Inicializando navegador...');
  
  try {
    const browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      timeout: 30000
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      locale: 'es-AR',
      timezoneId: 'America/Argentina/Buenos_Aires',
      ignoreHTTPSErrors: true,
      // Enable tracing if in debug mode
      ...(config.DEVELOPER_DEBUG_MODE && {
        recordVideo: {
          dir: 'output/debug_runs',
          size: { width: 1280, height: 720 }
        }
      })
    });

    // Start tracing if in debug mode
    if (config.DEVELOPER_DEBUG_MODE) {
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true
      });
    }

    const page = await context.newPage();
    
    // Set default timeout
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    logger.info('Navegador inicializado correctamente');
    
    return { browser, context, page };
  } catch (error) {
    logger.error('Error al inicializar el navegador:', error);
    throw error;
  }
}

export async function closeBrowser(browserManager: BrowserManager): Promise<void> {
  logger.info('Cerrando navegador...');
  
  try {
    const { browser, context, page } = browserManager;
    
    // Stop tracing if it was started
    if (config.DEVELOPER_DEBUG_MODE) {
      const tracePath = `output/debug_runs/trace_${Date.now()}.zip`;
      await context.tracing.stop({ path: tracePath });
      logger.info(`Trace guardado en: ${tracePath}`);
    }
    
    await page.close();
    await context.close();
    await browser.close();
    
    logger.info('Navegador cerrado correctamente');
  } catch (error) {
    logger.error('Error al cerrar el navegador:', error);
    throw error;
  }
}
