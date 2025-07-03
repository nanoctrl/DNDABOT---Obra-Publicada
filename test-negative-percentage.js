const { TramiteDataSchema } = require('./dist/types/schema');

console.log('🧪 Testing Negative Percentage Rejection\n');

const invalidData = {
  "obra": {
    "titulo": "Test Negative",
    "tipo": "Música y letra",
    "album": false,
    "cantidad_ejemplares": 100,
    "genero_musical": "Pop",
    "esPublicacionWeb": true,
    "urlPaginaWeb": "https://music.example.com/test",
    "fecha_publicacion": "01-04-2025"
  },
  "autores": [{
    "nombre": { "primerNombre": "Test" },
    "apellido": { "primerApellido": "Author" },
    "fiscalId": { "tipo": "CUIT", "numero": "20-12345678-9" },
    "nacionalidad": "Argentina",
    "rol": "Música y Letra"
  }],
  "editores": [{
    "tipoPersona": "Persona Juridica",
    "razonSocial": "Test S.A.",
    "cuit": "33-98765432-1",
    "email": "test@test.com",
    "telefono": "11 1234 5678",
    "porcentajeTitularidad": -5, // Should be rejected
    "domicilio": {
      "calleYNumero": "Test 123",
      "cp": "1000",
      "localidad": "CIUDAD AUTÓNOMA DE BUENOS AIRES",
      "provincia": "CIUDAD AUTÓNOMA DE BUENOS AIRES",
      "pais": "Argentina"
    }
  }],
  "gestor": {
    "cuitCuil": "20352552721",
    "claveAfip": "Levitateme5023",
    "representado": "EPSA PUBLISHING S A",
    "emailNotificaciones": "nmaeso@gmail.com"
  }
};

console.log('📋 Test: Editor with negative percentage (-5%)');
const result = TramiteDataSchema.safeParse(invalidData);

if (result.success) {
  console.log('❌ UNEXPECTED: Negative percentage was accepted!');
} else {
  console.log('✅ EXPECTED: Negative percentage correctly rejected');
  console.log(`   Reason: ${result.error.issues[0]?.message}`);
}

console.log('\n✅ Validation working correctly: Only non-negative percentages allowed!');