import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

type HomeSection = {
  id: 'mision' | 'vision' | 'enfoque';
  eyebrow: string;
  titulo: string;
  resumen: string;
  contenido: string[];
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  readonly page$;
  sidebarVisible = true;
  activeSection: HomeSection | null = null;
  readonly footerLogo = 'assets/colombia.png';

  readonly resumen = [
    { etiqueta: 'Analitica', valor: '24/7', detalle: 'Monitoreo continuo y lectura operacional' },
    { etiqueta: 'Cobertura', valor: '360°', detalle: 'Vision integrada de eventos, mapas y reportes' },
    { etiqueta: 'Decision', valor: 'Data', detalle: 'Soporte oportuno para planeacion y gestion' }
  ];

  readonly sections: HomeSection[] = [
    {
      id: 'mision',
      eyebrow: 'Mision',
      titulo: 'Plataforma integral para la decision operacional',
      resumen: 'Centraliza, procesa y visualiza informacion estrategica en tiempo real mediante dashboards, mapas y reportes inteligentes.',
      contenido: [
        'Proporcionar una plataforma integral de analisis estadistico operacional que permita centralizar, procesar y visualizar informacion estrategica en tiempo real mediante dashboards interactivos, mapas geoespaciales y reportes inteligentes.',
        'Facilitar la toma de decisiones oportunas, precisas y basadas en datos para fortalecer la planeacion, el monitoreo y la gestion operacional de las organizaciones.'
      ]
    },
    {
      id: 'vision',
      eyebrow: 'Vision',
      titulo: 'Inteligencia operacional reconocida por transformar datos en conocimiento',
      resumen: 'Una plataforma lider en analitica geoespacial y visualizacion avanzada para una gestion eficiente, predictiva y orientada a resultados.',
      contenido: [
        'Ser una plataforma lider en inteligencia operacional y analisis geoespacial, reconocida por transformar grandes volumenes de informacion en conocimiento estrategico mediante tecnologias innovadoras de visualizacion, analitica avanzada e integracion de datos.',
        'Contribuir a una gestion mas eficiente, predictiva y orientada a resultados en los diferentes niveles de operacion y direccion.'
      ]
    },
    {
      id: 'enfoque',
      eyebrow: 'Enfoque Tecnologico',
      titulo: 'Arquitectura modular, visualizacion avanzada y procesamiento de alto rendimiento',
      resumen: 'Integra SIG, analitica estadistica, APIs y procesamiento asincrono para consolidar informacion en un entorno unificado.',
      contenido: [
        'La plataforma esta orientada al desarrollo de capacidades avanzadas de analisis operacional, inteligencia geoespacial y visualizacion estrategica de informacion, mediante el uso de tecnologias modernas, escalables y de alto rendimiento que permitan el procesamiento eficiente de grandes volumenes de datos en tiempo real.',
        'Su enfoque tecnologico integra herramientas de analitica estadistica, sistemas de informacion geografica, procesamiento geoespacial, dashboards interactivos y motores de visualizacion dinamica, permitiendo consolidar multiples fuentes de informacion en un entorno unificado para el monitoreo, analisis y generacion de conocimiento operacional.',
        'La solucion esta disenada bajo una arquitectura modular y escalable, basada en servicios API, procesamiento asincrono y componentes web interactivos, facilitando la interoperabilidad con sistemas externos, la automatizacion de procesos y la expansion funcional de la plataforma.'
      ]
    }
  ];

  readonly capacidades = [
    'Visualizacion geoespacial avanzada mediante mapas interactivos 2D y 3D.',
    'Generacion automatica de reportes estadisticos y operacionales.',
    'Dashboards dinamicos con metricas en tiempo real.',
    'Procesamiento masivo de datos estadisticos y geograficos.',
    'Integracion con bases de datos relacionales y geoespaciales.',
    'Sistemas de filtros inteligentes y segmentacion operacional.',
    'Analisis historico, predictivo y comparativo de eventos.',
    'Arquitectura optimizada para alto rendimiento y escalabilidad.',
    'Compatibilidad con servicios web, APIs REST y sistemas distribuidos.',
    'Capacidad de incorporar modelos de inteligencia artificial y analitica predictiva.'
  ];

  constructor(route: ActivatedRoute) {
    this.page$ = route.data;
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  openSection(section: HomeSection) {
    this.activeSection = section;
  }

  closeSection() {
    this.activeSection = null;
  }
}
