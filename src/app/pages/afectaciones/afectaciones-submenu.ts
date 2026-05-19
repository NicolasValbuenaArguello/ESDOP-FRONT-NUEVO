export interface AfectacionesSubMenu {
  key: 'listado' | 'creacion' | 'estadistica';
  label: string;
}

export const AFECTACIONES_SUBMENUS: AfectacionesSubMenu[] = [
  { key: 'listado', label: 'Listado' },
  { key: 'creacion', label: 'Creación' },
  { key: 'estadistica', label: 'Estadística' }
];
