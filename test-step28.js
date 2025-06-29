const { spawn } = require('child_process');

console.log('🚀 Starting Step 28 test...');

const logProcess = spawn('node', ['dist/main.js'], {
  stdio: 'pipe',
  env: { ...process.env }
});

let step28Found = false;

logProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Look for Step 28 specific logs
  if (output.includes('PASO 28') || output.includes('Step 28') || output.includes('publicación Web')) {
    console.log('🎯 Step 28 found:', output.trim());
    step28Found = true;
  }
  
  // Look for success indicators
  if (output.includes('SUCCESS') && (output.includes('28') || output.includes('publicación Web'))) {
    console.log('✅ SUCCESS:', output.trim());
  }
  
  // Look for error indicators
  if (output.includes('ERROR') || output.includes('Error')) {
    console.log('❌ ERROR:', output.trim());
  }
});

logProcess.stderr.on('data', (data) => {
  const error = data.toString();
  console.log('❌ STDERR:', error.trim());
});

logProcess.on('close', (code) => {
  console.log(`\n🔚 Process ended with code ${code}`);
  if (step28Found) {
    console.log('✅ Step 28 was reached');
  } else {
    console.log('❌ Step 28 was not found in logs');
  }
});

// Kill process after 5 minutes to prevent hanging
setTimeout(() => {
  logProcess.kill();
  console.log('⏰ Process killed after timeout');
}, 5 * 60 * 1000);