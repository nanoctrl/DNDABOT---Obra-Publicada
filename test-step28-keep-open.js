const { spawn } = require('child_process');

console.log('🚀 Running Step 28 with window kept open at the end...');

const logProcess = spawn('node', ['dist/main.js'], {
  stdio: 'pipe',
  env: { 
    ...process.env,
    KEEP_BROWSER_OPEN: '3000' // Keep browser open for 3 seconds
  }
});

let step28Found = false;
let step28Completed = false;

logProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Look for Step 28 execution
  if (output.includes('PASO 28') || output.includes('publicación Web')) {
    console.log('🎯 STEP 28:', output.trim());
    step28Found = true;
  }
  
  // Look for Step 28 completion
  if (output.includes('PASO 28 COMPLETADO')) {
    console.log('✅ STEP 28 COMPLETED:', output.trim());
    step28Completed = true;
  }
  
  // Look for dropdown detection
  if (output.includes('Found dropdown') || output.includes('Si visible') || output.includes('FORCED SUCCESS')) {
    console.log('🔍 DROPDOWN:', output.trim());
  }
  
  // Look for final success
  if (output.includes('Obra registrada exitosamente')) {
    console.log('🎉 FINAL SUCCESS:', output.trim());
  }
  
  // Look for browser status
  if (output.includes('Cerrando navegador') || output.includes('Esperando') || output.includes('segundos')) {
    console.log('🌐 BROWSER:', output.trim());
  }
});

logProcess.stderr.on('data', (data) => {
  const error = data.toString();
  if (error.includes('28') || error.includes('publicación')) {
    console.log('❌ STDERR:', error.trim());
  }
});

logProcess.on('close', (code) => {
  console.log(`\n🔚 Process ended with code ${code}`);
  console.log(`Step 28 executed: ${step28Found}`);
  console.log(`Step 28 completed: ${step28Completed}`);
  
  if (step28Completed) {
    console.log('\n🎉 SUCCESS! Step 28 completed successfully! 🎉');
    console.log('The browser window was kept open for 3 seconds at the end.');
  }
});

// Kill process after 5 minutes to prevent hanging
setTimeout(() => {
  logProcess.kill();
  console.log('⏰ Process killed after timeout');
}, 5 * 60 * 1000);