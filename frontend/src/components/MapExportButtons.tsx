import { useState } from "react";
import L from "leaflet";
import leafletImage from "leaflet-image";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";

interface MapExportButtonsProps {
  mapInstance: L.Map | null;
  propertyName: string;
}

async function buildExportCanvas(map: L.Map): Promise<HTMLCanvasElement> {
  const container = map.getContainer();
  const containerRect = container.getBoundingClientRect();

  const svgEl = container.querySelector<SVGSVGElement>(".leaflet-overlay-pane svg");
  const svgRect = svgEl?.getBoundingClientRect();
  const svgData = svgEl ? new XMLSerializer().serializeToString(svgEl) : null;
  const svgOffsetX = svgRect ? svgRect.left - containerRect.left : 0;
  const svgOffsetY = svgRect ? svgRect.top - containerRect.top : 0;

  const labelData = Array.from(container.querySelectorAll<HTMLElement>(".area-label"))
    .map((el) => {
      const r = el.getBoundingClientRect();
      const fontSize = parseFloat(el.style.fontSize) || 0;
      return {
        text: el.textContent || "",
        fontSize,
        x: r.left - containerRect.left + r.width / 2,
        y: r.top - containerRect.top + r.height / 2,
      };
    })
    .filter((l) => l.text && l.fontSize > 0);

  const canvas = await new Promise<HTMLCanvasElement>((res, rej) =>
    leafletImage(map, (err, c) => (err ? rej(new Error(err)) : res(c)))
  );
  const ctx = canvas.getContext("2d")!;

  if (svgData) {
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      await new Promise<void>((res) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, svgOffsetX, svgOffsetY);
          res();
        };
        img.onerror = () => res();
        img.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  labelData.forEach(({ text, fontSize, x, y }) => {
    ctx.save();
    ctx.font = `600 ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, x, y);
    ctx.restore();
  });

  return canvas;
}

export default function MapExportButtons({ mapInstance, propertyName }: MapExportButtonsProps) {
  const [exporting, setExporting] = useState(false);

  async function exportPng() {
    if (!mapInstance) return;
    setExporting(true);
    try {
      const canvas = await buildExportCanvas(mapInstance);
      const link = document.createElement("a");
      link.download = `${propertyName}-mapa.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  }

  async function exportPdf() {
    if (!mapInstance) return;
    setExporting(true);
    try {
      const canvas = await buildExportCanvas(mapInstance);
      const dataUrl = canvas.toDataURL("image/png");
      const w = canvas.width;
      const h = canvas.height;
      const orientation = w >= h ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "px", format: [w, h] });
      pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
      pdf.save(`${propertyName}-mapa.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex gap-2 mt-3">
      <Button variant="outline" size="sm" onClick={exportPng} disabled={exporting || !mapInstance}>
        {exporting ? "Exportando..." : "Exportar PNG"}
      </Button>
      <Button variant="outline" size="sm" onClick={exportPdf} disabled={exporting || !mapInstance}>
        {exporting ? "Exportando..." : "Exportar PDF"}
      </Button>
    </div>
  );
}
