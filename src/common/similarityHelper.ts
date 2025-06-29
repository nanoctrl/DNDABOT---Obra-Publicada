/**
 * Algoritmo optimizado de distancia de Levenshtein
 * con early termination cuando la similitud es muy baja
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/\s+/g, ' ').trim();
  const s2 = str2.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // Si son exactamente iguales
  if (s1 === s2) return 1.0;
  
  // Si uno está vacío
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Si la diferencia de longitud es muy grande, la similitud será baja
  const lengthDiff = Math.abs(s1.length - s2.length);
  const maxLength = Math.max(s1.length, s2.length);
  if (lengthDiff / maxLength > 0.5) return 0.0;
  
  // Implementación optimizada con early termination
  const matrix: number[][] = [];
  const maxDistance = Math.ceil(maxLength * 0.1); // 90% similarity threshold
  
  // Inicializar primera fila y columna
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Calcular distancia con early termination
  for (let i = 1; i <= s2.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
      rowMin = Math.min(rowMin, matrix[i][j]);
    }
    
    // Early termination si la distancia mínima es muy alta
    if (rowMin > maxDistance) {
      return 0.0;
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  return (maxLength - distance) / maxLength;
}

/**
 * Busca el texto más similar en un array de strings
 * Retorna el índice y la similitud
 */
export function findMostSimilar(
  target: string, 
  candidates: string[], 
  minSimilarity: number = 0.9
): { index: number; text: string; similarity: number } | null {
  let bestMatch = { index: -1, text: '', similarity: 0 };
  
  for (let i = 0; i < candidates.length; i++) {
    const similarity = calculateSimilarity(target, candidates[i]);
    if (similarity > bestMatch.similarity) {
      bestMatch = { index: i, text: candidates[i], similarity };
    }
    
    // Si encontramos una coincidencia exacta, no seguir buscando
    if (similarity === 1.0) break;
  }
  
  return bestMatch.similarity >= minSimilarity ? bestMatch : null;
}

/**
 * Cache para mejorar performance en búsquedas repetidas
 */
export class SimilarityCache {
  private cache: Map<string, number> = new Map();
  private maxSize: number = 1000;
  
  private getCacheKey(str1: string, str2: string): string {
    return `${str1}|${str2}`;
  }
  
  get(str1: string, str2: string): number | undefined {
    return this.cache.get(this.getCacheKey(str1, str2));
  }
  
  set(str1: string, str2: string, similarity: number): void {
    if (this.cache.size >= this.maxSize) {
      // Eliminar la primera entrada (FIFO)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(this.getCacheKey(str1, str2), similarity);
  }
  
  clear(): void {
    this.cache.clear();
  }
}
