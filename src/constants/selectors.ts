/**
 * Selectores centralizados para todos los formularios y páginas
 * Organizados por sección para facilitar mantenimiento
 */

// Selectores para autenticación AFIP
export const AFIP_SELECTORS = {
  ingresarButton: 'text=INGRESAR',
  afipClaveFiscalOption: 'text=con tu clave fiscal',
  cuitInput: '#F1\\:username',
  siguienteButton: '#F1\\:btnSiguiente',
  passwordInput: '#F1\\:password',
  ingresarAfipButton: '#F1\\:btnIngresar',
  representadoDropdown: '#F1\\:selectRol',
} as const;

// Selectores para navegación en TAD
export const TAD_NAVIGATION_SELECTORS = {
  searchInput: "input.input-lg.form-control.tt-input[name='keys']",
  searchInputAlt: '#edit-keys',
  iniciarTramiteButton: "a.btn-primary:has-text('Iniciar Trámite')",
  continuarButton: 'button:has(span:text-is("CONTINUAR"))',
  continuarSpan: 'span.block:text-is("CONTINUAR")',
} as const;

// Selectores para formulario de datos del trámite
export const DATOS_TRAMITE_SELECTORS = {
  completarButton: "a[data-target*='DatosTramite'], .panel:has-text('Datos del Trámite') a:has-text('Completar')",
  depositoDigitalDropdown: '#hVLQj-btn', // Actualizado con el ID grabado
  emailNotificacionesInput: '#uGxF_0',
  emailNotificacionesAlt: "input.z-textbox[name='nic_direccion_correo']",
  guardarButton: "div.z-toolbarbutton-cnt:text-is('GUARDAR')",
} as const;

// Selectores para condiciones del trámite
export const CONDICIONES_SELECTORS = {
  completarButton: "a[data-target='#collapseFormulario52240']",
  leidoDropdown: '#a47Qm-btn',
  guardarButton: '#dynform4 div:text-is("GUARDAR")',
} as const;

// Selectores para formulario de obra
export const OBRA_FORM_SELECTORS = {
  // Botón para abrir el formulario
  completarButton: 'list >> filter >> hasText=Datos de la obra a registrar >> locator >> a',
  
  // Campos del formulario
  tituloInput: 'input[name="titulo_obra_musical"]',
  tipoObraDropdown: '#cBIQn-btn',
  albumDropdown: '#dCCTu-btn',
  cantidadEjemplaresInput: 'input[name="cant_ejemplares_musical"]',
  generoMusicalInput: 'input[name="genero_musical"]',
  
  // Selectores genéricos para campos no mapeados aún
  fechaPublicacionInput: 'tr:has-text("Fecha de publicación") input[type="text"]',
  lugarPublicacionDropdown: 'tr:has-text("Lugar de publicación") [id$="-btn"]',
  publicacionWebDropdown: 'tr:has-text("Publicación web") [id$="-btn"]',
  numeroInternacionalInput: 'tr:has-text("Número Internacional") input[type="text"]',
  urlPaginaWebInput: 'tr:has-text("URL") input[type="text"], tr:has-text("Página web") input[type="text"]',
  
  // Botón guardar del formulario
  guardarButton: '#dynform5 div:text-is("GUARDAR")',
} as const;

// Selectores genéricos para dropdowns
export const DROPDOWN_SELECTORS = {
  // Patrones genéricos para encontrar dropdowns
  dropdownButton: '[id$="-btn"]',
  dropdownInput: 'input.z-combobox-inp',
  dropdownOption: 'td[role="gridcell"]',
  dropdownOptionVisible: 'td[role="gridcell"]:visible',
  comboitemText: 'td.z-comboitem-text',
  
  // Opciones comunes
  siOption: 'td:text-is("Si")',
  noOption: 'td:text-is("No")',
} as const;

// Selectores para mensajes y validación
export const MESSAGE_SELECTORS = {
  errorBox: '.z-errbox:visible',
  messageBox: '.z-messagebox-window:visible',
  validationError: '.z-errorbox',
} as const;

// Selectores para botones genéricos
export const BUTTON_SELECTORS = {
  guardar: 'div:text-is("GUARDAR")',
  guardarWithStyle: 'div[style*="background-color: #767676"]:text-is("GUARDAR")',
  completar: 'a:has-text("Completar")',
  completarWithIcon: 'a.btn-default:has(i.fa-pencil)',
} as const;

// Tipos de las opciones de dropdowns conocidas
export const DROPDOWN_OPTIONS = {
  tipoObra: ['Letra', 'Música', 'Música y letra'],
  siNo: ['Si', 'No'],
  depositoDigital: ['Si', 'No'],
} as const;

// Función helper para construir selectores de fila
export function buildRowSelector(labelText: string): string {
  return `tr:has(td:has-text("${labelText}"))`;
}

// Función helper para construir selector de dropdown en fila
export function buildRowDropdownSelector(labelText: string): string {
  return `${buildRowSelector(labelText)} [id$="-btn"]`;
}

// Función helper para construir selector de input en fila
export function buildRowInputSelector(labelText: string): string {
  return `${buildRowSelector(labelText)} input[type="text"]`;
}
