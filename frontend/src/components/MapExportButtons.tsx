// frontend/src/components/MapExportButtons.tsx
import { useState } from "react";
import L from "leaflet";
import leafletImage from "leaflet-image";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";

interface MapExportButtonsProps {
  mapInstance: L.Map | null;
  propertyName: string;
}

function getCanvas(map: L.Map): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    leafletImage(map, (err, canvas) => {
      if (err) reject(err);
      else resolve(canvas);
    });
  });
}

export default function MapExportButtons({
  mapInstance,
  propertyName,
}: MapExportButtonsProps) {
  const [exporting, setExporting] = useState(false);

  async function exportPng() {
    if (!mapInstance) return;
    setExporting(true);
    try {
      const canvas = await getCanvas(mapInstance);
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${propertyName}-mapa.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  async function exportPdf() {
    if (!mapInstance) return;
    setExporting(true);
    try {
      const canvas = await getCanvas(mapInstance);
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
      <Button
        variant="outline"
        size="sm"
        onClick={exportPng}
        disabled={exporting || !mapInstance}
      >
        {exporting ? "Exportando..." : "Exportar PNG"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportPdf}
        disabled={exporting || !mapInstance}
      >
        {exporting ? "Exportando..." : "Exportar PDF"}
      </Button>
    </div>
  );
}
