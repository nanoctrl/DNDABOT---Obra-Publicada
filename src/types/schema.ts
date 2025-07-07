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

// Schema for fiscal ID (authors)
const FiscalIdSchema = z.object({
  tipo: z.enum(['CUIT', 'CUIL', 'CDI', 'Extranjero', 'Fallecido']),
  numero: z.string().min(1)
}).refine(
  (data) => {
    // For Extranjero, any format is allowed
    if (data.tipo === 'Extranjero') {
      return true;
    }
    // For Argentine document types, enforce XX-XXXXXXXX-X format
    return /^\d{2}-\d{8}-\d{1}$/.test(data.numero);
  },
  {
    message: 'Documentos argentinos (CUIT, CUIL, CDI, Fallecido) deben tener formato XX-XXXXXXXX-X. Documentos extranjeros pueden tener cualquier formato.'
  }
);

// Schema for fiscal ID (editors - only CUIT or CUIL)
const EditorFiscalIdSchema = z.object({
  tipo: z.enum(['CUIT', 'CUIL']),
  numero: z.string().regex(/^\d{2}-\d{8}-\d{1}$/, 'El formato debe ser XX-XXXXXXXX-X')
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
  rol: z.enum(['Letra', 'Música', 'Música y Letra'], {
    errorMap: () => ({ message: 'El rol del autor debe ser "Letra", "Música" o "Música y Letra"' })
  })
}).refine(
  (data) => {
    // Ensure first name and first surname are present and not empty
    return !!data.nombre.primerNombre?.trim() && !!data.apellido.primerApellido?.trim();
  },
  {
    message: 'Primer nombre y primer apellido son obligatorios para autores'
  }
);

// Schema for editor
export const EditorSchema = z.object({
  tipoPersona: z.enum(['Persona Juridica', 'Persona Fisica']),
  // For Persona Juridica
  razonSocial: z.string().optional(),
  // For Persona Fisica (3 names + 3 surnames like authors)
  nombre: NombreSchema.optional(),
  apellido: ApellidoSchema.optional(),
  fiscalId: EditorFiscalIdSchema,
  email: z.string().email(),
  telefono: z.string().min(1),
  porcentajeTitularidad: z.number().min(0), // Any percentage allowed, no need to sum 100%
  domicilio: DomicilioSchema
}).refine(
  (data) => {
    if (data.tipoPersona === 'Persona Juridica') {
      // Persona Jurídica: razonSocial MUST be present, nombre/apellido MUST NOT be present
      return !!data.razonSocial && !data.nombre && !data.apellido;
    } else {
      // Persona Física: razonSocial MUST NOT be present, at least first name and first surname MUST be present
      return !data.razonSocial && 
             !!data.nombre?.primerNombre && 
             !!data.apellido?.primerApellido;
    }
  },
  {
    message: 'Persona Jurídica requiere razón social (sin nombre/apellido), Persona Física requiere al menos primer nombre y primer apellido (sin razón social)'
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
