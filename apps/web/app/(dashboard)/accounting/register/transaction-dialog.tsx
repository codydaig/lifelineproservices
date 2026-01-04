"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Plus } from "lucide-react";
import { TransactionForm } from "./transaction-form";
import { AccountingClass, AccountingPayee, ChartOfAccount } from "@workspace/db";

interface TransactionDialogProps {
  accounts: ChartOfAccount[];
  payees: AccountingPayee[];
  classes: AccountingClass[];
  initialData?: any;
  trigger?: React.ReactNode;
  onSuccess: () => void;
}

export function TransactionDialog({
  accounts,
  payees,
  classes,
  initialData,
  trigger,
  onSuccess,
}: TransactionDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Transaction" : "New Transaction"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update the transaction details below."
              : "Create a new double-entry accounting transaction."}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          accounts={accounts}
          payees={payees}
          classes={classes}
          initialData={initialData}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
