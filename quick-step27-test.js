const { spawn } = require('child_process');

console.log('🚀 Starting quick Step 27 test...');

const process = spawn('npm', ['run', 'start'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

let output = '';
let foundStep27 = false;
let testComplete = false;

// Set timeout to kill process after 3 minutes max
const timeout = setTimeout(() => {
  if (!testComplete) {
    console.log('⏰ Test timeout - killing process');
    process.kill();
    testComplete = true;
  }
}, 180000); // 3 minutes

process.stdout.on('data', (data) => {
  const chunk = data.toString();
  output += chunk;
  
  // Look for Step 27 execution
  if (chunk.includes('PASO 27') || chunk.includes('Step 27') || chunk.includes('Original')) {
    console.log('🎯 Step 27 found:', chunk.trim());
    foundStep27 = true;
  }
  
  // Look for DOM inspection logs
  if (chunk.includes('Found') && chunk.includes('checkboxes')) {
    console.log('🔍 DOM Inspection:', chunk.trim());
  }
  
  // Look for strategy results
  if (chunk.includes('SUCCESS') && chunk.includes('Original')) {
    console.log('✅ SUCCESS:', chunk.trim());
    clearTimeout(timeout);
    setTimeout(() => {
      process.kill();
      testComplete = true;
    }, 2000); // Give 2 more seconds then kill
  }
  
  // Look for errors
  if (chunk.includes('Error') && chunk.includes('Original')) {
    console.log('❌ ERROR:', chunk.trim());
  }
  
  // Kill after Step 27 is done (success or fail)
  if (foundStep27 && (chunk.includes('completado') || chunk.includes('failed') || chunk.includes('COMPLETADO'))) {
    clearTimeout(timeout);
    setTimeout(() => {
      if (!testComplete) {
        console.log('🏁 Step 27 completed - ending test');
        process.kill();
        testComplete = true;
      }
    }, 3000); // Wait 3 seconds then kill
  }
});

process.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

process.on('close', (code) => {
  clearTimeout(timeout);
  testComplete = true;
  console.log(`\n🔚 Process ended with code ${code}`);
  console.log(foundStep27 ? '✅ Step 27 was reached' : '❌ Step 27 was not reached');
});