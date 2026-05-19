export interface AfectacionRecord {
  id: number;
  fecha_evento: string;
  afectacion: string;
  hora_evento: string;
  lugar: string;
  departamento: string;
  municipio: string;
  grado: string;
  clase: string;
  nombrey_apellidos: string;
  cedula: string;
  edad: number | null;
  genero: string;
  division_padre: string;
  division: string;
  brigada: string;
  unidad: string;
  enemigo: string;
  estructura_afecta: string;
  tipo_operacion: string;
  desccripcion_evento: string;
  observaciones: string;
  hr: string;
  cargado: boolean;
}

export interface AfectacionResponse {
  success: boolean;
  message?: string;
}

export interface AfectacionListResponse {
  success: boolean;
  total: number;
  data: AfectacionRecord[];
  message?: string;
}

export interface AfectacionListFilters {
  fecha_inicial?: string;
  fecha_final?: string;
  division?: string;
}
