import { MapPin, Users, Maximize, Pencil, ArrowRight } from "lucide-react";
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
    <Card className="group border-l-[3px] border-l-primary hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading font-semibold leading-tight">
          {property.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
          <span>
            {property.municipality} — {property.state}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Maximize className="h-3.5 w-3.5 shrink-0 text-primary/60" />
          <span>
            <strong className="text-foreground font-medium">
              {Number(property.total_area_ha).toLocaleString("pt-BR")}
            </strong>{" "}
            ha
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0 text-primary/60" />
          <span>{property.people_count} pessoas</span>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-border/60">
          <Link
            to={`/properties/${property.id}`}
            className={cn(
              buttonVariants({ size: "sm" }),
              "flex-1 justify-between text-xs h-8"
            )}
          >
            Ver detalhes
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
          <Link
            to={`/properties/${property.id}/edit`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 w-8 p-0 flex items-center justify-center"
            )}
            title="Editar"
          >
            <Pencil className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
