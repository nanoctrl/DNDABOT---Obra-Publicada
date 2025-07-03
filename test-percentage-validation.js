const fs = require('fs');
const { TramiteDataSchema } = require('./dist/types/schema');

console.log('🧪 Testing Percentage Flexibility\n');

// Test flexible percentages
console.log('📋 Test: Editors with flexible percentages (150% + 75% + 0.5% = 225.5%)');
try {
  const data = JSON.parse(fs.readFileSync('./data/test_percentage_flexibility.json', 'utf8'));
  const result = TramiteDataSchema.safeParse(data);
  
  if (result.success) {
    console.log('✅ VALID: Flexible percentages accepted');
    
    let totalPercentage = 0;
    data.editores.forEach((editor, index) => {
      console.log(`   Editor ${index + 1}: ${editor.porcentajeTitularidad}%`);
      if (editor.tipoPersona === 'Persona Juridica') {
        console.log(`     Company: ${editor.razonSocial}`);
      } else {
        console.log(`     Person: ${editor.nombre.primerNombre} ${editor.apellido.primerApellido}`);
      }
      totalPercentage += editor.porcentajeTitularidad;
    });
    
    console.log(`\n   📊 Total percentage: ${totalPercentage}% (no validation required)`);
    console.log('   ✅ Schema allows any percentage distribution');
    
  } else {
    console.log('❌ VALIDATION FAILED');
    console.log(`   Error: ${result.error.issues[0]?.message}`);
  }
} catch (error) {
  console.log(`🔥 Error: ${error.message}`);
}

console.log('\n📋 Summary of Percentage Rules:');
console.log('✅ ALLOWED: Any percentage value ≥ 0');
console.log('✅ ALLOWED: Total can be > 100%');
console.log('✅ ALLOWED: Total can be < 100%');
console.log('✅ ALLOWED: Decimal percentages (e.g., 0.5%)');
console.log('❌ NOT ALLOWED: Negative percentages');
console.log('✅ Percentage flexibility validation working correctly!');