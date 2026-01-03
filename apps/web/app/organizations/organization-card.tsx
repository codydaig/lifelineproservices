"use client";

import { Card } from "@workspace/ui/components/card";
import { ChevronRight } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

export function OrganizationCard({
  organization,
}: {
  organization: Organization;
}) {
  return (
    <Card
      asChild
      className="cursor-pointer hover:bg-accent/50 transition-all duration-200 group border"
    >
      <button
        type="button"
        className="w-full text-left appearance-none bg-transparent border-none p-0 m-0 cursor-pointer block"
        onClick={() => {
          // Empty onclick handler as requested
        }}
      >
        <div className="p-4 flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            {organization.imageUrl ? (
              <img
                src={organization.imageUrl}
                alt={organization.name}
                className="w-12 h-12 rounded-lg object-cover border"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20">
                {organization.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {organization.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {organization.slug}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </button>
    </Card>
  );
}
