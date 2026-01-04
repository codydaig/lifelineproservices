"use client";

import { ChartOfAccount } from "@workspace/db";
import { DataTable } from "./data-table";
import { getColumns } from "./columns";
import { AccountDialog } from "./account-dialog";
import { useMemo } from "react";

interface ChartOfAccountsClientProps {
  data: ChartOfAccount[];
}

export function ChartOfAccountsClient({ data }: ChartOfAccountsClientProps) {
  const columns = useMemo(() => getColumns(data), [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Chart of Accounts</h2>
        <AccountDialog accounts={data} />
      </div>
      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        enablePagination={false}
      />
    </div>
  );
}
