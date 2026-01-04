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
import { PayeeForm } from "./payee-form";
import { AccountingPayee } from "@workspace/db";
import { useState } from "react";

interface PayeeDialogProps {
  initialData?: AccountingPayee;
  trigger?: React.ReactNode;
}

export function PayeeDialog({ initialData, trigger }: PayeeDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Payee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Payee" : "Add Payee"}
          </DialogTitle>
        </DialogHeader>
        <PayeeForm
          initialData={initialData}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
