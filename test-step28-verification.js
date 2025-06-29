const { spawn } = require('child_process');

console.log('🔍 Step 28 Screenshot Verification Test');
console.log('=====================================');

const logProcess = spawn('node', ['dist/main.js'], {
  stdio: 'pipe'
});

let beforeStep28Screenshot = '';
let afterStep28Screenshot = '';

logProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Track screenshot before Step 28
  if (output.includes('milestone_original_selected_') && output.includes('Screenshot')) {
    const match = output.match(/milestone_original_selected_([^.]+\.png)/);
    if (match) {
      beforeStep28Screenshot = match[0];
      console.log('📸 BEFORE Step 28:', beforeStep28Screenshot);
    }
  }
  
  // Track Step 28 execution
  if (output.includes('PASO 28') && output.includes('Seleccionando opción')) {
    console.log('🎯 STEP 28 STARTED');
  }
  
  // Track screenshot after Step 28
  if (output.includes('milestone_publicacion_web_selected_') && output.includes('Screenshot')) {
    const match = output.match(/milestone_publicacion_web_selected_([^.]+\.png)/);
    if (match) {
      afterStep28Screenshot = match[0];
      console.log('📸 AFTER Step 28:', afterStep28Screenshot);
    }
  }
  
  // Track Step 28 completion
  if (output.includes('PASO 28 COMPLETADO')) {
    console.log('✅ STEP 28 COMPLETED');
  }
  
  // Track final verification screenshot
  if (output.includes('milestone_final_state_verification_') && output.includes('Screenshot')) {
    const match = output.match(/milestone_final_state_verification_([^.]+\.png)/);
    if (match) {
      console.log('📸 FINAL STATE:', match[0]);
    }
  }
  
  // Stop after final verification
  if (output.includes('PASO 29 COMPLETADO')) {
    console.log('🔚 Process completed, stopping test...');
    logProcess.kill();
  }
});

logProcess.on('close', (code) => {
  console.log(`\n📊 Screenshot Analysis:`);
  console.log(`- Before Step 28: ${beforeStep28Screenshot || 'Not captured'}`);
  console.log(`- After Step 28: ${afterStep28Screenshot || 'Not captured'}`);
  
  if (beforeStep28Screenshot && afterStep28Screenshot) {
    console.log(`\n🔍 Manual Verification Needed:`);
    console.log(`1. Compare these two screenshots to see if anything changed`);
    console.log(`2. Look for "¿Es una publicación Web?" field in both images`);
    console.log(`3. Verify if "No" was actually selected in the second image`);
  } else {
    console.log(`\n❌ Could not capture before/after screenshots for comparison`);
  }
});

// Kill after 4 minutes
setTimeout(() => {
  logProcess.kill();
}, 4 * 60 * 1000);