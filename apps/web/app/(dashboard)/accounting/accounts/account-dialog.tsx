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
import { AccountForm } from "./account-form";
import { ChartOfAccount } from "@workspace/db";
import { useState } from "react";

interface AccountDialogProps {
  initialData?: ChartOfAccount;
  accounts: ChartOfAccount[];
  trigger?: React.ReactNode;
}

export function AccountDialog({
  initialData,
  accounts,
  trigger,
}: AccountDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Account" : "Add Account"}
          </DialogTitle>
        </DialogHeader>
        <AccountForm
          initialData={initialData}
          accounts={accounts}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
