export const environment = {
  production: false,

  //apiBase: '/api',
  //mapaBase: '/api/estadistica-mapa',

  apiBase: 'http://localhost:8000/api',
mapaBase: 'http://localhost:8001/api/estadistica-mapa',

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
 
