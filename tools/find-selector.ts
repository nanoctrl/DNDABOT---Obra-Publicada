#!/usr/bin/env ts-node

/**
 * find-selector.ts
 * Herramienta interactiva para encontrar selectores en una página
 * Uso: npm run tools:find-selector
 */

import { chromium, Page } from 'playwright';
import { config } from '../src/config';
import { logger } from '../src/common/logger';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function findSelector() {
  const browser = await chromium.launch({
    headless: false,
    devtools: true,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null,
    recordVideo: {
      dir: './output/videos/',
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  logger.info('🔍 Herramienta de búsqueda de selectores iniciada');
  logger.info('Comandos disponibles:');
  logger.info('  - goto <url>: Navegar a una URL');
  logger.info('  - find <selector>: Buscar elementos con un selector');
  logger.info('  - text <texto>: Buscar elementos por texto');
  logger.info('  - role <rol> [nombre]: Buscar por rol ARIA');
  logger.info('  - record: Iniciar grabación de acciones');
  logger.info('  - pause: Pausar para inspección manual');
  logger.info('  - exit: Salir');

  while (true) {
    const input = await question('\n> ');
    const [command, ...args] = input.split(' ');

    try {
      switch (command) {
        case 'goto':
          const url = args.join(' ');
          logger.info(`Navegando a: ${url}`);
          await page.goto(url);
          await page.waitForLoadState('networkidle');
          break;

        case 'find':
          const selector = args.join(' ');
          const elements = await page.locator(selector).count();
          logger.info(`Encontrados ${elements} elementos con selector: ${selector}`);
          
          if (elements > 0) {
            await page.locator(selector).first().highlight();
            const texts = await page.locator(selector).allTextContents();
            texts.slice(0, 5).forEach((text, i) => {
              logger.info(`  [${i}]: ${text.substring(0, 50)}...`);
            });
          }
          break;

        case 'text':
          const searchText = args.join(' ');
          const textElements = await page.getByText(searchText).count();
          logger.info(`Encontrados ${textElements} elementos con texto: "${searchText}"`);
          
          if (textElements > 0) {
            await page.getByText(searchText).first().highlight();
          }
          break;

        case 'role':
          const [role, name] = args;
          const roleLocator = name 
            ? page.getByRole(role as any, { name })
            : page.getByRole(role as any);
          
          const roleElements = await roleLocator.count();
          logger.info(`Encontrados ${roleElements} elementos con rol: ${role}${name ? ` y nombre: ${name}` : ''}`);
          
          if (roleElements > 0) {
            await roleLocator.first().highlight();
          }
          break;

        case 'record':
          logger.info('🎬 Iniciando grabación... Usa el Inspector de Playwright');
          await page.pause();
          break;

        case 'pause':
          logger.info('⏸️  Pausado. Usa el Inspector de Playwright para explorar');
          await page.pause();
          break;

        case 'exit':
          logger.info('👋 Cerrando herramienta...');
          await browser.close();
          rl.close();
          process.exit(0);

        default:
          logger.warn(`Comando no reconocido: ${command}`);
      }
    } catch (error) {
      logger.error('Error:', error);
    }
  }
}

// Main execution
findSelector().catch((error) => {
  logger.error('Error fatal:', error);
  process.exit(1);
});
