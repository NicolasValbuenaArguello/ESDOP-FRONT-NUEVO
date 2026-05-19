export interface RegisteredPage {
  id?: number;
  menu: string;
  nombre: string;
  ruta: string;
  descripcion?: string;
}

const normalizeRoute = (ruta: string | undefined | null) => {
  if (!ruta) {
    return '/';
  }

  return ruta.startsWith('/') ? ruta : `/${ruta}`;
};

export const FRONTEND_PAGE_REGISTRY: RegisteredPage[] = [
  { menu: 'HOME', nombre: 'Home', ruta: '/home', descripcion: 'Panel principal' },
  { menu: 'Usuarios', nombre: 'Usuarios Ingreso', ruta: '/usuarios/nuevos', descripcion: 'Creacion de usuarios' },
  { menu: 'Usuarios', nombre: 'Usuarios Listados', ruta: '/usuarios/listado', descripcion: 'Listado y gestion de usuarios' },
  { menu: 'Afectaciones', nombre: 'Afectaciones', ruta: '/afectaciones', descripcion: 'Visualizacion de afectaciones' },
  { menu: 'Afectaciones', nombre: 'UAS', ruta: '/UAS', descripcion: 'Visualizacion de UAS' },
  { menu: 'Afectaciones', nombre: 'ASONADAS', ruta: '/ASONADAS', descripcion: 'Visualizacion de ASONADAS' },
  { menu: 'Estadistica', nombre: 'Estadisticas', ruta: '/estadisticas', descripcion: 'Visualizacion de estadisticas' },
  {
    menu: 'Seguimiento Operacional',
    nombre: 'Seguimiento',
    ruta: '/seguimiento',
    descripcion: 'Visualizacion de seguimiento operacional'
  },
  { menu: 'Configuración', nombre: 'Configuración', ruta: '/configuracion', descripcion: 'Ajustes del sistema' }
];

export function getRegisteredPageByRoute(ruta: string | undefined | null): RegisteredPage | undefined {
  const rutaNormalizada = normalizeRoute(ruta);
  return FRONTEND_PAGE_REGISTRY.find((page) => normalizeRoute(page.ruta) === rutaNormalizada);
}

export function mergePagesWithRegistry<T extends { id?: number; menu?: string; nombre?: string; ruta: string }>(
  paginas: T[]
): Array<T & RegisteredPage> {
  const merged = new Map<string, T & RegisteredPage>();

  for (const page of FRONTEND_PAGE_REGISTRY) {
    merged.set(normalizeRoute(page.ruta), {
      ...page
    } as T & RegisteredPage);
  }

  for (const page of paginas) {
    const rutaNormalizada = normalizeRoute(page.ruta);
    const registered = getRegisteredPageByRoute(page.ruta);

    merged.set(rutaNormalizada, {
      ...(registered || {}),
      ...page,
      menu: page.menu || registered?.menu || 'General',
      nombre: page.nombre || registered?.nombre || rutaNormalizada,
      ruta: rutaNormalizada
    } as T & RegisteredPage);
  }

  return Array.from(merged.values());
}

export function getAllRegisteredPages(): RegisteredPage[] {
  return [...FRONTEND_PAGE_REGISTRY];
}
