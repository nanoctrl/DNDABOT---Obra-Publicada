import { logger } from './logger';

export interface RetryOptions {
  retries: number;
  delay: number;
  backoff?: boolean;
}

/**
 * Ejecuta una tarea con reintentos automáticos
 * @param task - Función async que representa la tarea a ejecutar
 * @param options - Opciones de reintento
 * @returns Promise con el resultado de la tarea
 */
export async function executeWithRetries<T>(
  task: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { retries, delay, backoff = true } = options;
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      logger.info(`Ejecutando tarea - Intento ${attempt + 1}/${retries + 1}`);
      const result = await task();
      
      if (attempt > 0) {
        logger.info(`✅ Tarea completada exitosamente después de ${attempt + 1} intentos`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === retries) {
        logger.error(`❌ Tarea falló después de ${retries + 1} intentos: ${lastError.message}`);
        break;
      }
      
      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      logger.warn(`⚠️ Intento ${attempt + 1} falló. Reintentando en ${waitTime}ms...`);
      logger.debug(`Error del intento ${attempt + 1}:`, lastError);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError || new Error('Task failed with unknown error');
}

/**
 * Wrapper para tareas críticas del sistema
 * Usa configuración predeterminada optimizada para tareas de navegación web
 */
export async function runCriticalTask<T>(
  taskName: string,
  task: () => Promise<T>
): Promise<T> {
  logger.info(`🔄 Iniciando tarea crítica: ${taskName}`);
  
  try {
    const result = await executeWithRetries(task, {
      retries: 3,
      delay: 2000,
      backoff: true
    });
    
    logger.info(`✅ Tarea crítica completada: ${taskName}`);
    return result;
  } catch (error) {
    logger.error(`❌ Fallo en tarea crítica: ${taskName}`, error);
    throw error;
  }
}
