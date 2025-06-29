const { spawn } = require('child_process');

console.log('🚀 Quick Step 28 test - looking for dropdown strategy success...');

const logProcess = spawn('node', ['dist/main.js'], {
  stdio: 'pipe',
  env: { ...process.env }
});

let foundGlobalSearch = false;
let foundSuccess = false;

logProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Look for global search strategy
  if (output.includes('Global search for any dropdown') || output.includes('🌐 Global search')) {
    console.log('🌐 GLOBAL SEARCH:', output.trim());
    foundGlobalSearch = true;
  }
  
  // Look for Step 28 success
  if (output.includes('SUCCESS') && output.includes('28')) {
    console.log('✅ STEP 28 SUCCESS:', output.trim());
    foundSuccess = true;
  }
  
  // Look for ZK combobox button findings
  if (output.includes('Found') && output.includes('ZK combobox buttons')) {
    console.log('🔍 COMBOBOX DISCOVERY:', output.trim());
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
  console.log(`Global search attempted: ${foundGlobalSearch}`);
  console.log(`Step 28 success: ${foundSuccess}`);
});

// Kill process after 3 minutes
setTimeout(() => {
  logProcess.kill();
  console.log('⏰ Process killed after timeout');
}, 3 * 60 * 1000);