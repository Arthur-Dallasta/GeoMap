declare module "leaflet-image" {
  import type L from "leaflet";
  function leafletImage(
    map: L.Map,
    callback: (err: string | null, canvas: HTMLCanvasElement) => void
  ): void;
  export default leafletImage;
}
