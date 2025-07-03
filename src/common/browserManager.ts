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
  
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;
  
  try {
    browser = await chromium.launch({
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
      timeout: config.DEFAULT_TIMEOUT
    });

    context = await browser.newContext({
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

    page = await context.newPage();
    
    // Set default timeout
    page.setDefaultTimeout(config.DEFAULT_TIMEOUT);
    page.setDefaultNavigationTimeout(config.NAVIGATION_TIMEOUT);

    logger.info('Navegador inicializado correctamente');
    
    return { browser, context, page };
  } catch (error) {
    logger.error('Error al inicializar el navegador:', error);
    
    // Cleanup en caso de error
    if (page) {
      try {
        await page.close();
      } catch (e) {
        logger.error('Error cerrando página:', e);
      }
    }
    
    if (context) {
      try {
        await context.close();
      } catch (e) {
        logger.error('Error cerrando contexto:', e);
      }
    }
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        logger.error('Error cerrando navegador:', e);
      }
    }
    
    throw error;
  }
}

export async function closeBrowser(browserManager: BrowserManager): Promise<void> {
  logger.info('Cerrando navegador...');
  
  const { browser, context, page } = browserManager;
  const errors: Error[] = [];
  
  // Stop tracing if it was started
  if (config.DEVELOPER_DEBUG_MODE && context) {
    try {
      const tracePath = `output/debug_runs/trace_${Date.now()}.zip`;
      await context.tracing.stop({ path: tracePath });
      logger.info(`Trace guardado en: ${tracePath}`);
    } catch (error) {
      logger.error('Error al detener tracing:', error);
      errors.push(error as Error);
    }
  }
  
  // Cerrar página
  if (page) {
    try {
      await page.close();
    } catch (error) {
      logger.error('Error al cerrar página:', error);
      errors.push(error as Error);
    }
  }
  
  // Cerrar contexto
  if (context) {
    try {
      await context.close();
    } catch (error) {
      logger.error('Error al cerrar contexto:', error);
      errors.push(error as Error);
    }
  }
  
  // Wait 10 seconds before closing browser to allow visual verification
  logger.info('Esperando 10 segundos antes de cerrar el navegador...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Cerrar navegador
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      logger.error('Error al cerrar navegador:', error);
      errors.push(error as Error);
    }
  }
  
  if (errors.length > 0) {
    logger.warn(`Navegador cerrado con ${errors.length} errores`);
  } else {
    logger.info('Navegador cerrado correctamente');
  }
}
