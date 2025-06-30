import { z } from 'zod';

/**
 * Schema for obra data - Musical works only
 * 
 * Lógica de validación para lugar_publicacion y urlPaginaWeb:
 * 
 * AMBOS CAMPOS SIEMPRE PRESENTES EN LA ESTRUCTURA:
 * 
 * 1. lugar_publicacion: Requerido SOLO para publicaciones físicas
 *    - Si esPublicacionWeb = false: OBLIGATORIO y usado en el formulario
 *    - Si esPublicacionWeb = true: OPCIONAL (puede estar presente o no)
 * 
 * 2. urlPaginaWeb: Requerido SOLO para publicaciones web
 *    - Si esPublicacionWeb = true: OBLIGATORIO y debe ser URL válida
 *    - Si esPublicacionWeb = false: OPCIONAL (puede estar presente o no)
 * 
 * CASOS DE USO:
 * - Web Publication (esPublicacionWeb: true):
 *   ✅ urlPaginaWeb: "https://music.example.com/cancion" (REQUERIDO y usado en formulario)
 *   ✅ lugar_publicacion: "Ciudad Autónoma de Buenos Aires" (OPCIONAL - puede estar presente o no)
 * 
 * - Physical Publication (esPublicacionWeb: false):
 *   ✅ lugar_publicacion: "Ciudad Autónoma de Buenos Aires" (REQUERIDO y usado en formulario)
 *   ✅ urlPaginaWeb: undefined | "" | null (OPCIONAL - puede estar presente o no)
 * 
 * Esta estructura unificada permite manejar ambos casos con una sola interface.
 */
export const ObraSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  tipo: z.enum(['Música', 'Letra', 'Música y letra']),
  album: z.boolean(),
  cantidad_ejemplares: z.number().int().positive(),
  genero_musical: z.string().min(1, 'El género musical es requerido'),
  esPublicacionWeb: z.boolean(),
  // AMBOS CAMPOS OPCIONALES EN SCHEMA - VALIDACIÓN CONDICIONAL EN REFINE
  lugar_publicacion: z.string().optional(), // Requerido solo si esPublicacionWeb = false
  urlPaginaWeb: z.string().optional(), // Requerido solo si esPublicacionWeb = true
  fecha_publicacion: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'El formato debe ser DD-MM-AAAA'),
  numero_internacional: z.string().optional()
}).superRefine((data, ctx) => {
  // VALIDACIÓN CONDICIONAL COMPLETA:
  
  if (data.esPublicacionWeb) {
    // CASO: Web Publication (esPublicacionWeb = true)
    // ✅ urlPaginaWeb: REQUERIDO y debe ser URL válida
    // ✅ lugar_publicacion: OPCIONAL
    
    if (!data.urlPaginaWeb || data.urlPaginaWeb.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Para publicaciones web es obligatorio incluir una URL válida en urlPaginaWeb',
        path: ['urlPaginaWeb']
      });
    } else {
      // Validar que sea una URL válida
      try {
        new URL(data.urlPaginaWeb);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'urlPaginaWeb debe ser una URL válida (ej: https://music.example.com/cancion)',
          path: ['urlPaginaWeb']
        });
      }
    }
  } else {
    // CASO: Physical Publication (esPublicacionWeb = false)
    // ✅ lugar_publicacion: REQUERIDO
    // ✅ urlPaginaWeb: OPCIONAL
    
    if (!data.lugar_publicacion || data.lugar_publicacion.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Para publicaciones físicas es obligatorio incluir el lugar de publicación',
        path: ['lugar_publicacion']
      });
    }
  }
});

// Schema for names
const NombreSchema = z.object({
  primerNombre: z.string().min(1),
  segundoNombre: z.string().optional(),
  tercerNombre: z.string().optional()
});

// Schema for last names
const ApellidoSchema = z.object({
  primerApellido: z.string().min(1),
  segundoApellido: z.string().optional(),
  tercerApellido: z.string().optional()
});

// Schema for fiscal ID
const FiscalIdSchema = z.object({
  tipo: z.enum(['CUIT', 'CUIL', 'CDI', 'Extranjero', 'Fallecido']),
  numero: z.string().regex(/^\d{2}-\d{8}-\d{1}$/, 'Formato debe ser XX-XXXXXXXX-X')
});

// Schema for address
const DomicilioSchema = z.object({
  calleYNumero: z.string().min(1),
  piso: z.string().optional(),
  departamento: z.string().optional(),
  cp: z.string().min(1),
  localidad: z.string().min(1),
  provincia: z.string().min(1),
  pais: z.string().min(1)
});

// Schema for author
export const AutorSchema = z.object({
  nombre: NombreSchema,
  apellido: ApellidoSchema,
  fiscalId: FiscalIdSchema,
  nacionalidad: z.string().min(1),
  rol: z.string().min(1)
});

// Schema for editor
export const EditorSchema = z.object({
  tipoPersona: z.enum(['Persona Juridica', 'Persona Fisica']),
  razonSocial: z.string().optional(),
  nombre: z.string().optional(),
  apellido: z.string().optional(),
  cuit: z.string().regex(/^\d{2}-\d{8}-\d{1}$/),
  email: z.string().email(),
  telefono: z.string().min(1),
  porcentajeTitularidad: z.number().min(0).max(100),
  domicilio: DomicilioSchema
}).refine(
  (data) => {
    if (data.tipoPersona === 'Persona Juridica') {
      return !!data.razonSocial;
    } else {
      return !!data.nombre && !!data.apellido;
    }
  },
  {
    message: 'Persona Jurídica requiere razón social, Persona Física requiere nombre y apellido'
  }
);

// Schema for gestor
export const GestorSchema = z.object({
  cuitCuil: z.string().min(1),
  claveAfip: z.string().min(1),
  representado: z.string().min(1),
  emailNotificaciones: z.string().email()
});

// Schema for the complete input data
export const TramiteDataSchema = z.object({
  obra: ObraSchema,
  autores: z.array(AutorSchema).min(1, 'Debe incluir al menos un autor'),
  editores: z.array(EditorSchema).optional(),
  gestor: GestorSchema
});

// Export types
export type Obra = z.infer<typeof ObraSchema>;
export type Autor = z.infer<typeof AutorSchema>;
export type Editor = z.infer<typeof EditorSchema>;
export type Gestor = z.infer<typeof GestorSchema>;
export type TramiteData = z.infer<typeof TramiteDataSchema>;

// Re-export schemas with shorter names for convenience
export { 
  ObraSchema as Obra, 
  TramiteDataSchema as TramiteData 
};
