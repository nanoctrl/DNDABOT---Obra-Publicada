#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testEnhancedStep36() {
  console.log('🔄 Testing Enhanced Step 36 Implementation...');
  
  try {
    // 1. Build the project first
    console.log('📦 Building project...');
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Build successful');
    
    // 2. Run the bot
    console.log('🤖 Starting bot execution...');
    const result = execSync('npm start', { 
      encoding: 'utf8', 
      cwd: __dirname,
      timeout: 300000, // 5 minutes timeout
      stdio: 'pipe'
    });
    
    console.log('✅ Bot execution completed');
    
    // 3. Check for Step 36 outputs
    console.log('🔍 Checking for Step 36 analysis outputs...');
    
    const outputDir = path.join(__dirname, 'output', 'runs');
    const runDirs = fs.readdirSync(outputDir)
      .filter(dir => dir.startsWith('step36_final_analysis_'))
      .sort()
      .reverse(); // Get most recent first
    
    if (runDirs.length > 0) {
      const latestAnalysis = runDirs[0];
      const analysisPath = path.join(outputDir, latestAnalysis);
      
      console.log(`📁 Found Step 36 analysis: ${latestAnalysis}`);
      
      // Check for expected files
      const expectedFiles = [
        'step36_dom_analysis_',
        'step36_interactive_elements_',
        'step36_analysis_report_'
      ];
      
      const analysisFiles = fs.readdirSync(analysisPath);
      let foundFiles = 0;
      
      expectedFiles.forEach(expectedFile => {
        const found = analysisFiles.some(file => file.startsWith(expectedFile));
        if (found) {
          foundFiles++;
          console.log(`✅ Found: ${expectedFile}*`);
        } else {
          console.log(`❌ Missing: ${expectedFile}*`);
        }
      });
      
      // Check subdirectories
      const subdirs = ['step36_screenshots_', 'step36_logs_', 'step36_state_'];
      subdirs.forEach(subdir => {
        const found = analysisFiles.some(file => file.startsWith(subdir));
        if (found) {
          foundFiles++;
          console.log(`✅ Found directory: ${subdir}*`);
        } else {
          console.log(`❌ Missing directory: ${subdir}*`);
        }
      });
      
      console.log(`\n📊 Test Results: ${foundFiles}/${expectedFiles.length + subdirs.length} components found`);
      
      if (foundFiles === expectedFiles.length + subdirs.length) {
        console.log('🎉 Enhanced Step 36 test PASSED!');
        return true;
      } else {
        console.log('❌ Enhanced Step 36 test FAILED - Missing components');
        return false;
      }
      
    } else {
      console.log('❌ No Step 36 analysis outputs found');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:');
    console.log(error.message);
    if (error.stdout) {
      console.log('STDOUT:', error.stdout);
    }
    if (error.stderr) {
      console.log('STDERR:', error.stderr);
    }
    return false;
  }
}

// Run the test
testEnhancedStep36().then(success => {
  process.exit(success ? 0 : 1);
});