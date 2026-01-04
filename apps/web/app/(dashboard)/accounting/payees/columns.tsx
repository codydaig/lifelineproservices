"use client";

import { ColumnDef } from "@tanstack/react-table";
import { AccountingPayee } from "@workspace/db";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Edit } from "lucide-react";
import { PayeeDialog } from "./payee-dialog";

export const getColumns = (
  payees: AccountingPayee[],
): ColumnDef<AccountingPayee>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.getValue("email") as string | null;
      return email || "-";
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string | null;
      return phone || "-";
    },
  },
  {
    id: "address",
    header: "Address",
    cell: ({ row }) => {
      const { address1, city, state, zip } = row.original;
      const parts = [address1, city, state, zip].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "-";
    },
  },
  {
    accessorKey: "isW9vendor",
    header: "W9 Vendor",
    cell: ({ row }) => {
      const isW9 = row.getValue("isW9vendor") as boolean;
      return isW9 ? (
        <Badge variant="secondary">W9</Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const payee = row.original;

      return (
        <PayeeDialog
          initialData={payee}
          trigger={
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          }
        />
      );
    },
  },
];
