"use client";

import { AccountingClass } from "@workspace/db";
import { DataTable } from "./data-table";
import { getColumns } from "./columns";
import { ClassDialog } from "./class-dialog";
import { ImportClasses } from "./import-classes";
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

interface ClassesClientProps {
  classes: AccountingClass[];
}

export function ClassesClient({ classes }: ClassesClientProps) {
  const columns = getColumns(classes);

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
              <BreadcrumbPage>Classes</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Classes</h1>
          <div className="flex gap-2">
            <ImportClasses />
            <ClassDialog />
          </div>
        </div>
        <DataTable columns={columns} data={classes} searchKey="name" />
      </div>
    </SidebarInset>
  );
}
