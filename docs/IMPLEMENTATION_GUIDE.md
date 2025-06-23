# Guía de Implementación de Tareas

Este documento detalla las tareas implementadas en el bot y cómo se mapean desde el script Python original.

## Flujo de Autenticación (AfipAuthService)

### 1. Navegar a TAD
```typescript
private async navigateToTad(): Promise<void>
```
- URL: `https://tramitesadistancia.gob.ar/#/inicio`
- Espera 3 segundos para carga completa
- Toma screenshot: `tad_home`

### 2. Click en INGRESAR
```typescript
private async clickIngresar(): Promise<void>
```
Estrategias de selector:
- `//span[@class='block' and text()='Ingresar']`
- `button[role='button'][name='Ingresar']`
- `text=Ingresar`

### 3. Click en "AFIP con tu clave fiscal"
```typescript
private async clickAfipClaveFiscal(): Promise<void>
```
Estrategias de selector:
- `//div[@class='q-item__label' and text()='AFIP con tu clave fiscal']`
- `text=AFIP con tu clave fiscal`

### 4. Ingresar CUIT
```typescript
private async ingresarCuit(): Promise<void>
```
Estrategias de selector:
- `#F1:username`
- `input[name="username"]`
- `input[placeholder*="CUIT"]`

### 5. Click en Siguiente
```typescript
private async clickSiguiente(): Promise<void>
```
Estrategias de selector:
- `#F1:btnSiguiente`
- `button[role='button'][name='Siguiente']`

### 6. Ingresar Clave
```typescript
private async ingresarClave(): Promise<void>
```
Estrategias de selector:
- `#F1:password`
- `input[type="password"]`

### 7. Click en Ingresar (AFIP)
```typescript
private async clickIngresarAfip(): Promise<void>
```
Estrategias de selector:
- `#F1:btnIngresar`
- `button[role='button'][name='Ingresar']`

### 8. Seleccionar Representado
```typescript
private async seleccionarRepresentado(): Promise<void>
```
- Lee el representado desde el archivo de entrada
- Abre el dropdown y selecciona la opción correspondiente

## Flujo de Registro (TadRegistrationService)

### 9. Buscar Trámite
```typescript
private async buscarTramite(): Promise<void>
```
- Texto de búsqueda: "inscripcion de obra publicada - musical"
- Selectores: `#edit-keys`, `input[name='keys']`

### 10. Click en Iniciar Trámite
```typescript
private async clickIniciarTramite(): Promise<void>
```
Estrategias de selector:
- `a.btn-primary:has-text('Iniciar Trámite')`
- `a[type='submit']:has-text('Iniciar Trámite')`

### 11. Click en CONTINUAR
```typescript
private async clickContinuar(): Promise<void>
```
Estrategias de selector:
- `span:text-is('CONTINUAR')`
- `button[role='button'][name=/continuar/i]`

### 12. Completar Carátula
```typescript
private async completarCaratula(): Promise<void>
```
Estrategias de selector:
- `a[data-target='#collapseFormularioCaratula']`
- `a.btn-default:has-text('Completar')`

### 13. Seleccionar Opción SI
```typescript
private async seleccionarOpcionSi(): Promise<void>
```
- Verifica si ya está seleccionado
- Abre dropdown: `i.z-combobox-btn`
- Selecciona: `td.z-comboitem-text:has-text('Si')`

### 14. Insertar Email Notificaciones
```typescript
private async insertarEmailNotificaciones(email: string): Promise<void>
```
Estrategias de selector:
- `#uGxF_0`
- `input.z-textbox[name='nic_direccion_correo']`

### 15. Guardar Datos del Trámite
```typescript
private async guardarDatosTramite(): Promise<void>
```
Estrategias de selector:
- `div.z-toolbarbutton-cnt:text-is('GUARDAR')`
- `div[style*='background-color: #767676']`

### 16. Completar Condiciones del Trámite
```typescript
private async completarCondicionesTramite(): Promise<void>
```
Proceso de 3 pasos:
1. Click en Completar: `a[data-target='#collapseFormulario52240']`
2. Seleccionar "Si" en dropdown
3. Click en GUARDAR

### 17. Datos de la Obra a Registrar
```typescript
private async completarDatosObra(tramiteData: TramiteData): Promise<void>
```
- Abre el formulario de datos de obra
- TODO: Implementar campos específicos del formulario

## Características de Robustez

### Multi-Estrategia
Cada interacción tiene múltiples selectores para mayor confiabilidad:
```typescript
const strategies: InteractionStrategy[] = [
  { name: 'Método 1', locator: (page) => page.locator('selector1') },
  { name: 'Método 2', locator: (page) => page.locator('selector2') },
  { name: 'Método 3', locator: (page) => page.locator('selector3') }
];
```

### Manejo de Timeouts
- Timeouts específicos después de acciones importantes
- `waitForNavigation()` después de cambios de página
- Esperas explícitas para elementos dinámicos

### Logging y Screenshots
- Cada método registra su inicio y resultado
- Screenshots en puntos clave: `milestone`
- Screenshots de error: `error`
- Debug snapshots cuando `DEVELOPER_DEBUG_MODE=true`

## Próximos Pasos

1. Mapear campos específicos del formulario de obra
2. Implementar llenado de campos de obra (título, tipo, género, etc.)
3. Agregar campos de autores y editores
4. Implementar envío final del trámite
5. Agregar verificación de confirmación exitosa
