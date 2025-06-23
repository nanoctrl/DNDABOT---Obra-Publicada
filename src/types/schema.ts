import { z } from 'zod';

// Schema for obra data - Musical works only
export const ObraSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  tipo: z.enum(['Música', 'Letra', 'Música y letra']),
  album: z.boolean(),
  cantidad_ejemplares: z.number().int().positive(),
  genero_musical: z.string().min(1, 'El género musical es requerido'),
  esPublicacionWeb: z.boolean(),
  urlPaginaWeb: z.string().url().optional(),
  lugar_publicacion: z.string().optional(),
  fecha_publicacion: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'El formato debe ser DD-MM-AAAA')
}).refine(
  (data) => {
    if (data.esPublicacionWeb) {
      return !!data.urlPaginaWeb;
    } else {
      return !!data.lugar_publicacion;
    }
  },
  {
    message: 'Si es publicación web debe incluir URL, si no debe incluir lugar de publicación'
  }
);

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
