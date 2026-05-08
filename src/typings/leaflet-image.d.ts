// leaflet-image.d.ts
// TypeScript declaration for leaflet-image (if not present in @types)
declare module 'leaflet-image' {
  import * as L from 'leaflet';
  function leafletImage(map: L.Map, callback: (err: any, canvas: HTMLCanvasElement) => void): void;
  export = leafletImage;
}
