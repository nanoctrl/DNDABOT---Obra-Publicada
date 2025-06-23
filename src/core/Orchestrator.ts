import { config } from '../config';
import { logger } from '../common/logger';
import { initializeBrowser, closeBrowser, BrowserManager } from '../common/browserManager';
import { createDebugSnapshot, createFailureReport } from '../common/debugSnapshot';
import { analyzePage, generatePageReport } from '../common/pageAnalyzer';
import { takeScreenshot } from '../common/screenshotManager';
import { runCriticalTask } from '../common/taskRunner';
import { AfipAuthService } from '../services/afipAuth.service';
import { TadRegistrationService } from '../services/tadRegistration.service';
import { readInputData } from './dataReader';
import { updateManifest } from './manifestUpdater';
import path from 'path';
import fs from 'fs/promises';

export interface OrchestratorOptions {
  exploratoryMode?: boolean;
}

export class Orchestrator {
  private browserManager?: BrowserManager;
  private authService?: AfipAuthService;
  private registrationService?: TadRegistrationService;
  private runPath?: string;

  async run(options: OrchestratorOptions = {}): Promise<void> {
    const startTime = Date.now();
    let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let error: Error | undefined;
    let failureReportPath: string | undefined;

    try {
      logger.info('=== Iniciando Orquestador ===');
      logger.info(`Modo exploratorio: ${options.exploratoryMode ? 'SÍ' : 'NO'}`);
      logger.info(`Debug mode: ${config.DEVELOPER_DEBUG_MODE ? 'SÍ' : 'NO'}`);

      // Create run directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.runPath = path.join(config.OUTPUT_DIR, 'runs', `run_${timestamp}`);
      await fs.mkdir(this.runPath, { recursive: true });

      // Initialize browser
      this.browserManager = await initializeBrowser();
      // Browser manager initialized successfully

      if (options.exploratoryMode) {
        await this.runExploratoryMode();
        return;
      }

      // Normal execution mode
      await this.runNormalMode();

    } catch (err) {
      status = 'FAILED';
      error = err as Error;
      logger.error('Error en el orquestador:', error);
      
      // Create failure report if we have a page
      if (this.browserManager?.page && this.runPath) {
        failureReportPath = await createFailureReport(
          this.browserManager.page,
          error,
          'orchestrator_error',
          { timestamp: new Date().toISOString() }
        );
      }
      
      throw error;
    } finally {
      // Generate final state report if in developer mode
      if (config.DEVELOPER_DEBUG_MODE && this.browserManager?.page && this.runPath) {
        await this.generateFinalStateReport();
      }

      // Close browser
      if (this.browserManager) {
        await closeBrowser(this.browserManager);
      }

      // Update manifest
      const duration = Date.now() - startTime;
      await updateManifest({
        status,
        duration,
        error: error?.message,
        failureReportPath,
        runArtifactsPath: this.runPath
      });

      logger.info(`=== Orquestador finalizado en ${duration}ms ===`);
    }
  }

  private async generateFinalStateReport(): Promise<void> {
    if (!this.browserManager?.page || !this.runPath) return;

    logger.info('📸 Generando informe de estado final...');
    
    const reportDir = path.join(this.runPath, 'final_state_report');
    await fs.mkdir(reportDir, { recursive: true });

    try {
      // Take debug snapshot
      await createDebugSnapshot(this.browserManager.page, 'final_state', 'Estado final de la aplicación');

      // Analyze page
      const analysis = await analyzePage(this.browserManager.page);
      
      // Save page analysis
      await fs.writeFile(
        path.join(reportDir, 'page_analysis.json'),
        JSON.stringify(analysis, null, 2),
        'utf-8'
      );

      // Generate and save README
      const report = await generatePageReport(analysis);
      await fs.writeFile(
        path.join(reportDir, 'README.md'),
        report,
        'utf-8'
      );

      // Take and save screenshot
      const screenshotPath = await takeScreenshot(this.browserManager.page, 'final_state', 'debug');
      const screenshotBuffer = await fs.readFile(screenshotPath);
      await fs.writeFile(path.join(reportDir, 'screenshot.png'), screenshotBuffer);

      // Save page HTML
      const html = await this.browserManager.page.content();
      await fs.writeFile(path.join(reportDir, 'page.html'), html, 'utf-8');

      // Save accessibility tree
      const accessibilityTree = await this.browserManager.page.accessibility.snapshot();
      await fs.writeFile(
        path.join(reportDir, 'accessibility_tree.json'),
        JSON.stringify(accessibilityTree, null, 2),
        'utf-8'
      );

      logger.info(`✅ Informe de estado final guardado en: ${reportDir}`);
    } catch (error) {
      logger.error('Error generando informe de estado final:', error);
    }
  }

  private async runExploratoryMode(): Promise<void> {
    if (!this.browserManager) throw new Error('Browser not initialized');
    
    const { page } = this.browserManager;
    logger.info('🔍 Modo exploratorio activado');

    // Authenticate first
    this.authService = new AfipAuthService(page);
    await runCriticalTask('AFIP Authentication', async () => {
      await this.authService!.login();
    });

    // Navigate to TAD
    logger.info('Navegando a TAD...');
    await page.goto(config.TAD_URL);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await takeScreenshot(page, 'exploratory_tad_home', 'milestone');

    // Analyze page
    const analysis = await analyzePage(page);
    
    // Generate report
    const report = await generatePageReport(analysis);
    
    // Save results
    const resultDir = path.join(this.runPath!, 'exploration_results');
    await fs.mkdir(resultDir, { recursive: true });
    
    // Save analysis JSON
    await fs.writeFile(
      path.join(resultDir, 'page_analysis.json'),
      JSON.stringify(analysis, null, 2),
      'utf-8'
    );
    
    // Save README
    await fs.writeFile(
      path.join(resultDir, 'README.md'),
      report,
      'utf-8'
    );
    
    // Save screenshot
    const screenshotPath = await takeScreenshot(page, 'final_state', 'milestone');
    const screenshotBuffer = await fs.readFile(screenshotPath);
    await fs.writeFile(path.join(resultDir, 'final_state.png'), screenshotBuffer);
    
    logger.info(`📁 Resultados de exploración guardados en: ${resultDir}`);
    
    // Allow manual exploration if debug mode is on
    if (config.DEVELOPER_DEBUG_MODE) {
      logger.info('🔍 Modo debug activo. Usa el inspector de Playwright para explorar...');
      await page.pause();
    }
  }

  private async runNormalMode(): Promise<void> {
    if (!this.browserManager) throw new Error('Browser not initialized');
    
    const { page } = this.browserManager;
    
    // Read input data
    const inputData = await readInputData();
    logger.info(`📄 Datos de entrada cargados:`);
    logger.info(`  - Obra: ${inputData.obra.titulo}`);
    logger.info(`  - Tipo: ${inputData.obra.tipo}`);
    logger.info(`  - Autores: ${inputData.autores.length}`);
    logger.info(`  - Editores: ${inputData.editores?.length || 0}`);
    
    // Debug snapshot if enabled
    if (config.DEVELOPER_DEBUG_MODE) {
      await createDebugSnapshot(page, 'initial_state', 'Estado inicial antes de autenticación');
    }
    
    // Authenticate with AFIP using retry logic
    this.authService = new AfipAuthService(page);
    await runCriticalTask('AFIP Login', async () => {
      await this.authService!.login();
    });
    
    // Debug snapshot after login
    if (config.DEVELOPER_DEBUG_MODE) {
      await createDebugSnapshot(page, 'after_login', 'Estado después del login en AFIP');
    }
    
    // Process the registration
    this.registrationService = new TadRegistrationService(page);
    
    try {
      await runCriticalTask('TAD Registration', async () => {
        await this.registrationService!.registerObra(inputData);
      });
      
      logger.info(`✅ Obra registrada exitosamente: ${inputData.obra.titulo}`);
    } catch (error) {
      logger.error(`❌ Error al registrar obra ${inputData.obra.titulo}:`, error);
      
      // Create failure report
      if (this.runPath) {
        const failureReportPath = await createFailureReport(
          page,
          error as Error,
          `registro_obra_${inputData.obra.titulo}`,
          { obra: inputData.obra }
        );
        
        logger.error(`📁 Reporte de fallo guardado en: ${failureReportPath}`);
      }
      
      throw error;
    }
  }
}
