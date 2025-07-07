const { execSync } = require('child_process');

try {
  console.log('🔄 Building TypeScript project...');
  const result = execSync('npm run build', { encoding: 'utf8', cwd: __dirname });
  console.log('✅ Build successful!');
  console.log(result);
} catch (error) {
  console.log('❌ Build failed:');
  console.log(error.stdout);
  console.log(error.stderr);
}