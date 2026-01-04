"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Plus } from "lucide-react";
import { ClassForm } from "./class-form";
import { AccountingClass } from "@workspace/db";
import { useState } from "react";

interface ClassDialogProps {
  initialData?: AccountingClass;
  trigger?: React.ReactNode;
}

export function ClassDialog({ initialData, trigger }: ClassDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Class
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Class" : "Add Class"}
          </DialogTitle>
        </DialogHeader>
        <ClassForm
          initialData={initialData}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
