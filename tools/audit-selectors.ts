#!/usr/bin/env ts-node

/**
 * audit-selectors.ts
 * Herramienta para auditar la robustez de los selectores existentes
 * Uso: npm run tools:audit
 */

import { chromium } from 'playwright';
import { config } from '../src/config';
import { logger } from '../src/common/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

interface SelectorAudit {
  selector: string;
  description: string;
  file: string;
  status: 'valid' | 'invalid' | 'multiple' | 'not-found';
  count: number;
  suggestions?: string[];
}

// Lista de selectores a auditar (esto se puede expandir leyendo del código)
const SELECTORS_TO_AUDIT = [
  // AFIP Login selectors
  { selector: '#F1:username', description: 'AFIP Username field', file: 'afipAuth.service.ts' },
  { selector: '#F1\\:btnSiguiente', description: 'AFIP Next button', file: 'afipAuth.service.ts' },
  { selector: '#F1\\:password', description: 'AFIP Password field', file: 'afipAuth.service.ts' },
  { selector: '#F1\\:btnIngresar', description: 'AFIP Login button', file: 'afipAuth.service.ts' },
  
  // TAD selectors
  { selector: 'text="Nuevo Trámite"', description: 'TAD New procedure button', file: 'TadDashboard.page.ts' },
  { selector: '[data-testid="search-input"]', description: 'TAD Search input', file: 'TadDashboard.page.ts' },
];

async function auditSelectors() {
  const browser = await chromium.launch({
    headless: config.NODE_ENV === 'production',
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();
  
  const results: SelectorAudit[] = [];
  
  logger.info('🔍 Iniciando auditoría de selectores...');

  // Test AFIP selectors
  logger.info('\n📋 Auditando selectores de AFIP...');
  await page.goto(config.AFIP_URL);
  await page.waitForLoadState('networkidle');
  
  for (const selectorInfo of SELECTORS_TO_AUDIT.filter(s => s.file.includes('afip'))) {
    const audit = await auditSelector(page, selectorInfo);
    results.push(audit);
    logAuditResult(audit);
  }

  // Test TAD selectors (would need login first in real scenario)
  logger.info('\n📋 Auditando selectores de TAD...');
  try {
    await page.goto(config.TAD_URL);
    await page.waitForLoadState('networkidle');
    
    for (const selectorInfo of SELECTORS_TO_AUDIT.filter(s => s.file.includes('tad') || s.file.includes('Tad'))) {
      const audit = await auditSelector(page, selectorInfo);
      results.push(audit);
      logAuditResult(audit);
    }
  } catch (error) {
    logger.warn('No se pudo auditar TAD (requiere autenticación)');
  }

  // Generate report
  await generateReport(results);
  
  await browser.close();
  logger.info('\n✅ Auditoría completada');
}

async function auditSelector(page: any, selectorInfo: { selector: string; description: string; file: string }): Promise<SelectorAudit> {
  try {
    const count = await page.locator(selectorInfo.selector).count();
    
    let status: SelectorAudit['status'];
    const suggestions: string[] = [];
    
    if (count === 0) {
      status = 'not-found';
      // Try to suggest alternatives
      suggestions.push(...(await suggestAlternatives(page, selectorInfo)));
    } else if (count === 1) {
      status = 'valid';
    } else {
      status = 'multiple';
      suggestions.push(`Consider using :first or nth= to be more specific`);
    }
    
    return {
      ...selectorInfo,
      status,
      count,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  } catch (error) {
    return {
      ...selectorInfo,
      status: 'invalid',
      count: 0,
      suggestions: [`Error: ${error.message}`]
    };
  }
}

async function suggestAlternatives(page: any, selectorInfo: { selector: string; description: string }): Promise<string[]> {
  const suggestions: string[] = [];
  
  // Extract text from selector if it's a text selector
  const textMatch = selectorInfo.selector.match(/text=["'](.+)["']/);
  if (textMatch) {
    const text = textMatch[1];
    // Try partial text match
    const partialCount = await page.locator(`text=${text.substring(0, 10)}`).count();
    if (partialCount > 0) {
      suggestions.push(`Try partial text: text="${text.substring(0, 10)}"`);
    }
    
    // Try case-insensitive
    const caseInsensitiveCount = await page.locator(`text=/${text}/i`).count();
    if (caseInsensitiveCount > 0) {
      suggestions.push(`Try case-insensitive: text=/${text}/i`);
    }
  }
  
  // For ID selectors, check if ID changed
  const idMatch = selectorInfo.selector.match(/#([^:]+)/);
  if (idMatch) {
    const baseId = idMatch[1];
    // Look for similar IDs
    const similarIds = await page.evaluate((base: string) => {
      const elements = document.querySelectorAll(`[id*="${base.substring(0, 3)}"]`);
      return Array.from(elements).map(el => el.id).slice(0, 3);
    }, baseId);
    
    if (similarIds.length > 0) {
      suggestions.push(`Similar IDs found: ${similarIds.join(', ')}`);
    }
  }
  
  return suggestions;
}

function logAuditResult(audit: SelectorAudit) {
  const icon = audit.status === 'valid' ? '✅' : 
               audit.status === 'multiple' ? '⚠️' : '❌';
  
  logger.info(`${icon} ${audit.description}`);
  logger.info(`   Selector: ${audit.selector}`);
  logger.info(`   Status: ${audit.status} (found ${audit.count})`);
  
  if (audit.suggestions) {
    logger.info(`   Suggestions:`);
    audit.suggestions.forEach(s => logger.info(`     - ${s}`));
  }
}

async function generateReport(results: SelectorAudit[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(config.OUTPUT_DIR, 'selector_audit', `audit_${timestamp}.json`);
  
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  
  // Generate summary
  const summary = {
    total: results.length,
    valid: results.filter(r => r.status === 'valid').length,
    invalid: results.filter(r => r.status === 'invalid').length,
    notFound: results.filter(r => r.status === 'not-found').length,
    multiple: results.filter(r => r.status === 'multiple').length,
  };
  
  logger.info('\n📊 Resumen de auditoría:');
  logger.info(`   Total selectores: ${summary.total}`);
  logger.info(`   ✅ Válidos: ${summary.valid}`);
  logger.info(`   ❌ No encontrados: ${summary.notFound}`);
  logger.info(`   ⚠️  Múltiples: ${summary.multiple}`);
  logger.info(`   🚫 Inválidos: ${summary.invalid}`);
  logger.info(`\n📁 Reporte guardado en: ${reportPath}`);
}

// Main execution
auditSelectors().catch((error) => {
  logger.error('Error fatal:', error);
  process.exit(1);
});
