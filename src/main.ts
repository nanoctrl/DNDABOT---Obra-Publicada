// Main entry point for the bot application
import { Orchestrator } from './core/Orchestrator';
import { logger } from './common/logger';
import { config } from './config';

async function main(): Promise<void> {
  try {
    logger.info('🤖 Iniciando Bot de Automatización de Trámites');
    logger.info(`Entorno: ${config.NODE_ENV}`);
    
    const orchestrator = new Orchestrator();
    
    // Check if running in exploratory mode
    const isExploratoryMode = process.argv.includes('--explore');
    
    await orchestrator.run({ exploratoryMode: isExploratoryMode });
    
    logger.info('✅ Bot finalizado correctamente');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error fatal en el bot:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Error no capturado:', error);
  process.exit(1);
});
