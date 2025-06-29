import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { logger } from '../common/logger';
import { TramiteData } from '../types/schema';

export interface TaskStatus {
  taskId: string;
  taskName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  metadata?: Record<string, any>;
}

export interface ApplicationState {
  sessionId: string;
  startedAt: Date;
  lastUpdated: Date;
  tramiteData: TramiteData;
  currentTask?: string;
  tasks: TaskStatus[];
  globalMetadata: Record<string, any>;
}

export class StateManager {
  private static instance: StateManager;
  private state?: ApplicationState;
  private stateFilePath: string;
  private autoSaveInterval?: NodeJS.Timeout;
  private logger = logger.child({ context: 'StateManager' });

  private constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.stateFilePath = path.join(config.OUTPUT_DIR, 'state', `session_${timestamp}.json`);
  }

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  async initialize(tramiteData: TramiteData, sessionId?: string): Promise<void> {
    const stateDir = path.dirname(this.stateFilePath);
    await fs.mkdir(stateDir, { recursive: true });

    // Intentar cargar estado existente si se proporciona sessionId
    if (sessionId) {
      const existingStatePath = path.join(config.OUTPUT_DIR, 'state', `session_${sessionId}.json`);
      try {
        const existingState = await this.loadState(existingStatePath);
        if (existingState) {
          this.state = existingState;
          this.stateFilePath = existingStatePath;
          this.logger.info(`Estado existente cargado: ${sessionId}`);
          this.startAutoSave();
          return;
        }
      } catch (error) {
        this.logger.warn(`No se pudo cargar estado existente: ${sessionId}`);
      }
    }

    // Crear nuevo estado
    this.state = {
      sessionId: sessionId || new Date().toISOString().replace(/[:.]/g, '-'),
      startedAt: new Date(),
      lastUpdated: new Date(),
      tramiteData,
      tasks: this.initializeTasks(),
      globalMetadata: {}
    };

    await this.saveState();
    this.startAutoSave();
    this.logger.info(`Nuevo estado inicializado: ${this.state.sessionId}`);
  }

  private initializeTasks(): TaskStatus[] {
    return [
      { taskId: 'nav_tad', taskName: 'Navegación a TAD', status: 'pending', retryCount: 0 },
      { taskId: 'click_ingresar', taskName: 'Click en INGRESAR', status: 'pending', retryCount: 0 },
      { taskId: 'click_afip', taskName: 'Selección AFIP con clave fiscal', status: 'pending', retryCount: 0 },
      { taskId: 'input_cuit', taskName: 'Ingreso de CUIT', status: 'pending', retryCount: 0 },
      { taskId: 'click_siguiente', taskName: 'Click en Siguiente', status: 'pending', retryCount: 0 },
      { taskId: 'input_password', taskName: 'Ingreso de contraseña', status: 'pending', retryCount: 0 },
      { taskId: 'click_ingresar_afip', taskName: 'Click en Ingresar (AFIP)', status: 'pending', retryCount: 0 },
      { taskId: 'select_representado', taskName: 'Selección de representado', status: 'pending', retryCount: 0 },
      { taskId: 'search_tramite', taskName: 'Búsqueda de trámite', status: 'pending', retryCount: 0 },
      { taskId: 'click_iniciar', taskName: 'Click en Iniciar Trámite', status: 'pending', retryCount: 0 },
      { taskId: 'click_continuar', taskName: 'Click en CONTINUAR', status: 'pending', retryCount: 0 },
      { taskId: 'complete_caratula', taskName: 'Completar carátula', status: 'pending', retryCount: 0 },
      { taskId: 'select_si', taskName: 'Selección opción SI', status: 'pending', retryCount: 0 },
      { taskId: 'input_email', taskName: 'Insertar email notificaciones', status: 'pending', retryCount: 0 },
      { taskId: 'save_tramite', taskName: 'Guardar datos del trámite', status: 'pending', retryCount: 0 },
      { taskId: 'complete_conditions', taskName: 'Completar condiciones', status: 'pending', retryCount: 0 },
      { taskId: 'complete_obra_data', taskName: 'Completar datos de obra', status: 'pending', retryCount: 0 }
    ];
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus['status'],
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.state) {
      throw new Error('Estado no inicializado');
    }

    const task = this.state.tasks.find(t => t.taskId === taskId);
    if (!task) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    task.status = status;
    task.metadata = { ...task.metadata, ...metadata };

    if (status === 'in_progress') {
      task.startedAt = new Date();
      this.state.currentTask = taskId;
    } else if (status === 'completed') {
      task.completedAt = new Date();
    } else if (status === 'failed') {
      task.retryCount++;
    }

    this.state.lastUpdated = new Date();
    await this.saveState();

    this.logger.info(`Tarea actualizada: ${taskId} -> ${status}`);
  }

  async setGlobalMetadata(key: string, value: any): Promise<void> {
    if (!this.state) {
      throw new Error('Estado no inicializado');
    }

    this.state.globalMetadata[key] = value;
    this.state.lastUpdated = new Date();
    await this.saveState();
  }

  getState(): ApplicationState | undefined {
    return this.state ? { ...this.state } : undefined;
  }

  getNextPendingTask(): TaskStatus | undefined {
    if (!this.state) return undefined;
    return this.state.tasks.find(t => t.status === 'pending');
  }

  getTaskById(taskId: string): TaskStatus | undefined {
    if (!this.state) return undefined;
    return this.state.tasks.find(t => t.taskId === taskId);
  }

  canRetryTask(taskId: string): boolean {
    const task = this.getTaskById(taskId);
    if (!task) return false;
    return task.status === 'failed' && task.retryCount < config.MAX_RETRIES;
  }

  private async saveState(): Promise<void> {
    if (!this.state) return;

    try {
      await fs.writeFile(
        this.stateFilePath,
        JSON.stringify(this.state, null, 2),
        'utf-8'
      );
      this.logger.debug('Estado guardado correctamente');
    } catch (error) {
      this.logger.error('Error guardando estado:', error);
    }
  }

  private async loadState(filePath: string): Promise<ApplicationState | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  private startAutoSave(): void {
    // Guardar cada 30 segundos
    this.autoSaveInterval = setInterval(() => {
      this.saveState();
    }, 30000);
  }

  async cleanup(): Promise<void> {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    await this.saveState();
    this.logger.info('StateManager limpiado correctamente');
  }

  // Método para exportar el estado para análisis
  async exportStateReport(): Promise<string> {
    if (!this.state) {
      return 'No hay estado activo';
    }

    const completedTasks = this.state.tasks.filter(t => t.status === 'completed').length;
    const failedTasks = this.state.tasks.filter(t => t.status === 'failed').length;
    const pendingTasks = this.state.tasks.filter(t => t.status === 'pending').length;

    const report = `
# Reporte de Estado de Sesión

**ID de Sesión**: ${this.state.sessionId}
**Iniciado**: ${this.state.startedAt}
**Última actualización**: ${this.state.lastUpdated}
**Obra**: ${this.state.tramiteData.obra.titulo}

## Progreso de Tareas
- Completadas: ${completedTasks}/${this.state.tasks.length}
- Fallidas: ${failedTasks}
- Pendientes: ${pendingTasks}

## Detalle de Tareas
${this.state.tasks.map(t => `
### ${t.taskName}
- Estado: ${t.status}
- Reintentos: ${t.retryCount}
- Iniciado: ${t.startedAt || 'N/A'}
- Completado: ${t.completedAt || 'N/A'}
${t.error ? `- Error: ${t.error}` : ''}`).join('\n')}
`;

    return report;
  }
}
