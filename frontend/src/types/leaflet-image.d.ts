import type L from "leaflet";

declare module "leaflet-image" {
  function leafletImage(
    map: L.Map,
    callback: (err: Error | null, canvas: HTMLCanvasElement) => void
  ): void;
  export default leafletImage;
}
