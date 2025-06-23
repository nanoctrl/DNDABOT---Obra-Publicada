import { Page } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { logger } from './logger';

export type ScreenshotType = 'milestone' | 'error' | 'debug';

interface ScreenshotOptions {
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export async function takeScreenshot(
  page: Page,
  name: string,
  type: ScreenshotType = 'milestone',
  options: ScreenshotOptions = {}
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${type}_${name}_${timestamp}.png`;
  
  const screenshotDir = path.join(config.OUTPUT_DIR, 'screenshots', type);
  
  try {
    // Ensure directory exists
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const filepath = path.join(screenshotDir, filename);
    
    await page.screenshot({
      path: filepath,
      fullPage: options.fullPage ?? true,
      ...options
    });
    
    logger.info(`Screenshot guardado: ${filepath}`);
    
    return filepath;
  } catch (error) {
    logger.error(`Error al tomar screenshot ${name}:`, error);
    throw error;
  }
}

export async function takeElementScreenshot(
  page: Page,
  selector: string,
  name: string,
  type: ScreenshotType = 'milestone'
): Promise<string> {
  try {
    const element = await page.locator(selector).first();
    const boundingBox = await element.boundingBox();
    
    if (!boundingBox) {
      throw new Error(`No se pudo obtener el bounding box del elemento: ${selector}`);
    }
    
    return takeScreenshot(page, name, type, {
      fullPage: false,
      clip: boundingBox
    });
  } catch (error) {
    logger.error(`Error al tomar screenshot del elemento ${selector}:`, error);
    throw error;
  }
}

export async function cleanOldScreenshots(daysToKeep: number = 7): Promise<void> {
  const screenshotDir = path.join(config.OUTPUT_DIR, 'screenshots');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  try {
    const types: ScreenshotType[] = ['milestone', 'error', 'debug'];
    
    for (const type of types) {
      const typeDir = path.join(screenshotDir, type);
      
      try {
        const files = await fs.readdir(typeDir);
        
        for (const file of files) {
          const filePath = path.join(typeDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            logger.info(`Screenshot antiguo eliminado: ${file}`);
          }
        }
      } catch (error) {
        // Directory might not exist yet
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
      }
    }
  } catch (error) {
    logger.error('Error al limpiar screenshots antiguos:', error);
  }
}
