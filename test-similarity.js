#!/usr/bin/env node

/**
 * Demostración del algoritmo de similitud usado para encontrar el representado
 * Ejecutar con: node test-similarity.js
 */

// Función para calcular similitud entre strings (misma que usa el bot)
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().replace(/\s+/g, ' ').trim();
  const s2 = str2.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // Si son exactamente iguales
  if (s1 === s2) return 1.0;
  
  // Algoritmo de distancia de Levenshtein normalizado
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = (a, b) => {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  };
  
  const distance = editDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Texto que buscaremos (del JSON)
const busqueda = "EPSA PUBLISHING S A";

// Posibles opciones que podrían aparecer en el dropdown
const opcionesDropdown = [
  "EPSA PUBLISHING S.A.",
  "EPSA PUBLISHING SA",
  "EPSA PUBLISHING S A",
  "EPSA PUBLISHING S. A.",
  "EPSA PUBLISHING S.A",
  "EPSA Publishing S.A.",
  "EPSA-PUBLISHING S.A.",
  "EPSA PUBLISHING SRL",
  "EDITORIAL EPSA S.A.",
  "OTRA EMPRESA S.A."
];

console.log('🔍 Demostración del Algoritmo de Búsqueda por Similitud');
console.log('================================================\n');
console.log(`Buscando: "${busqueda}"`);
console.log(`Umbral mínimo de similitud: 90%\n`);
console.log('Opciones en el dropdown y su similitud:');
console.log('---------------------------------------');

const opcionesValidas = [];

opcionesDropdown.forEach(opcion => {
  const similitud = calculateSimilarity(busqueda, opcion);
  const porcentaje = (similitud * 100).toFixed(1);
  const esValida = similitud >= 0.9;
  
  console.log(`${esValida ? '✅' : '❌'} "${opcion}" → ${porcentaje}% similitud`);
  
  if (esValida) {
    opcionesValidas.push({ opcion, similitud, porcentaje });
  }
});

console.log('\n📊 Resumen:');
console.log('------------');
console.log(`Total de opciones: ${opcionesDropdown.length}`);
console.log(`Opciones válidas (≥90%): ${opcionesValidas.length}`);

if (opcionesValidas.length > 0) {
  console.log(`\n✅ El bot seleccionaría: "${opcionesValidas[0].opcion}" (${opcionesValidas[0].porcentaje}%)`);
} else {
  console.log('\n❌ No se encontraron opciones con similitud ≥90%');
  console.log('El bot continuaría sin seleccionar representado o pausaría para selección manual.');
}

// Ejemplos adicionales de cómo funciona la tolerancia
console.log('\n📝 Ejemplos de tolerancia del algoritmo:');
console.log('----------------------------------------');

const ejemplos = [
  ['EPSA PUBLISHING S A', 'EPSA  PUBLISHING  S  A'],  // Espacios extras
  ['EPSA PUBLISHING S A', 'epsa publishing s a'],      // Minúsculas
  ['EPSA PUBLISHING S A', 'EPSA PUBLISHING S.A.'],     // Puntos agregados
  ['EPSA PUBLISHING S A', 'EPSA PUBLISHNG S A'],       // Typo menor
  ['EPSA PUBLISHING S A', 'EPSA PUB S A']              // Abreviación
];

ejemplos.forEach(([original, variacion]) => {
  const sim = calculateSimilarity(original, variacion);
  const pct = (sim * 100).toFixed(1);
  console.log(`"${original}" vs "${variacion}" → ${pct}%`);
});
