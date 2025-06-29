import { Page } from 'playwright';
import { logger } from './logger';
import { config } from '../config';
import { takeScreenshot } from './screenshotManager';

export interface InteractiveModeResult {
  success: boolean;
  action?: string;
  selector?: string;
}

/**
 * Pausa la ejecución y abre el inspector de Playwright para grabar acciones manualmente
 */
export async function enterInteractiveMode(
  page: Page,
  taskName: string,
  errorMessage: string
): Promise<InteractiveModeResult> {
  if (!config.INTERACTIVE_MODE) {
    return { success: false };
  }

  logger.info('🎭 MODO INTERACTIVO ACTIVADO 🎭');
  logger.info(`❌ Fallo en: ${taskName}`);
  logger.info(`📝 Error: ${errorMessage}`);
  logger.info('');
  logger.info('📹 Por favor, realiza la acción manualmente en el navegador.');
  logger.info('💡 El inspector de Playwright está abierto para grabar la acción.');
  logger.info('✅ Cuando termines, presiona "Resume" en el inspector.');
  logger.info('');
  
  // Tomar screenshot del estado actual
  await takeScreenshot(page, `interactive_mode_${taskName.replace(/\s+/g, '_')}`, 'debug');
  
  // Pausar para permitir interacción manual
  await page.pause();
  
  logger.info('▶️ Continuando después de la interacción manual...');
  
  return { success: true };
}

/**
 * Wrapper para ejecutar una tarea con soporte de modo interactivo
 */
export async function executeWithInteractiveSupport<T>(
  page: Page,
  taskName: string,
  taskFunction: () => Promise<T>,
  retries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Ejecutando ${taskName} (intento ${attempt}/${retries})...`);
      return await taskFunction();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Intento ${attempt} falló: ${lastError.message}`);
      
      if (attempt === retries) {
        // Último intento falló, entrar en modo interactivo
        logger.error(`Todos los intentos fallaron para: ${taskName}`);
        
        if (config.INTERACTIVE_MODE) {
          await enterInteractiveMode(page, taskName, lastError.message);
          
          // Dar una última oportunidad después del modo interactivo
          try {
            logger.info('Reintentando después de la corrección manual...');
            return await taskFunction();
          } catch (retryError) {
            logger.error('Falló incluso después de la corrección manual:', retryError);
            throw retryError;
          }
        }
      }
      
      // Esperar antes del siguiente intento
      if (attempt < retries) {
        const delay = attempt * 1000; // Incrementar delay con cada intento
        logger.info(`Esperando ${delay}ms antes del siguiente intento...`);
        await page.waitForTimeout(delay);
      }
    }
  }
  
  throw lastError || new Error(`Failed to execute ${taskName}`);
}

/**
 * Registra una acción grabada del inspector para uso futuro
 */
export function logRecordedAction(action: string, selector?: string): void {
  logger.info('🎬 ACCIÓN GRABADA:');
  logger.info(`Acción: ${action}`);
  if (selector) {
    logger.info(`Selector: ${selector}`);
  }
  logger.info('💾 Considera agregar esta acción al código para automatizarla en el futuro.');
}
