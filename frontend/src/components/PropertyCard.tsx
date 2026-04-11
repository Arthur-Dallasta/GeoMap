import { MapPin, Users, Maximize } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Property } from "../types";

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{property.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            {property.municipality} — {property.state}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Maximize className="h-4 w-4" />
          <span>{Number(property.total_area_ha).toLocaleString("pt-BR")} ha</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{property.people_count} pessoas</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Link
            to={`/properties/${property.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Ver detalhes
          </Link>
          <Link
            to={`/properties/${property.id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Editar
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
