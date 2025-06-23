#!/usr/bin/env node

/**
 * Script de prueba rápida para verificar que el bot funcione correctamente
 * Ejecutar con: node test-run.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando prueba del bot de registro de obras...\n');

// Verificar que existe el archivo de datos
const fs = require('fs');
const dataFile = path.join(__dirname, 'data', 'tramite_ejemplo.json');

if (!fs.existsSync(dataFile)) {
  console.error('❌ Error: No se encontró el archivo de datos en', dataFile);
  console.log('Por favor, asegúrate de que existe el archivo data/tramite_ejemplo.json');
  process.exit(1);
}

// Leer y mostrar los datos que se usarán
try {
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  console.log('📋 Datos de la obra a registrar:');
  console.log(`   - Título: ${data.obra.titulo}`);
  console.log(`   - Tipo: ${data.obra.tipo}`);
  console.log(`   - Representado: ${data.gestor.representado}`);
  console.log(`   - Email notificaciones: ${data.gestor.emailNotificaciones}`);
  console.log('\n');
} catch (error) {
  console.error('❌ Error al leer el archivo de datos:', error.message);
  process.exit(1);
}

// Verificar variables de entorno
require('dotenv').config();

if (!process.env.AFIP_CUIT || !process.env.AFIP_PASSWORD) {
  console.error('❌ Error: Faltan las credenciales de AFIP en el archivo .env');
  console.log('Por favor, configura AFIP_CUIT y AFIP_PASSWORD en el archivo .env');
  process.exit(1);
}

console.log('✅ Credenciales de AFIP configuradas');
console.log(`✅ CUIT: ${process.env.AFIP_CUIT}`);
console.log('\n');

// Ejecutar el bot
console.log('🤖 Ejecutando el bot...\n');
console.log('ℹ️  El bot intentará:');
console.log('   1. Autenticarse en AFIP');
console.log('   2. Seleccionar el representado: ' + JSON.parse(fs.readFileSync(dataFile, 'utf8')).gestor.representado);
console.log('   3. Buscar el trámite de inscripción de obra musical');
console.log('   4. Completar el formulario con los datos de la obra');
console.log('\n');

const bot = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true
});

bot.on('error', (error) => {
  console.error('❌ Error al ejecutar el bot:', error);
});

bot.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ Bot ejecutado exitosamente');
  } else {
    console.log(`\n❌ El bot terminó con código de error: ${code}`);
  }
});
