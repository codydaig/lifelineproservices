"use client";

import { useMemo } from "react";
import {
  AccountingTransaction,
  AccountingEntry,
  ChartOfAccount,
  AccountingPayee,
  AccountingClass,
} from "@workspace/db";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { TransactionDialog } from "./transaction-dialog";
import { ImportTransactions } from "./import-transactions";
import { useRouter } from "next/navigation";

type TransactionWithEntries = AccountingTransaction & {
  entries: (AccountingEntry & {
    account: { name: string | null } | null;
    payee: { name: string | null } | null;
    class: { name: string | null } | null;
  })[];
};

interface RegisterClientProps {
  transactions: TransactionWithEntries[];
  accounts: ChartOfAccount[];
  payees: AccountingPayee[];
  classes: AccountingClass[];
}

export function RegisterClient({
  transactions,
  accounts,
  payees,
  classes,
}: RegisterClientProps) {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  const tableColumns = useMemo(
    () => columns(accounts, payees, classes, handleRefresh),
    [accounts, payees, classes, handleRefresh]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Register</h2>
        <div className="flex items-center gap-2">
          <ImportTransactions onSuccess={handleRefresh} />
          <TransactionDialog
            accounts={accounts}
            payees={payees}
            classes={classes}
            onSuccess={handleRefresh}
          />
        </div>
      </div>

      <DataTable
        columns={tableColumns}
        data={transactions}
        searchKey="description"
        enablePagination={true}
      />
    </div>
  );
}
