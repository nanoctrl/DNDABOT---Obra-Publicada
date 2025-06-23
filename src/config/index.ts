import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  // Credentials
  AFIP_CUIT: string;
  AFIP_PASSWORD: string;
  
  // URLs
  AFIP_URL: string;
  TAD_URL: string;
  
  // Development settings
  DEVELOPER_DEBUG_MODE: boolean;
  NODE_ENV: string;
  LOG_LEVEL: string;
  
  // Paths
  OUTPUT_DIR: string;
  DATA_DIR: string;
}

// Validate required environment variables
const requiredVars = ['AFIP_CUIT', 'AFIP_PASSWORD'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`Faltan las siguientes variables de entorno requeridas: ${missingVars.join(', ')}`);
}

// Export configuration object
export const config: Config = {
  // Credentials
  AFIP_CUIT: process.env.AFIP_CUIT!,
  AFIP_PASSWORD: process.env.AFIP_PASSWORD!,
  
  // URLs
  AFIP_URL: process.env.AFIP_URL || 'https://www.afip.gob.ar',
  TAD_URL: process.env.TAD_URL || 'https://tramitesadistancia.gob.ar',
  
  // Development settings
  DEVELOPER_DEBUG_MODE: process.env.DEVELOPER_DEBUG_MODE === 'true',
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Paths
  OUTPUT_DIR: path.join(process.cwd(), 'output'),
  DATA_DIR: path.join(process.cwd(), 'data')
};

// Freeze config to prevent modifications
Object.freeze(config);
