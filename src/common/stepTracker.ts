/**
 * Sistema de tracking simplificado para los pasos del bot
 * Mantiene un registro del progreso para todos los pasos configurados
 */

import { STEP_DEFINITIONS, TOTAL_STEPS } from '../config/steps.config';

interface StepResult {
  number: number;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'success' | 'error';
  startTime?: Date;
  endTime?: Date;
  strategy?: string;
  errorMessage?: string;
}

class StepTracker {
  private steps: Map<number, StepResult> = new Map();

  constructor() {
    // Inicializar todos los pasos configurados
    STEP_DEFINITIONS.forEach(stepDef => {
      this.steps.set(stepDef.number, {
        number: stepDef.number,
        name: stepDef.name,
        description: stepDef.description,
        status: 'pending'
      });
    });
  }

  startStep(stepNumber: number): void {
    if (stepNumber > TOTAL_STEPS) {
      console.warn(`Step ${stepNumber} is beyond the documented limit of ${TOTAL_STEPS} steps`);
      return;
    }

    const step = this.steps.get(stepNumber);
    if (!step) {
      console.warn(`Step ${stepNumber} not found in step definitions`);
      return;
    }

    step.status = 'in_progress';
    step.startTime = new Date();
    
    console.log(`\n============================================================`);
    console.log(`📋 PASO ${stepNumber}/${TOTAL_STEPS}: ${step.description}`);
    console.log(`============================================================`);
  }

  logSuccess(stepNumber: number, strategy?: string): void {
    const step = this.steps.get(stepNumber);
    if (!step) return;

    step.status = 'success';
    step.endTime = new Date();
    step.strategy = strategy;
    
    const strategyText = strategy ? ` - Estrategia exitosa: "${strategy}"` : '';
    console.log(`✅ PASO ${stepNumber} COMPLETADO${strategyText}`);
  }

  logError(stepNumber: number, errorMessage: string): void {
    const step = this.steps.get(stepNumber);
    if (!step) return;

    step.status = 'error';
    step.endTime = new Date();
    step.errorMessage = errorMessage;
    
    console.log(`❌ PASO ${stepNumber} FALLÓ: ${errorMessage}`);
  }

  getProgress(): { completed: number; total: number; percentage: number } {
    const completed = Array.from(this.steps.values()).filter(step => step.status === 'success').length;
    const total = TOTAL_STEPS; // Usar el total configurado
    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100)
    };
  }

  generateSummary(): string {
    const progress = this.getProgress();
    let summary = `\n🎯 RESUMEN DE EJECUCIÓN - ${progress.completed}/${progress.total} pasos (${progress.percentage}%)\n`;
    summary += `==================================================\n`;

    for (const step of this.steps.values()) {
      const icon = step.status === 'success' ? '✅' : 
                   step.status === 'error' ? '❌' : 
                   step.status === 'in_progress' ? '🔄' : '⏳';
      summary += `${icon} Paso ${step.number}: ${step.description}\n`;
      
      if (step.strategy) {
        summary += `   └─ Estrategia: ${step.strategy}\n`;
      }
      if (step.errorMessage) {
        summary += `   └─ Error: ${step.errorMessage}\n`;
      }
    }

    return summary;
  }
}

// Instancia singleton
let instance: StepTracker | null = null;

export function getStepTracker(): StepTracker {
  if (!instance) {
    instance = new StepTracker();
  }
  return instance;
}

export function resetStepTracker(): void {
  instance = null;
}