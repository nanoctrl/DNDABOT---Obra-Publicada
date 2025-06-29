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
  INTERACTIVE_MODE: boolean;
  DEVELOPER_DEBUG_MODE: boolean;
  NODE_ENV: string;
  LOG_LEVEL: string;
  
  // Paths
  OUTPUT_DIR: string;
  DATA_DIR: string;
  
  // Timeouts (en milisegundos)
  DEFAULT_TIMEOUT: number;
  NAVIGATION_TIMEOUT: number;
  INTERACTION_TIMEOUT: number;
  WAIT_AFTER_CLICK: number;
  
  // Retry configuration
  MAX_RETRIES: number;
  RETRY_DELAY: number;
  RETRY_BACKOFF: boolean;
}

// Validar formato CUIT (XX-XXXXXXXX-X)
function validateCUIT(cuit: string): boolean {
  const cuitRegex = /^\d{2}-?\d{8}-?\d{1}$/;
  if (!cuitRegex.test(cuit)) {
    return false;
  }
  
  // Normalizar CUIT removiendo guiones
  const normalizedCuit = cuit.replace(/-/g, '');
  if (normalizedCuit.length !== 11) {
    return false;
  }
  
  // Validación del dígito verificador
  const digits = normalizedCuit.split('').map(Number);
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * multipliers[i];
  }
  
  const checkDigit = 11 - (sum % 11);
  const expectedDigit = checkDigit === 11 ? 0 : checkDigit === 10 ? 9 : checkDigit;
  
  return digits[10] === expectedDigit;
}

// Validate required environment variables
const requiredVars = ['AFIP_CUIT', 'AFIP_PASSWORD'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`Faltan las siguientes variables de entorno requeridas: ${missingVars.join(', ')}`);
}

// Validar CUIT
if (!validateCUIT(process.env.AFIP_CUIT!)) {
  throw new Error(`El CUIT proporcionado (${process.env.AFIP_CUIT}) no tiene un formato válido. Debe ser XX-XXXXXXXX-X`);
}

// Validar contraseña
if (process.env.AFIP_PASSWORD!.length < 6) {
  throw new Error('La contraseña de AFIP debe tener al menos 6 caracteres');
}

// Export configuration object
export const config: Config = {
  // Credentials
  AFIP_CUIT: process.env.AFIP_CUIT!,
  AFIP_PASSWORD: process.env.AFIP_PASSWORD!,
  
  // URLs
  AFIP_URL: process.env.AFIP_URL || 'https://www.afip.gob.ar',
  TAD_URL: process.env.TAD_URL || 'https://tramitesadistancia.gob.ar',
  
  // Modo interactivo - pausa en errores para corrección manual
  INTERACTIVE_MODE: process.env.INTERACTIVE_MODE === 'true' || process.env.DEVELOPER_DEBUG_MODE === 'true',
  DEVELOPER_DEBUG_MODE: process.env.DEVELOPER_DEBUG_MODE === 'true',
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Paths
  OUTPUT_DIR: path.join(process.cwd(), 'output'),
  DATA_DIR: path.join(process.cwd(), 'data'),
  
  // Timeouts (en milisegundos)
  DEFAULT_TIMEOUT: parseInt(process.env.DEFAULT_TIMEOUT || '30000'),
  NAVIGATION_TIMEOUT: parseInt(process.env.NAVIGATION_TIMEOUT || '30000'),
  INTERACTION_TIMEOUT: parseInt(process.env.INTERACTION_TIMEOUT || '10000'),
  WAIT_AFTER_CLICK: parseInt(process.env.WAIT_AFTER_CLICK || '2000'),
  
  // Retry configuration
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3'),
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY || '2000'),
  RETRY_BACKOFF: process.env.RETRY_BACKOFF !== 'false'
};

// Freeze config to prevent modifications
Object.freeze(config);
