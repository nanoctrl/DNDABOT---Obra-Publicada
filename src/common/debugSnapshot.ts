import { Page } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { logger } from './logger';
import { takeScreenshot } from './screenshotManager';

interface DebugSnapshot {
  timestamp: string;
  url: string;
  title: string;
  screenshotPath: string;
  htmlPath: string;
  accessibilityTreePath: string;
  consoleMessages: any[];
}

export async function createDebugSnapshot(
  page: Page,
  name: string,
  context?: string
): Promise<DebugSnapshot | null> {
  if (!config.DEVELOPER_DEBUG_MODE) {
    return null;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotDir = path.join(
    config.OUTPUT_DIR,
    'debug_runs',
    `run_${timestamp}`,
    name
  );
  
  try {
    logger.info(`Creando debug snapshot: ${name}`);
    
    // Create directory
    await fs.mkdir(snapshotDir, { recursive: true });
    
    // Take screenshot
    const screenshotPath = await takeScreenshot(page, name, 'debug');
    
    // Save HTML content
    const htmlPath = path.join(snapshotDir, 'page.html');
    const htmlContent = await page.content();
    await fs.writeFile(htmlPath, htmlContent, 'utf-8');
    
    // Save accessibility tree
    const accessibilityTreePath = path.join(snapshotDir, 'accessibility_tree.json');
    const accessibilityTree = await page.accessibility.snapshot();
    await fs.writeFile(
      accessibilityTreePath,
      JSON.stringify(accessibilityTree, null, 2),
      'utf-8'
    );
    
    // Get console messages
    const consoleMessages: any[] = [];
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });
    
    // Create snapshot metadata
    const snapshot: DebugSnapshot = {
      timestamp,
      url: page.url(),
      title: await page.title(),
      screenshotPath,
      htmlPath,
      accessibilityTreePath,
      consoleMessages
    };
    
    // Save metadata
    const metadataPath = path.join(snapshotDir, 'metadata.json');
    await fs.writeFile(
      metadataPath,
      JSON.stringify(snapshot, null, 2),
      'utf-8'
    );
    
    // Save context if provided
    if (context) {
      const contextPath = path.join(snapshotDir, 'context.txt');
      await fs.writeFile(contextPath, context, 'utf-8');
    }
    
    logger.info(`Debug snapshot creado en: ${snapshotDir}`);
    
    return snapshot;
  } catch (error) {
    logger.error(`Error al crear debug snapshot ${name}:`, error);
    return null;
  }
}

export async function createFailureReport(
  page: Page,
  error: Error,
  step: string,
  additionalInfo?: Record<string, any>
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(
    config.OUTPUT_DIR,
    'debug_runs',
    `run_${timestamp}`
  );
  
  try {
    await fs.mkdir(reportDir, { recursive: true });
    
    // Create debug snapshot
    const snapshot = await createDebugSnapshot(page, 'failure', `Error en paso: ${step}`);
    
    // Create failure report
    const failureReport = {
      timestamp,
      step,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      page: {
        url: page.url(),
        title: await page.title()
      },
      snapshot: snapshot ? {
        screenshot: snapshot.screenshotPath,
        html: snapshot.htmlPath,
        accessibilityTree: snapshot.accessibilityTreePath
      } : null,
      additionalInfo
    };
    
    const reportPath = path.join(reportDir, 'failure_report.json');
    await fs.writeFile(
      reportPath,
      JSON.stringify(failureReport, null, 2),
      'utf-8'
    );
    
    logger.error(`Reporte de fallo creado: ${reportPath}`);
    
    return reportPath;
  } catch (reportError) {
    logger.error('Error al crear reporte de fallo:', reportError);
    throw reportError;
  }
}
