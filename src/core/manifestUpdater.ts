import fs from 'fs/promises';
import path from 'path';
import { logger } from '../common/logger';

interface ManifestData {
  projectName: string;
  version: string;
  status: string;
  lastRun: {
    timestamp: string;
    status: string;
    summary: string;
    duration?: number;
    error?: string;
    failureReportPath?: string;
    runArtifactsPath?: string;
  } | null;
  testSummary: {
    passed: number;
    failed: number;
    total: number;
    failedTests?: Array<{
      testFile: string;
      failureReportPath: string;
    }>;
  };
  latestExploration: {
    timestamp: string;
    reportPath: string;
  } | null;
  availableTasks: string[];
}

interface UpdateOptions {
  status: 'SUCCESS' | 'FAILED' | 'TESTS_FAILED';
  duration?: number;
  error?: string;
  failureReportPath?: string;
  runArtifactsPath?: string;
  testResults?: {
    passed: number;
    failed: number;
    failedTests?: Array<{
      testFile: string;
      failureReportPath: string;
    }>;
  };
  explorationPath?: string;
}

const MANIFEST_PATH = path.join(process.cwd(), 'bot_manifest.json');

export async function updateManifest(options: UpdateOptions): Promise<void> {
  try {
    // Read current manifest
    const currentContent = await fs.readFile(MANIFEST_PATH, 'utf-8');
    const manifest: ManifestData = JSON.parse(currentContent);
    
    // Update based on options
    const timestamp = new Date().toISOString();
    
    if (options.status === 'TESTS_FAILED' && options.testResults) {
      // Update test results
      manifest.testSummary = {
        passed: options.testResults.passed,
        failed: options.testResults.failed,
        total: options.testResults.passed + options.testResults.failed,
        failedTests: options.testResults.failedTests
      };
      
      manifest.lastRun = {
        timestamp,
        status: 'TESTS_FAILED',
        summary: `${options.testResults.failed} out of ${options.testResults.passed + options.testResults.failed} tests failed.`,
        duration: options.duration
      };
    } else if (options.explorationPath) {
      // Update exploration results
      manifest.latestExploration = {
        timestamp,
        reportPath: options.explorationPath
      };
      
      manifest.lastRun = {
        timestamp,
        status: 'SUCCESS',
        summary: 'Exploration completed successfully',
        duration: options.duration
      };
    } else {
      // Update normal run
      manifest.lastRun = {
        timestamp,
        status: options.status,
        summary: options.status === 'SUCCESS' 
          ? 'Bot execution completed successfully' 
          : `Bot execution failed: ${options.error || 'Unknown error'}`,
        duration: options.duration,
        error: options.error,
        failureReportPath: options.failureReportPath,
        runArtifactsPath: options.runArtifactsPath
      };
    }
    
    // Update status
    manifest.status = options.status === 'SUCCESS' ? 'READY' : 'ERROR';
    
    // Write back
    await fs.writeFile(
      MANIFEST_PATH,
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
    
    logger.info('Manifest actualizado correctamente');
  } catch (error) {
    logger.error('Error al actualizar manifest:', error);
    // Don't throw - manifest update failure shouldn't break the flow
  }
}

export async function readManifest(): Promise<ManifestData> {
  try {
    const content = await fs.readFile(MANIFEST_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.error('Error al leer manifest:', error);
    throw error;
  }
}
