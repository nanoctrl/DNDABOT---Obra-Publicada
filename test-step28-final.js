const { spawn } = require('child_process');

console.log('🚀 Final Step 28 test - Context-aware Web publication dropdown...');

const logProcess = spawn('node', ['dist/main.js'], {
  stdio: 'pipe',
  env: { ...process.env }
});

let contextFoundStep = false;
let dropdownFoundStep = false;
let selectionStep = false;
let finalSuccess = false;

logProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Look for context verification step
  if (output.includes('Found Web publication text') || output.includes('Locating "¿Es una publicación Web?"')) {
    console.log('🎯 CONTEXT FOUND:', output.trim());
    contextFoundStep = true;
  }
  
  // Look for dropdown discovery
  if (output.includes('has Si/No options') || output.includes('Testing combobox button')) {
    console.log('🔍 DROPDOWN TEST:', output.trim());
    dropdownFoundStep = true;
  }
  
  // Look for selection step
  if (output.includes('Selecting "No" option') || output.includes('Selecting "Si" option')) {
    console.log('✅ SELECTION STEP:', output.trim());
    selectionStep = true;
  }
  
  // Look for final success
  if (output.includes('SUCCESS: Option') && output.includes('selected in Web publication')) {
    console.log('🎉 FINAL SUCCESS:', output.trim());
    finalSuccess = true;
  }
  
  // Look for Step 28 completion
  if (output.includes('PASO 28 COMPLETADO') || (output.includes('28') && output.includes('SUCCESS'))) {
    console.log('✅ STEP 28 COMPLETED:', output.trim());
  }
  
  // Look for errors
  if (output.includes('ERROR') && output.includes('28')) {
    console.log('❌ STEP 28 ERROR:', output.trim());
  }
});

logProcess.stderr.on('data', (data) => {
  const error = data.toString();
  if (error.includes('28') || error.includes('publicación')) {
    console.log('❌ STDERR 28:', error.trim());
  }
});

logProcess.on('close', (code) => {
  console.log(`\n🔚 Process ended with code ${code}`);
  console.log(`Context verification: ${contextFoundStep}`);
  console.log(`Dropdown discovery: ${dropdownFoundStep}`);
  console.log(`Selection executed: ${selectionStep}`);
  console.log(`Final success: ${finalSuccess}`);
  
  if (finalSuccess) {
    console.log('\n🎉 STEP 28 DEBUGGING COMPLETED SUCCESSFULLY! 🎉');
  } else {
    console.log('\n⚠️ Need further debugging...');
  }
});

// Kill process after 4 minutes
setTimeout(() => {
  logProcess.kill();
  console.log('⏰ Process killed after timeout');
}, 4 * 60 * 1000);