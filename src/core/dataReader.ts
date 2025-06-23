import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { logger } from '../common/logger';
import { TramiteData, TramiteDataSchema } from '../types/schema';

export async function readInputData(): Promise<TramiteData> {
  try {
    // Look for JSON files in data directory
    const dataDir = config.DATA_DIR;
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      throw new Error('No se encontraron archivos JSON en la carpeta data/');
    }
    
    // Use the first JSON file found
    const inputFile = path.join(dataDir, jsonFiles[0]);
    logger.info(`Leyendo archivo de entrada: ${inputFile}`);
    
    // Read and parse JSON
    const content = await fs.readFile(inputFile, 'utf-8');
    const data = JSON.parse(content);
    
    // Validate against schema
    const validatedData = TramiteDataSchema.parse(data);
    
    logger.info(`Datos validados correctamente`);
    return validatedData;
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Error de validación en los datos de entrada:');
      error.errors.forEach(err => {
        logger.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Los datos de entrada no cumplen con el esquema esperado');
    }
    
    logger.error('Error al leer datos de entrada:', error);
    throw error;
  }
}
