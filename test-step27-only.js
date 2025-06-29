const { chromium } = require('playwright');

async function testStep27Only() {
  console.log('🎯 Testing Step 27 - Original checkbox selection only');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate directly to the form (assuming we have the URL or can simulate the state)
    console.log('📋 Loading form state...');
    
    // For now, let's create a simple HTML to test our selectors
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Test Obras Integrantes</title></head>
      <body>
        <div>
          <h3>Obras Integrantes</h3>
          <div>
            <input type="checkbox" id="original"> Original
          </div>
          <div>
            <input type="checkbox" id="adaptacion_letra"> Adaptación Letra
          </div>
          <div>
            <input type="checkbox" id="adaptacion_musica"> Adaptación Música
          </div>
          <div>
            <input type="checkbox" id="arreglo"> Arreglo
          </div>
          <div>
            <input type="checkbox" id="traduccion"> Traducción
          </div>
          <div>
            <input type="checkbox" id="version"> Versión
          </div>
        </div>
      </body>
      </html>
    `);
    
    // Test our selector strategies
    console.log('🔍 Testing selector strategies...');
    
    // Strategy 1: First checkbox in section
    try {
      const checkbox1 = page.locator('text="Obras Integrantes"').locator('..').locator('input[type="checkbox"]').first();
      const isVisible1 = await checkbox1.isVisible();
      console.log(`✅ Strategy 1 - First checkbox: visible=${isVisible1}`);
      if (isVisible1) {
        await checkbox1.click();
        const isChecked = await checkbox1.isChecked();
        console.log(`✅ Strategy 1 SUCCESS: clicked and checked=${isChecked}`);
      }
    } catch (e) {
      console.log(`❌ Strategy 1 failed: ${e.message}`);
    }
    
    console.log('✅ Step 27 test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close immediately - no waiting
    await browser.close();
    console.log('🔚 Browser closed');
  }
}

testStep27Only().catch(console.error);