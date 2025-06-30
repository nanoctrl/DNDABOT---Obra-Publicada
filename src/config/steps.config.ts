/**
 * Configuración centralizada de todos los pasos del proceso
 * Permite agregar/modificar pasos fácilmente
 */

export interface StepDefinition {
  number: number;
  name: string;
  description: string;
  service?: 'afip' | 'tad' | 'obra';
  required: boolean;
  retryable?: boolean;
}

export const STEP_DEFINITIONS: StepDefinition[] = [
  // Autenticación AFIP (Pasos 1-8)
  {
    number: 1,
    name: 'navigate_tad',
    description: 'Navegar a TAD',
    service: 'afip',
    required: true,
    retryable: true
  },
  {
    number: 2,
    name: 'click_ingresar',
    description: 'Click en INGRESAR',
    service: 'afip',
    required: true,
    retryable: true
  },
  {
    number: 3,
    name: 'click_afip_clave',
    description: 'Click en AFIP con clave fiscal',
    service: 'afip',
    required: true,
    retryable: true
  },
  {
    number: 4,
    name: 'input_cuit',
    description: 'Ingresar CUIT',
    service: 'afip',
    required: true,
    retryable: false
  },
  {
    number: 5,
    name: 'click_siguiente',
    description: 'Click en Siguiente',
    service: 'afip',
    required: true,
    retryable: true
  },
  {
    number: 6,
    name: 'input_password',
    description: 'Ingresar contraseña',
    service: 'afip',
    required: true,
    retryable: false
  },
  {
    number: 7,
    name: 'click_ingresar_afip',
    description: 'Click en Ingresar (AFIP)',
    service: 'afip',
    required: true,
    retryable: true
  },
  {
    number: 8,
    name: 'select_representado',
    description: 'Seleccionar representado',
    service: 'afip',
    required: true,
    retryable: true
  },
  
  // Navegación y búsqueda de trámite (Pasos 9-11)
  {
    number: 9,
    name: 'search_tramite',
    description: 'Buscar trámite',
    service: 'tad',
    required: true,
    retryable: true
  },
  {
    number: 10,
    name: 'click_iniciar_tramite',
    description: 'Click en Iniciar Trámite',
    service: 'tad',
    required: true,
    retryable: true
  },
  {
    number: 11,
    name: 'click_continuar',
    description: 'Click en CONTINUAR',
    service: 'tad',
    required: true,
    retryable: true
  },
  
  // Datos del trámite (Pasos 12-15)
  {
    number: 12,
    name: 'completar_datos_tramite',
    description: 'Completar datos del trámite',
    service: 'tad',
    required: true,
    retryable: false
  },
  {
    number: 13,
    name: 'select_si_dropdown',
    description: 'Seleccionar SI en dropdown',
    service: 'tad',
    required: true,
    retryable: true
  },
  {
    number: 14,
    name: 'input_email_notificaciones',
    description: 'Ingresar email de notificaciones',
    service: 'tad',
    required: true,
    retryable: false
  },
  {
    number: 15,
    name: 'guardar_datos_tramite',
    description: 'Guardar datos del trámite',
    service: 'tad',
    required: true,
    retryable: true
  },
  
  // Condiciones del trámite (Pasos 16-17)  
  {
    number: 16,
    name: 'abrir_condiciones_y_seleccionar_leido',
    description: 'Abrir condiciones y seleccionar "Leído: Si"',
    service: 'tad',
    required: true,
    retryable: true
  },
  {
    number: 17,
    name: 'guardar_condiciones_tramite',
    description: 'Hacer click en GUARDAR de condiciones del trámite',
    service: 'tad',
    required: true,
    retryable: true
  },
  
  // Datos de la obra (Pasos 18-26)
  {
    number: 18,
    name: 'abrir_formulario_obra',
    description: 'Abrir formulario de datos de obra',
    service: 'obra',
    required: true,
    retryable: true
  },
  {
    number: 19,
    name: 'completar_titulo_obra',
    description: 'Completar título de la obra',
    service: 'obra',
    required: true,
    retryable: false
  },
  {
    number: 20,
    name: 'seleccionar_tipo_obra',
    description: 'Seleccionar tipo de obra',
    service: 'obra',
    required: true,
    retryable: true
  },
  {
    number: 21,
    name: 'completar_album',
    description: 'Indicar si es álbum',
    service: 'obra',
    required: true,
    retryable: true
  },
  {
    number: 22,
    name: 'completar_cantidad_ejemplares',
    description: 'Completar cantidad de ejemplares',
    service: 'obra',
    required: true,
    retryable: false
  },
  {
    number: 23,
    name: 'seleccionar_genero_musical',
    description: 'Seleccionar género musical',
    service: 'obra',
    required: true,
    retryable: true
  },
  {
    number: 24,
    name: 'indicar_publicacion_web',
    description: 'Indicar si es publicación web',
    service: 'obra',
    required: true,
    retryable: true
  },
  {
    number: 25,
    name: 'completar_lugar_publicacion',
    description: 'Completar lugar de publicación',
    service: 'obra',
    required: true,
    retryable: false
  },
  {
    number: 26,
    name: 'completar_fecha_publicacion',
    description: 'Completar fecha de publicación',
    service: 'obra',
    required: true,
    retryable: false
  },
  {
    number: 27,
    name: 'seleccionar_obras_integrantes_original',
    description: 'Seleccionar "Original" en Obras Integrantes',
    service: 'obra',
    required: true,
    retryable: true
  },
  {
    number: 28,
    name: 'seleccionar_publicacion_web',
    description: 'Seleccionar opción en "¿Es una publicación Web?"',
    service: 'obra',
    required: true,
    retryable: true
  },
  {
    number: 29,
    name: 'insertar_datos_publicacion',
    description: 'Insertar datos de publicación (URL o lugar según tipo)',
    service: 'obra',
    required: true,
    retryable: false
  },
  {
    number: 30,
    name: 'check_process_step',
    description: 'Verificar proceso completado exitosamente',
    service: 'obra',
    required: true,
    retryable: false
  }
  
];

// Función helper para obtener pasos por servicio
export function getStepsByService(service: StepDefinition['service']): StepDefinition[] {
  return STEP_DEFINITIONS.filter(step => step.service === service);
}

// Función helper para obtener pasos requeridos
export function getRequiredSteps(): StepDefinition[] {
  return STEP_DEFINITIONS.filter(step => step.required);
}

// Función helper para obtener todos los pasos implementados
export function getImplementedSteps(): StepDefinition[] {
  return STEP_DEFINITIONS;
}

// Exportar el total de pasos
export const TOTAL_STEPS = STEP_DEFINITIONS.length;
