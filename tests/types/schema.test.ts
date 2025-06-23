import { tramiteCompletoSchema } from '../../src/types/schema';
import * as fs from 'fs';
import * as path from 'path';

describe('Schema Validation', () => {
  describe('tramiteCompletoSchema', () => {
    it('should validate a complete valid tramite', () => {
      const validData = {
        obra: {
          titulo: "Rio y Mar",
          tipo: "Música y letra",
          album: false,
          cantidad_ejemplares: 500,
          genero_musical: "Rock",
          esPublicacionWeb: false,
          lugar_publicacion: "Ciudad Autónoma de Buenos Aires",
          fecha_publicacion: "24-11-2025"
        },
        autores: [
          {
            nombre: { primerNombre: "Pedro" },
            apellido: { primerApellido: "Sanchez" },
            fiscalId: { tipo: "CUIT", numero: "20-11111111-1" },
            nacionalidad: "Argentina",
            rol: "Música y Letra"
          }
        ],
        editores: [
          {
            tipoPersona: "Persona Juridica",
            razonSocial: "EPSA Publishing S.A.",
            cuit: "33-70957838-9",
            email: "mgonzalez@epsapublishing.com.ar",
            telefono: "15 5454 4444",
            porcentajeTitularidad: 5,
            domicilio: {
              calleYNumero: "Vera 410",
              piso: "5",
              departamento: "B",
              cp: "1414",
              localidad: "CIUDAD AUTÓNOMA DE BUENOS AIRES",
              provincia: "CIUDAD AUTÓNOMA DE BUENOS AIRES",
              pais: "Argentina"
            }
          }
        ],
        gestor: {
          cuitCuil: "20352552721",
          claveAfip: "Levitateme5023",
          representado: "EPSA PUBLISHING S A",
          emailNotificaciones: "nmaeso@gmail.com"
        }
      };

      const result = tramiteCompletoSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject obra without required fields', () => {
      const invalidData = {
        obra: {
          titulo: "",
          tipo: "Invalid Type",
          album: false,
          cantidad_ejemplares: -5,
          genero_musical: "",
          esPublicacionWeb: false,
          lugar_publicacion: "",
          fecha_publicacion: "2025-11-24" // Wrong format
        },
        autores: [],
        gestor: {
          cuitCuil: "",
          claveAfip: "",
          representado: "",
          emailNotificaciones: "invalid-email"
        }
      };

      const result = tramiteCompletoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });

    it('should validate web publication correctly', () => {
      const webPublicationData = {
        obra: {
          titulo: "Canción Web",
          tipo: "Música",
          album: false,
          cantidad_ejemplares: 1000,
          genero_musical: "Pop",
          esPublicacionWeb: true,
          urlPaginaWeb: "https://example.com/cancion",
          fecha_publicacion: "01-01-2025"
        },
        autores: [
          {
            nombre: { primerNombre: "Maria" },
            apellido: { primerApellido: "Lopez" },
            fiscalId: { tipo: "CUIL", numero: "27-22222222-2" },
            nacionalidad: "Argentina",
            rol: "Música"
          }
        ],
        gestor: {
          cuitCuil: "20352552721",
          claveAfip: "password123",
          representado: "Maria Lopez",
          emailNotificaciones: "maria@example.com"
        }
      };

      const result = tramiteCompletoSchema.safeParse(webPublicationData);
      expect(result.success).toBe(true);
    });

    it('should validate editor persona fisica correctly', () => {
      const personaFisicaData = {
        obra: {
          titulo: "Test Song",
          tipo: "Letra",
          album: false,
          cantidad_ejemplares: 100,
          genero_musical: "Jazz",
          esPublicacionWeb: false,
          lugar_publicacion: "Buenos Aires",
          fecha_publicacion: "15-06-2025"
        },
        autores: [
          {
            nombre: { primerNombre: "Juan" },
            apellido: { primerApellido: "Perez" },
            fiscalId: { tipo: "CUIT", numero: "20-33333333-3" },
            nacionalidad: "Argentina",
            rol: "Letra"
          }
        ],
        editores: [
          {
            tipoPersona: "Persona Fisica",
            nombre: "Carlos",
            apellido: "Rodriguez",
            cuit: "20-44444444-4",
            email: "carlos@example.com",
            telefono: "11-5555-5555",
            porcentajeTitularidad: 10,
            domicilio: {
              calleYNumero: "Av. Corrientes 1234",
              cp: "1043",
              localidad: "CABA",
              provincia: "CABA",
              pais: "Argentina"
            }
          }
        ],
        gestor: {
          cuitCuil: "20352552721",
          claveAfip: "password123",
          representado: "Juan Perez",
          emailNotificaciones: "juan@example.com"
        }
      };

      const result = tramiteCompletoSchema.safeParse(personaFisicaData);
      expect(result.success).toBe(true);
    });
  });

  describe('tramite_ejemplo.json validation', () => {
    it('should validate the example file', () => {
      const examplePath = path.join(__dirname, '../../data/tramite_ejemplo.json');
      const exampleContent = fs.readFileSync(examplePath, 'utf-8');
      const exampleData = JSON.parse(exampleContent);

      const result = tramiteCompletoSchema.safeParse(exampleData);
      expect(result.success).toBe(true);
    });
  });
});
