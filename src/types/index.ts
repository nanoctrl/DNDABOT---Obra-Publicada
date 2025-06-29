/**
 * Re-exportación centralizada de todos los tipos
 * Facilita las importaciones en el resto del proyecto
 */

// Re-exportar tipos del esquema
export {
  Obra,
  Autor,
  Editor,
  Gestor,
  TramiteData,
  ObraSchema,
  AutorSchema,
  EditorSchema,
  GestorSchema,
  TramiteDataSchema
} from './schema';

// Re-exportar tipos de TAD
export {
  RegistrationResult,
  TadUser,
  TadSession,
  TadTramite,
  TadFormField,
  TadFormSection,
  TadForm
} from './tad.types';

// Tipos para configuración
export interface BotConfig {
  AFIP_CUIT: string;
  AFIP_PASSWORD: string;
  DEVELOPER_DEBUG_MODE: boolean;
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  BASE_URL: string;
  SCREENSHOT_DIR: string;
  OUTPUT_DIR: string;
  DATA_DIR: string;
  HEADLESS: boolean;
  SLOW_MO: number;
  NAVIGATION_TIMEOUT: number;
  ACTION_TIMEOUT: number;
  RETRY_ATTEMPTS: number;
  RETRY_DELAY: number;
}

// Tipos para Page Objects
export interface PageObject {
  readonly url?: string;
  isLoaded(): Promise<boolean>;
  waitForLoad(): Promise<void>;
}

// Tipos para servicios
export interface Service {
  readonly name: string;
}

// Tipos para resultados de operaciones
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

// Tipos para el sistema de tracking
export interface StepResult {
  stepNumber: number;
  success: boolean;
  strategy?: string;
  error?: string;
  duration: number;
}

// Tipos para interacciones
export interface InteractionResult {
  success: boolean;
  strategy?: string;
  error?: Error;
}

// Tipos para validación
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
