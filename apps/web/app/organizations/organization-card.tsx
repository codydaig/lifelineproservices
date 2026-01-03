"use client";

import { Card } from "@workspace/ui/components/card";
import { ChevronRight, Check } from "lucide-react";
import { selectOrganizationAction } from "../../actions/organizations";
import { useTransition } from "react";
import { cn } from "@workspace/ui/lib/utils";

interface Organization {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

export function OrganizationCard({
  organization,
  isSelected,
}: {
  organization: Organization;
  isSelected?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card
      asChild
      className={cn(
        "cursor-pointer hover:bg-accent/50 transition-all duration-200 group border",
        isSelected && "border-primary ring-1 ring-primary",
      )}
    >
      <button
        type="button"
        className="w-full text-left appearance-none bg-transparent border-none p-0 m-0 cursor-pointer block disabled:opacity-50"
        disabled={isPending || isSelected}
        onClick={() => {
          if (isSelected) return;
          startTransition(async () => {
            await selectOrganizationAction(organization.id);
          });
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
              <div
                className={cn(
                  "w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20",
                  isSelected && "bg-primary text-primary-foreground",
                )}
              >
                {organization.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {organization.name}
                </span>
                {isSelected && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    <Check className="w-3 h-3" />
                    Active
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {organization.slug}
              </span>
            </div>
          </div>
          {!isSelected && (
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          )}
        </div>
      </button>
    </Card>
  );
}
