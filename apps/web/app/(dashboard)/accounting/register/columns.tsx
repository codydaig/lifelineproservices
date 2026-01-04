"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { MoreHorizontal, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  AccountingTransaction,
  AccountingEntry,
  ChartOfAccount,
  AccountingPayee,
  AccountingClass,
} from "@workspace/db";
import { TransactionDialog } from "./transaction-dialog";
import { deleteTransaction } from "@/actions/transactions";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TransactionWithEntries = AccountingTransaction & {
  entries: (AccountingEntry & {
    account: { name: string | null } | null;
    payee: { name: string | null } | null;
    class: { name: string | null } | null;
  })[];
};

export const columns = (
  accounts: ChartOfAccount[],
  payees: AccountingPayee[],
  classes: AccountingClass[],
  onRefresh: () => void
): ColumnDef<TransactionWithEntries>[] => [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      return date.toLocaleDateString();
    },
  },
  {
    accessorKey: "transactionType",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("transactionType") as string;
      return (
        <span className="text-xs">
          {type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
        </span>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("description") as string | null;
      return <span className="text-sm">{description || "-"}</span>;
    },
  },
  {
    id: "split",
    header: "Split",
    cell: ({ row }) => {
      const entries = row.original.entries;
      return (
        <div className="text-sm space-y-0.5">
          {entries.map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-muted-foreground flex-1 truncate">
                {entry.account?.name || "Unknown"}
              </span>
              <span className="font-mono text-xs">
                {entry.debit
                  ? `$${parseFloat(entry.debit.toString()).toFixed(2)}`
                  : entry.credit
                  ? `($${parseFloat(entry.credit.toString()).toFixed(2)})`
                  : "-"}
              </span>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const entries = row.original.entries;
      let totalDebits = 0;
      entries.forEach((entry) => {
        if (entry.debit) {
          totalDebits += parseFloat(entry.debit.toString());
        }
      });
      return (
        <div className="text-right font-mono">
          ${totalDebits.toFixed(2)}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const transaction = row.original;

      const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this transaction?")) {
          return;
        }

        try {
          await deleteTransaction(transaction.id);
          onRefresh();
        } catch (error: any) {
          alert(error.message || "Failed to delete transaction");
        }
      };

      // Transform the data to match the form's expected structure
      const formData = {
        id: transaction.id,
        date: transaction.date,
        transactionType: transaction.transactionType,
        description: transaction.description,
        entries: transaction.entries.map((entry) => ({
          accountId: entry.accountId,
          payeeId: entry.payeeId,
          classId: entry.classId,
          number: entry.number || "",
          debit: entry.debit?.toString() || "",
          credit: entry.credit?.toString() || "",
          memo: entry.memo || "",
        })),
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <TransactionDialog
              accounts={accounts}
              payees={payees}
              classes={classes}
              initialData={formData}
              onSuccess={onRefresh}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Edit transaction
                </DropdownMenuItem>
              }
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
