# Bot de Registro de Obra Publicada Musical

Bot de automatización para el registro de obras publicadas musicales en portales gubernamentales de Argentina (AFIP y TAD).

## 🚀 Características

- **Arquitectura Modular**: Diseñado para agregar fácilmente nuevas tareas de automatización
- **Robustez**: Implementa múltiples estrategias de interacción y reintentos automáticos
- **TDD**: Desarrollo orientado a pruebas desde el inicio
- **Depuración Avanzada**: Modo desarrollador con snapshots completos y análisis de página
- **Multi-Estrategia**: Cada interacción tiene múltiples selectores para mayor confiabilidad

## 📋 Requisitos Previos

- Node.js v18 o superior
- NPM v9 o superior
- Credenciales válidas de AFIP

## 🛠️ Instalación

1. Clonar el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd registro-obras-bot
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

4. Editar `.env` con tus credenciales:
```env
AFIP_CUIT=tu-cuit-aqui
AFIP_PASSWORD=tu-contraseña-aqui
```

## 📁 Estructura del Proyecto

```
registro-obras-bot/
├── data/                    # Archivos JSON de entrada
├── output/                  # Resultados de ejecución
│   ├── runs/               # Artefactos de cada ejecución
│   ├── screenshots/        # Capturas de pantalla
│   └── logs/              # Archivos de log
├── src/
│   ├── common/            # Utilidades compartidas
│   ├── config/            # Configuración
│   ├── core/              # Orquestador principal
│   ├── pages/             # Page Objects
│   ├── services/          # Servicios de negocio
│   └── types/             # Tipos y esquemas
├── tests/                 # Pruebas unitarias e integración
└── tools/                 # Herramientas de desarrollo
```

## 🎯 Uso

### Ejecución Normal

```bash
npm start
```

### Modo Exploración

```bash
npm run explore
```

### Ejecutar Tests

```bash
npm test
```

### Herramientas de Desarrollo

```bash
# Buscar selectores interactivamente
npm run tools:find-selector

# Auditar selectores existentes
npm run tools:audit
```

## 🔧 Configuración

### Variables de Entorno

- `AFIP_CUIT`: CUIT para login en AFIP
- `AFIP_PASSWORD`: Contraseña de AFIP
- `DEVELOPER_DEBUG_MODE`: Activa snapshots detallados (true/false)
- `NODE_ENV`: Entorno de ejecución (development/production)
- `LOG_LEVEL`: Nivel de logging (debug/info/warn/error)

### Archivo de Entrada

El bot lee archivos JSON desde la carpeta `data/`. Ver `data/tramite_ejemplo.json` para el formato esperado.

## 🐛 Depuración

### Modo Desarrollador

Activar en `.env`:
```env
DEVELOPER_DEBUG_MODE=true
```

Esto generará:
- Screenshots en cada paso crítico
- Análisis estructural de páginas
- Traces de Playwright
- Informes detallados de estado final

### Logs

Los logs se guardan en `output/logs/` con rotación automática.

## 🤝 Desarrollo

### Agregar Nueva Tarea

1. Crear nuevo servicio en `src/services/`
2. Crear Page Objects necesarios en `src/pages/`
3. Actualizar el Orchestrator
4. Escribir tests
5. Documentar cambios

### Protocolo TDD

1. Escribir test que falle (Rojo)
2. Implementar código mínimo para pasar (Verde)
3. Refactorizar (Limpieza)

### Protocolo de Interacción Multi-Estrategia

Cada Page Object debe implementar múltiples estrategias para localizar elementos:

```typescript
const strategies = [
  page.getByRole('button', { name: 'Enviar' }),
  page.getByText('Enviar'),
  page.locator('#submit-btn'),
  page.locator('[data-testid="submit"]')
];
```

## 📊 Estado del Proyecto

### Versión Actual: 1.1.0

**Tareas Implementadas:** 17 de X totales

✅ Autenticación AFIP a través de TAD
✅ Búsqueda y selección de trámite
✅ Inicio del proceso de registro
✅ Completar carátula y condiciones
🔄 Formulario de datos de obra (parcial)
⏳ Campos específicos de obra musical
⏳ Autores y editores
⏳ Envío final y confirmación

Ver [CHANGELOG.md](CHANGELOG.md) para detalles completos de cambios.
Ver [Guía de Implementación](docs/IMPLEMENTATION_GUIDE.md) para detalles técnicos.

## 🔐 Seguridad

- **Nunca** commits credenciales
- Usar variables de entorno para datos sensibles
- Revisar `.gitignore` antes de hacer push

## 📝 Formato de Datos de Entrada

```json
{
  "obra": {
    "titulo": "Nombre de la obra",
    "tipo": "Música y letra",
    "album": false,
    "cantidad_ejemplares": 500,
    "genero_musical": "Rock",
    "esPublicacionWeb": false,
    "lugar_publicacion": "Buenos Aires",
    "fecha_publicacion": "DD-MM-YYYY"
  },
  "autores": [{
    "nombre": { "primerNombre": "Juan" },
    "apellido": { "primerApellido": "Pérez" },
    "fiscalId": { "tipo": "CUIT", "numero": "20-12345678-9" },
    "nacionalidad": "Argentina",
    "rol": "Música y Letra"
  }],
  "editores": [{
    "tipoPersona": "Persona Juridica",
    "razonSocial": "Editorial S.A.",
    "cuit": "30-12345678-9",
    "email": "info@editorial.com",
    "telefono": "11-1234-5678",
    "porcentajeTitularidad": 10,
    "domicilio": {
      "calleYNumero": "Av. Corrientes 1234",
      "cp": "1043",
      "localidad": "CABA",
      "provincia": "CABA",
      "pais": "Argentina"
    }
  }],
  "gestor": {
    "cuitCuil": "20-98765432-1",
    "claveAfip": "contraseña",
    "representado": "Editorial S.A.",
    "emailNotificaciones": "gestor@email.com"
  }
}
```

## 🚨 Troubleshooting

### Error: "No se encontraron archivos JSON"
- Verificar que existe un archivo `.json` en la carpeta `data/`

### Error: "Timeout durante login"
- Verificar credenciales AFIP
- Aumentar timeout en configuración
- Revisar conectividad a internet

### Error: "Selector no encontrado"
- Ejecutar `npm run tools:audit` para verificar selectores
- Usar modo exploración para actualizar selectores

## 📚 Recursos

- [Documentación de Playwright](https://playwright.dev)
- [Zod - Validación de esquemas](https://zod.dev)
- [Winston - Logging](https://github.com/winstonjs/winston)

## 🔄 Actualizaciones Recientes

### v1.1.0 (2025-06-23)
- Implementadas las primeras 17 tareas del flujo de registro
- Actualizado schema para obras musicales
- Agregada autenticación AFIP a través de TAD
- Implementado proceso hasta apertura de formulario de obra

### v1.0.0 (2025-06-22)
- Estructura inicial del proyecto
- Configuración base y utilidades

## 📄 Licencia

Este proyecto es software propietario. Todos los derechos reservados.

## 👥 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

---

Desarrollado con ❤️ para automatizar procesos gubernamentales en Argentina
