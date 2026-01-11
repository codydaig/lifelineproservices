"use client";

import { useState } from "react";
import { BalanceSheetAccount } from "@workspace/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useRouter } from "next/navigation";
import { formatCurrency, AccountList } from "../shared-components";

interface BalanceSheetClientProps {
  balanceSheet: BalanceSheetAccount[];
  netIncome: number;
  asOfDate?: Date;
}

export function BalanceSheetClient({
  balanceSheet,
  netIncome,
  asOfDate,
}: BalanceSheetClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(
    asOfDate ? asOfDate.toISOString().split("T")[0] : ""
  );

  const handleApply = () => {
    const params = new URLSearchParams();
    if (selectedDate) {
      params.set("asOfDate", selectedDate);
    }
    router.push(`/accounting/reports/balance-sheet?${params.toString()}`);
  };

  const assets = balanceSheet.filter((a) => a.type === "asset");
  const liabilities = balanceSheet.filter((a) => a.type === "liability");
  const equities = balanceSheet.filter((a) => a.type === "equity");

  const totalAssets = assets
    .filter((account) => !account.parentAccountId)
    .reduce((acc, row) => acc + (row.totalBalance || 0), 0);

  const totalLiabilities = liabilities
    .filter((account) => !account.parentAccountId)
    .reduce((acc, row) => acc + (row.totalBalance || 0), 0);

  const totalEquity = equities
    .filter((account) => !account.parentAccountId)
    .reduce((acc, row) => acc + (row.totalBalance || 0), 0);

  const displayDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Current";

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netIncome;
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Balance Sheet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            As of {displayDate}
          </p>
          {!isBalanced && (
            <p className="text-sm text-destructive mt-1 font-medium">
              ⚠️ Warning: Balance sheet does not balance (Assets: ${formatCurrency(totalAssets)}, Liabilities + Equity: ${formatCurrency(totalLiabilitiesAndEquity)})
            </p>
          )}
        </div>
        <div className="flex gap-4 items-end">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">As of Date</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[180px]"
            />
          </div>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead className="text-right w-[200px]">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2} className="font-bold text-base">
              Assets
            </TableCell>
          </TableRow>
          <AccountList accounts={assets} level={1} />
          <TableRow className="bg-muted/50">
            <TableCell className="font-bold">Total Assets</TableCell>
            <TableCell className="text-right font-bold tabular-nums w-[200px]">
              ${formatCurrency(totalAssets)}
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell colSpan={2} className="font-bold text-base pt-4">
              Liabilities and Equity
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell colSpan={2} className="font-semibold">
              Liabilities
            </TableCell>
          </TableRow>
          <AccountList accounts={liabilities} level={1} />
          <TableRow className="bg-muted/50">
            <TableCell className="font-bold">Total Liabilities</TableCell>
            <TableCell className="text-right font-bold tabular-nums w-[200px]">
              ${formatCurrency(totalLiabilities)}
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell colSpan={2} className="font-semibold pt-4">
              Equity
            </TableCell>
          </TableRow>
          <AccountList accounts={equities} level={1} />
          <TableRow>
            <TableCell className="pl-5">Net Income</TableCell>
            <TableCell className="text-right tabular-nums w-[200px]">
              ${formatCurrency(netIncome)}
            </TableCell>
          </TableRow>
          <TableRow className="bg-muted/50">
            <TableCell className="font-bold">Total Equity</TableCell>
            <TableCell className="text-right font-bold tabular-nums w-[200px]">
              ${formatCurrency(totalEquity + netIncome)}
            </TableCell>
          </TableRow>

          <TableRow className="bg-primary/10 border-t-2 border-primary">
            <TableCell className="font-bold text-lg">
              Total Liabilities and Equity
            </TableCell>
            <TableCell className="text-right font-bold text-lg tabular-nums w-[200px]">
              ${formatCurrency(totalLiabilitiesAndEquity)}
            </TableCell>
          </TableRow>

          {!isBalanced && (
            <TableRow className="bg-destructive/10">
              <TableCell className="font-bold text-destructive">
                Difference (Should be $0.00)
              </TableCell>
              <TableCell className="text-right font-bold text-destructive tabular-nums w-[200px]">
                ${formatCurrency(totalAssets - totalLiabilitiesAndEquity)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
