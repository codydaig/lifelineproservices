"use client";

import { AccountingPayee } from "@workspace/db";
import { DataTable } from "./data-table";
import { getColumns } from "./columns";
import { PayeeDialog } from "./payee-dialog";
import { ImportPayees } from "./import-payees";
import {
  SidebarTrigger,
  SidebarInset,
} from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb";

interface PayeesClientProps {
  payees: AccountingPayee[];
}

export function PayeesClient({ payees }: PayeesClientProps) {
  const columns = getColumns(payees);

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">Accounting</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Payees</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Payees</h1>
          <div className="flex gap-2">
            <ImportPayees />
            <PayeeDialog />
          </div>
        </div>
        <DataTable columns={columns} data={payees} searchKey="name" />
      </div>
    </SidebarInset>
  );
}
