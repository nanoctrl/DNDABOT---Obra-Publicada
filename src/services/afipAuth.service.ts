import { Page } from 'playwright';
import { config } from '../config';
import { createLogger } from '../common/logger';
import { takeScreenshot } from '../common/screenshotManager';
import { createDebugSnapshot } from '../common/debugSnapshot';
import { AfipLoginPage } from '../pages/AfipLoginPage';
import { TadDashboardPage } from '../pages/TadDashboard.page';
import { waitForNavigation } from '../common/interactionHelper';
import { StateManager } from '../core/stateManager';
import { getStepTracker } from '../common/stepTracker';

export class AfipAuthService {
  private page: Page;
  private logger = createLogger('AfipAuthService');
  private stateManager = StateManager.getInstance();
  private afipLoginPage: AfipLoginPage;
  private tadDashboardPage: TadDashboardPage;

  constructor(page: Page) {
    this.page = page;
    this.afipLoginPage = new AfipLoginPage(page);
    this.tadDashboardPage = new TadDashboardPage(page);
  }

  async login(): Promise<void> {
    this.logger.info('Iniciando autenticación en AFIP a través de TAD');
    
    try {
      // 1. Navegar a TAD
      await this.navigateToTad();
      
      // 2. Hacer click en INGRESAR
      await this.clickIngresar();
      
      // 3. Hacer click en "AFIP con tu clave fiscal"
      await this.clickAfipClaveFiscal();
      
      // 4-8. Proceso de login usando el Page Object
      const inputData = await this.getInputData();
      const representado = inputData?.gestor?.representado;
      
      await this.afipLoginPage.login(
        config.AFIP_CUIT,
        config.AFIP_PASSWORD,
        representado
      );
      
      // Verificar que estemos de vuelta en TAD
      await this.verifyTadDashboard();
      
      this.logger.info('✅ Autenticación en AFIP completada exitosamente');
      
    } catch (error) {
      this.logger.error('Error en autenticación AFIP:', error);
      await takeScreenshot(this.page, 'afip_auth_error', 'error');
      throw error;
    }
  }

  private async navigateToTad(): Promise<void> {
    const stepTracker = getStepTracker();
    stepTracker.startStep(1);
    
    const url = "https://tramitesadistancia.gob.ar/#/inicio";
    await this.page.goto(url);
    
    // Esperar a que la página cargue completamente
    await this.page.waitForTimeout(3000);
    await waitForNavigation(this.page);
    
    await takeScreenshot(this.page, 'tad_home', 'milestone');
    
    if (config.DEVELOPER_DEBUG_MODE) {
      await createDebugSnapshot(this.page, 'tad_home', 'Página principal de TAD');
    }
    
    stepTracker.logSuccess(1);
  }

  private async clickIngresar(): Promise<void> {
    const stepTracker = getStepTracker();
    stepTracker.startStep(2);
    
    try {
      // Usar locator más específico
      await this.page.locator("//span[@class='block' and text()='Ingresar']").click();
      stepTracker.logSuccess(2);
    } catch (error) {
      // Fallback a otros selectores
      try {
        await this.page.getByRole('button', { name: 'Ingresar' }).click();
        stepTracker.logSuccess(2);
      } catch {
        await this.page.locator("text=Ingresar").first().click();
        stepTracker.logSuccess(2);
      }
    }
    
    await this.page.waitForTimeout(2000);
  }

  private async clickAfipClaveFiscal(): Promise<void> {
    const stepTracker = getStepTracker();
    stepTracker.startStep(3);
    
    try {
      // Usar el selector más específico primero
      await this.page.locator("//div[@class='q-item__label' and text()='AFIP con tu clave fiscal']").click();
      stepTracker.logSuccess(3);
    } catch (error) {
      // Fallback
      try {
        await this.page.locator("text=AFIP con tu clave fiscal").click();
        stepTracker.logSuccess(3);
      } catch {
        throw new Error('No se pudo hacer click en AFIP con tu clave fiscal');
      }
    }
    
    await waitForNavigation(this.page);
  }

  private async verifyTadDashboard(): Promise<void> {
    try {
      // Verificar que estemos de vuelta en TAD
      await this.tadDashboardPage.assertIsReady();
      await takeScreenshot(this.page, 'tad_dashboard_after_login', 'milestone');
    } catch (error) {
      this.logger.warn('No se pudo verificar el dashboard de TAD:', error);
      // No es crítico, continuar
    }
  }

  private async getInputData(): Promise<any> {
    try {
      // Usar el state manager para obtener los datos
      const state = this.stateManager.getState();
      if (state) {
        return state.tramiteData;
      }
      
      // Fallback: leer del archivo
      const fs = await import('fs/promises');
      const path = await import('path');
      const dataDir = path.join(process.cwd(), 'data');
      const files = await fs.readdir(dataDir);
      const jsonFile = files.find(f => f.endsWith('.json'));
      
      if (jsonFile) {
        const content = await fs.readFile(path.join(dataDir, jsonFile), 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      this.logger.debug('No se pudieron leer datos de entrada:', error);
    }
    
    return null;
  }

  async logout(): Promise<void> {
    this.logger.info('Cerrando sesión en AFIP');
    
    try {
      // Buscar botón de salir
      const logoutButton = this.page.locator('button:has-text("Salir"), a:has-text("Salir"), button:has-text("Cerrar Sesión")');
      
      if (await logoutButton.count() > 0) {
        await logoutButton.first().click();
        await waitForNavigation(this.page);
        this.logger.info('Sesión cerrada exitosamente');
      } else {
        this.logger.warn('No se encontró botón de logout');
      }
    } catch (error) {
      this.logger.warn('No se pudo cerrar sesión:', error);
    }
  }
}
