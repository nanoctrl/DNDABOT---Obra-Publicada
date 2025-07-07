# registro-obras-bot

🤖 **Bot para automatizar el registro de obras musicales en DNDA Argentina (AFIP→TAD)**

[![Version](https://img.shields.io/badge/version-2.6.2-blue.svg)](https://github.com/your-repo/registro-obras-bot)
[![Status](https://img.shields.io/badge/status-PRODUCTION--READY-green.svg)](https://github.com/your-repo/registro-obras-bot)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 📋 Descripción

Este bot automatiza completamente el proceso de registro de obras musicales en la **Dirección Nacional del Derecho de Autor (DNDA)** a través del sistema **AFIP→TAD** (Trámites a Distancia). 

El sistema puede procesar **36 pasos automatizados** que incluyen:
- Autenticación en AFIP
- Navegación por el sistema TAD
- Completado de formularios complejos
- Carga de datos de obras, autores y editores
- Verificación y análisis final del estado

## 🚀 Características

- ✅ **100% Automatizado**: 36 pasos sin intervención manual
- 🎯 **Alta Precisión**: Selectores robustos con framework ZK
- 📊 **Análisis Completo**: Verificación de estado y debugging avanzado
- 🔄 **Recuperación de Errores**: Sistema de reintentos y análisis de fallos
- 📸 **Documentación Visual**: Screenshots automáticos de cada paso
- 🛠️ **Modo Desarrollador**: Debugging y exploración interactiva

## 🏗️ Arquitectura

```
📁 src/
├── 🎭 pages/          # Page Objects (Playwright)
├── 🔧 services/       # Lógica de negocio
├── 🌐 common/         # Utilidades compartidas
├── 📊 config/         # Configuración de pasos
└── 📝 types/          # Definiciones TypeScript

📁 data/               # Archivos de entrada (JSON)
📁 output/             # Logs, screenshots, análisis
📁 docs/               # Documentación técnica
```

## 🛠️ Instalación

```bash
# Clonar repositorio
git clone https://github.com/your-repo/registro-obras-bot.git
cd registro-obras-bot

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales AFIP
```

## 🎯 Uso Rápido

### Ejecución Normal
```bash
npm start
```

### Modo Desarrollador (con debugging)
```bash
DEVELOPER_DEBUG_MODE=true npm start
```

### Limpieza de Archivos
```bash
npm run clean:dry-run    # Ver qué se eliminaría
npm run clean:basic      # Limpieza básica (mantener 3 días)
npm run clean:full       # Limpieza completa (mantener 1 día)
npm run clean:all        # Eliminar todo
```

## 📊 Datos de Entrada

El bot utiliza archivos JSON con la siguiente estructura:

### Obra Musical
```json
{
  "titulo": "Mi Canción",
  "tipo": "Música y letra",
  "esPublicacionWeb": true,
  "urlPaginaWeb": "https://ejemplo.com/cancion",
  "fecha_publicacion": "15-03-2024"
}
```

### Autores
```json
{
  "nombre": { "primerNombre": "Juan" },
  "apellido": { "primerApellido": "Pérez" },
  "fiscalId": { "tipo": "CUIT", "numero": "20-12345678-9" },
  "rol": "Música y Letra"
}
```

### Editores
```json
{
  "tipoPersona": "Persona Juridica",
  "razonSocial": "Mi Editorial SA",
  "porcentajeTitularidad": 50
}
```

## 📈 Rendimiento

- **Tiempo Total**: ~3 minutos por obra
- **Paso 9**: <2s (optimizado 300%)
- **Paso 13**: <2s (optimizado 6400%)
- **Paso 16**: <1s (optimizado 5000%)
- **Paso 36**: <5s (con timeout protection)

## 🔧 Configuración

### Variables de Entorno
```env
AFIP_CUIT=20123456789
AFIP_PASSWORD=tu_password_seguro
AFIP_REPRESENTADO=NOMBRE_REPRESENTADO
```

### Archivo de Datos
Coloca tu archivo JSON en `data/tramite_ejemplo.json`

## 📝 Logs y Debugging

### Estructura de Salida
```
📁 output/
├── 📸 screenshots/    # Capturas de pantalla por paso
├── 📊 logs/          # Logs detallados de ejecución
├── 🔍 runs/          # Análisis completos por ejecución
└── 📋 snapshots/     # Estados DOM para debugging
```

### Análisis Step 36
El Step 36 genera análisis completos:
- **DOM Analysis**: Estructura completa de la página
- **Interactive Elements**: Catálogo de elementos clickeables
- **Form States**: Estado de completado de formularios
- **Screenshots**: Captura completa de página
- **Reports**: Resumen en Markdown

## 🐛 Solución de Problemas

### Errores Comunes

**❌ Error de autenticación AFIP**
```bash
# Verificar credenciales en .env
# Asegurar que AFIP_REPRESENTADO coincida exactamente
```

**❌ Timeout en Step 36**
```bash
# El sistema tiene timeout protection automático
# Revisa logs en output/logs/app.log
```

**❌ Selectores no encontrados**
```bash
# El bot usa selectores robustos con múltiples estrategias
# Reportar en issues si persiste
```

## 📚 Documentación

- [`CHANGELOG.md`](CHANGELOG.md) - Historial de cambios
- [`docs/CLAUDE_TECHNICAL.md`](docs/CLAUDE_TECHNICAL.md) - Arquitectura técnica
- [`docs/CLAUDE_WORKFLOW.md`](docs/CLAUDE_WORKFLOW.md) - Descripción de los 36 pasos
- [`docs/best_practices_for_this_project.md`](docs/best_practices_for_this_project.md) - Mejores prácticas

## 🔄 Desarrollo

### Agregar Nuevos Pasos
1. Definir en `src/config/steps.config.ts`
2. Implementar en servicio correspondiente
3. Usar multi-strategy pattern
4. Verificar estado real con screenshots
5. Documentar en `CHANGELOG.md`

### Comandos de Desarrollo
```bash
# Buscar optimizaciones
grep -r "SUCCESS_STRATEGY" src/

# Buscar implementación de paso específico
grep -r "step.*31" src/

# Herramienta de selectores
npm run tools:find-selector
```

## 🛡️ Seguridad

- ✅ Credenciales en variables de entorno
- ✅ No logging de información sensible
- ✅ Validación de datos de entrada
- ✅ Manejo seguro de errores

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/your-repo/registro-obras-bot/issues)
- **Documentación**: Ver carpeta `docs/`
- **Logs**: Revisar `output/logs/app.log`

---

<div align="center">
  <b>🎵 Automatizando el registro de obras musicales en Argentina 🇦🇷</b>
</div>