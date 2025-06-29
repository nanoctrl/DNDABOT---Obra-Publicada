const { getStepTracker } = require('./dist/common/stepTracker');
const { TOTAL_STEPS } = require('./dist/config/steps.config');

console.log('🔍 Testing Step Numbering Fix');
console.log('===============================');

// Test step tracker initialization
const stepTracker = getStepTracker();

// Test step numbering
console.log(`📊 Total steps configured: ${TOTAL_STEPS}`);

// Test a few step headers
console.log('\n🧪 Testing step headers:');
stepTracker.startStep(1);
stepTracker.startStep(26);
stepTracker.startStep(27);
stepTracker.startStep(28);
stepTracker.startStep(29);

// Test progress reporting
const progress = stepTracker.getProgress();
console.log(`\n📈 Progress tracking: ${progress.completed}/${progress.total} steps`);

console.log('\n✅ Step numbering test completed!');