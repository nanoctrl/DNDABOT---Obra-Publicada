import { Page } from 'playwright';
import { createLogger } from '../common/logger';
import { takeScreenshot } from '../common/screenshotManager';
import { Obra } from '../types';
import { ObraFormPage } from '../pages/ObraForm.page';
import { FormInteractionService } from './formInteractionService';
import { normalizarTexto, booleanToSiNo } from '../utils/textUtils';
import { DROPDOWN_OPTIONS } from '../constants/selectors';
import { getStepTracker } from '../common/stepTracker';

/**
 * Servicio especializado para manejar el formulario de datos de obra
 * Orquesta las interacciones usando Page Objects y servicios genéricos
 */
export class ObraFormService {
  private logger = createLogger('ObraFormService');
  private formPage: ObraFormPage;
  private formInteraction: FormInteractionService;

  constructor(private page: Page) {
    this.formPage = new ObraFormPage(page);
    this.formInteraction = new FormInteractionService(page);
  }

  /**
   * Abre el formulario de datos de obra (Paso 19)
   */
  async abrirFormularioObra(): Promise<void> {
    const stepTracker = getStepTracker();
    stepTracker.startStep(19);
    
    this.logger.info('📝 Abriendo formulario de datos de obra...');
    
    try {
      await this.formPage.clickCompletar();
      await takeScreenshot(this.page, 'datos_obra_abierto', 'milestone');
      
      this.logger.info('✅ Sección Datos de la obra a registrar abierta');
      this.logger.info('📝 En los próximos pasos se completarán los campos con los datos del JSON');
      
      stepTracker.logSuccess(19, 'Formulario abierto exitosamente');
    } catch (error) {
      stepTracker.logError(19, (error as Error).message);
      throw error;
    }
  }

  /**
   * Completa todos los datos básicos de la obra (Pasos 20-24)
   */
  async completarDatosBasicos(obra: Obra): Promise<void> {
    await this.completarTitulo(obra.titulo);
    await this.seleccionarTipoObra(obra.tipo);
    await this.seleccionarAlbum(obra.album);
    await this.completarCantidadEjemplares(obra.cantidad_ejemplares);
    await this.completarGeneroMusical(obra.genero_musical);
  }

  /**
   * Completa el título de la obra (Paso 20)
   */
  private async completarTitulo(titulo: string): Promise<void> {
    const stepTracker = getStepTracker();
    stepTracker.startStep(20);
    
    this.logger.info(`📝 Completando título de la obra: "${titulo}"`);
    
    try {
      await this.formPage.fillTitulo(titulo);
      await this.page.waitForTimeout(1000);
      await takeScreenshot(this.page, 'titulo_obra_completado', 'debug');
      
      this.logger.info(`✅ Título de la obra completado: "${titulo}"`);
      stepTracker.logSuccess(20, 'Título completado');
    } catch (error) {
      stepTracker.logError(20, (error as Error).message);
      throw new Error(`Error al completar título: ${(error as Error).message}`);
    }
  }

  /**
   * Selecciona el tipo de obra (Paso 21)
   */
  private async seleccionarTipoObra(tipo: string): Promise<void> {
    this.logger.info(`📝 Seleccionando tipo de obra: "${tipo}"`);
    
    // Normalizar el tipo del JSON para comparación
    const tipoNormalizado = normalizarTexto(tipo);
    
    // Mapeo de tipos normalizados a opciones exactas del dropdown
    const opcionesDropdown: { [key: string]: string } = {
      'letra': 'Letra',
      'musica': 'Música',
      'musica y letra': 'Música y letra'
    };
    
    // Encontrar la opción correcta
    let opcionASeleccionar = '';
    for (const [clave, valor] of Object.entries(opcionesDropdown)) {
      if (tipoNormalizado === clave) {
        opcionASeleccionar = valor;
        break;
      }
    }
    
    if (!opcionASeleccionar) {
      throw new Error(`Tipo de obra no reconocido: "${tipo}". Opciones válidas: ${DROPDOWN_OPTIONS.tipoObra.join(', ')}`);
    }
    
    this.logger.info(`➡️ Opción a seleccionar: "${opcionASeleccionar}"`);
    
    // Usar el método genérico para seleccionar en el dropdown
    await this.formInteraction.seleccionarEnDropdownGenerico(
      'Tipo de obra',
      opcionASeleccionar,
      21,
      [...DROPDOWN_OPTIONS.tipoObra],
      'cBIQn-btn'
    );
    
    await takeScreenshot(this.page, 'tipo_obra_seleccionado', 'debug');
  }

  /**
   * Selecciona si es álbum o no (Paso 22)
   */
  private async seleccionarAlbum(esAlbum: boolean): Promise<void> {
    // Convertir booleano a texto Si/No
    const opcionASeleccionar = booleanToSiNo(esAlbum);
    
    this.logger.info(`📝 Seleccionando álbum: ${esAlbum} → "${opcionASeleccionar}"`);
    
    // Usar el método genérico para seleccionar en el dropdown
    await this.formInteraction.seleccionarEnDropdownGenerico(
      'Álbum',
      opcionASeleccionar,
      22,
      [...DROPDOWN_OPTIONS.siNo],
      'dCCTu-btn'
    );
    
    await takeScreenshot(this.page, 'album_seleccionado', 'debug');
    
    this.logger.info(`✅ Álbum seleccionado: "${opcionASeleccionar}" (${esAlbum ? 'es álbum' : 'no es álbum'})`);
  }

  /**
   * Completa la cantidad de ejemplares (Paso 23)
   */
  private async completarCantidadEjemplares(cantidad: number): Promise<void> {
    await this.formInteraction.completarCampoNumerico(
      'Cantidad de ejemplares',
      cantidad,
      23,
      true // Validar que sea positivo
    );
    
    await takeScreenshot(this.page, 'cantidad_ejemplares_completada', 'debug');
    this.logger.info(`✅ Cantidad de ejemplares completada: ${cantidad}`);
  }

  /**
   * Completa el género musical (Paso 24)
   */
  private async completarGeneroMusical(genero: string): Promise<void> {
    const stepTracker = getStepTracker();
    stepTracker.startStep(24);
    
    this.logger.info(`🎵 Completando género musical: "${genero}"`);
    
    // Validar que no esté vacío
    if (!genero || genero.trim().length === 0) {
      throw new Error('El género musical no puede estar vacío');
    }
    
    try {
      await this.formPage.fillGeneroMusical(genero);
      await this.page.waitForTimeout(1000);
      await takeScreenshot(this.page, 'genero_musical_completado', 'debug');
      
      this.logger.info(`✅ Género musical completado: "${genero}"`);
      stepTracker.logSuccess(24, 'Género musical completado');
    } catch (error) {
      stepTracker.logError(24, (error as Error).message);
      throw new Error(`Error al completar género musical: ${(error as Error).message}`);
    }
  }


  /**
   * Completa la fecha de publicación (Paso 25)
   */
  async completarFechaPublicacion(fecha: string): Promise<void> {
    await this.formInteraction.completarCampoFecha(
      'Fecha de publicación',
      fecha,
      25,
      'DD-MM-YYYY'
    );
    
    await takeScreenshot(this.page, 'fecha_publicacion_completada', 'debug');
    this.logger.info(`✅ Fecha de publicación completada: "${fecha}"`);
  }
}
