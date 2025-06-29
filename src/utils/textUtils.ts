/**
 * Utilidades para manipulación y normalización de texto
 */

/**
 * Normaliza texto removiendo tildes y convirtiendo a minúsculas
 * para comparación flexible
 * @param texto - Texto a normalizar
 * @returns Texto normalizado sin tildes y en minúsculas
 */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remueve diacríticos (tildes)
    .trim();
}

/**
 * Compara dos textos de forma flexible (ignora tildes y mayúsculas)
 * @param texto1 - Primer texto a comparar
 * @param texto2 - Segundo texto a comparar
 * @returns true si los textos son equivalentes
 */
export function sonTextosEquivalentes(texto1: string, texto2: string): boolean {
  return normalizarTexto(texto1) === normalizarTexto(texto2);
}

/**
 * Valida formato de fecha DD-MM-YYYY
 * @param fecha - Fecha a validar
 * @returns true si el formato es válido
 */
export function esFechaValida(fecha: string): boolean {
  const fechaRegex = /^\d{2}-\d{2}-\d{4}$/;
  return fechaRegex.test(fecha);
}

/**
 * Valida formato de CUIT/CUIL XX-XXXXXXXX-X
 * @param cuit - CUIT/CUIL a validar
 * @returns true si el formato es válido
 */
export function esCuitValido(cuit: string): boolean {
  const cuitRegex = /^\d{2}-\d{8}-\d{1}$/;
  return cuitRegex.test(cuit);
}

/**
 * Convierte un booleano a Si/No en español
 * @param valor - Valor booleano
 * @returns "Si" o "No"
 */
export function booleanToSiNo(valor: boolean): string {
  return valor ? 'Si' : 'No';
}

/**
 * Limpia y formatea un texto para usar como selector CSS
 * @param texto - Texto a formatear
 * @returns Texto formateado para selector
 */
export function textoASelector(texto: string): string {
  return texto.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}
