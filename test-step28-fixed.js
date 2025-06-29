const { spawn } = require('child_process');

console.log('🔧 Testing Step 28 Fix for False Positive Issue');
console.log('=================================================');

const logProcess = spawn('node', ['dist/main.js'], {
  stdio: 'pipe'
});

let step28Started = false;
let step28Output = [];

logProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Track Step 28 execution
  if (output.includes('PASO 28') || output.includes('seleccionando opción en "¿Es una publicación Web?"')) {
    step28Started = true;
    console.log('🎯 STEP 28 STARTED:', output.trim());
  }
  
  // Capture Step 28 related logs
  if (step28Started && (
    output.includes('dropdown') || 
    output.includes('ZK option') || 
    output.includes('VERIFIED SUCCESS') || 
    output.includes('FORCED SUCCESS') ||
    output.includes('selection') ||
    output.includes('Si visible') ||
    output.includes('No visible') ||
    output.includes('PASO 28 COMPLETADO')
  )) {
    console.log('📝', output.trim());
    step28Output.push(output.trim());
  }
  
  // Stop after Step 28 completes
  if (output.includes('PASO 28 COMPLETADO')) {
    console.log('\n✅ Step 28 completed, stopping test...');
    logProcess.kill();
  }
});

logProcess.stderr.on('data', (data) => {
  const error = data.toString();
  if (error.includes('28') || error.includes('dropdown')) {
    console.log('❌ ERROR:', error.trim());
  }
});

logProcess.on('close', (code) => {
  console.log(`\n📊 Test Results:`);
  console.log(`- Step 28 started: ${step28Started}`);
  console.log(`- Output lines captured: ${step28Output.length}`);
  console.log(`- Process exit code: ${code}`);
  
  // Check for false positive indicators
  const hasForcedSuccess = step28Output.some(line => line.includes('FORCED SUCCESS'));
  const hasVerifiedSuccess = step28Output.some(line => line.includes('VERIFIED SUCCESS'));
  const hasZKSelector = step28Output.some(line => line.includes('ZK option'));
  
  console.log(`\n🔍 Analysis:`);
  console.log(`- Old "FORCED SUCCESS" logic used: ${hasForcedSuccess ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
  console.log(`- New "VERIFIED SUCCESS" logic used: ${hasVerifiedSuccess ? '✅ YES (GOOD)' : '❌ NO (BAD)'}`);
  console.log(`- ZK-specific selectors tried: ${hasZKSelector ? '✅ YES (GOOD)' : '❌ NO (BAD)'}`);
});

// Kill after 3 minutes
setTimeout(() => {
  console.log('\n⏰ Test timeout reached, stopping...');
  logProcess.kill();
}, 3 * 60 * 1000);