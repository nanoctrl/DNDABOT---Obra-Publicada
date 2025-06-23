// TAD-specific types and interfaces

export interface TadUser {
  cuit: string;
  name: string;
  email: string;
}

export interface TadSession {
  token: string;
  expiresAt: Date;
  user: TadUser;
}

export interface TadTramite {
  id: string;
  nombre: string;
  descripcion: string;
  organismo: string;
  requisitos: string[];
}

export interface TadFormField {
  name: string;
  type: 'text' | 'select' | 'date' | 'number' | 'file' | 'checkbox';
  label: string;
  required: boolean;
  options?: string[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export interface TadFormSection {
  title: string;
  fields: TadFormField[];
}

export interface TadForm {
  sections: TadFormSection[];
  submitButton: string;
  saveButton?: string;
}

export interface RegistrationResult {
  success: boolean;
  tramiteId?: string;
  confirmationNumber?: string;
  error?: string;
  timestamp: Date;
}
