export const environment = {
  production: true,

  apiBase: '/api',
  mapaBase: '/api/estadistica-mapa',

  services: {
    afectaciones: '/afectaciones',
    backend: {
      auth: '/login',
      usuarios: '/usuarios',
      afectaciones: '/afectaciones'
    },
    mapa: {
      dashboard: '/dashboard',
      generar_pptx: '/generar_pptx',
      seguimiento_operacional: '/seguimiento_operacional',
    }
  }
};
