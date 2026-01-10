"use client";

import { Fragment } from "react";
import {
  ProfitAndLossAccount,
  DateRangePreset,
  DateRange,
  AccountingClass,
} from "@workspace/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfitLossClientProps {
  profitLoss: ProfitAndLossAccount[];
  classes: AccountingClass[];
  preset: DateRangePreset;
  dateRange: DateRange;
  classId?: string;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function findRootAccounts(accounts: ProfitAndLossAccount[]) {
  const accountsWithoutParent = accounts.filter(
    (account) => !account.parentAccountId
  );

  const accountIds = new Set(accounts.map((acc) => acc.id));
  const parentAccounts = accounts.filter((account) => {
    if (!account.parentAccountId) return true;
    return (
      accounts.some((acc) => acc.parentAccountId === account.id) &&
      !accountIds.has(account.parentAccountId)
    );
  });

  const rootAccounts = [
    ...new Set([...accountsWithoutParent, ...parentAccounts]),
  ];

  return rootAccounts.sort((a, b) => a.name.localeCompare(b.name));
}

function AccountRow({
  account,
  level = 0,
}: {
  account: ProfitAndLossAccount;
  level?: number;
}) {
  if (account.total === 0 && account.totalBalance === 0) return null;

  return (
    <TableRow key={account.id}>
      <TableCell>
        <div style={{ paddingLeft: `${level * 20}px` }}>{account.name}</div>
      </TableCell>
      <TableCell className="text-right tabular-nums w-[200px]">
        ${formatCurrency(account.total)}
      </TableCell>
    </TableRow>
  );
}

function AccountList({
  accounts,
  parentId = null,
  level = 0,
}: {
  accounts: ProfitAndLossAccount[];
  parentId?: string | null;
  level?: number;
}) {
  const childAccounts =
    parentId === null
      ? findRootAccounts(accounts)
      : accounts
          .filter((account) => account.parentAccountId === parentId)
          .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      {childAccounts.map((account) => {
        const hasSubAccounts = accounts.some(
          (acc) => acc.parentAccountId === account.id
        );

        return (
          <Fragment key={account.id}>
            <AccountRow account={account} level={level} />
            <AccountList accounts={accounts} parentId={account.id} level={level + 1} />
            {hasSubAccounts && account.totalBalance !== 0 && (
              <TableRow>
                <TableCell>
                  <div
                    style={{ paddingLeft: `${level * 20}px` }}
                    className="font-bold"
                  >
                    Total {account.name}
                  </div>
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums w-[200px]">
                  ${formatCurrency(account.totalBalance)}
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

export function ProfitLossClient({
  profitLoss,
  classes,
  preset,
  dateRange,
  classId,
}: ProfitLossClientProps) {
  const router = useRouter();
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(preset);
  const [startDate, setStartDate] = useState(
    dateRange.startDate.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    dateRange.endDate.toISOString().split("T")[0]
  );
  const [selectedClass, setSelectedClass] = useState<string | undefined>(classId);

  const handleApply = () => {
    const params = new URLSearchParams();
    params.set("preset", selectedPreset);
    if (selectedPreset === "custom" && startDate && endDate) {
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    }
    if (selectedClass) {
      params.set("classId", selectedClass);
    }
    router.push(`/accounting/reports/profit-loss?${params.toString()}`);
  };

  const revenues = profitLoss.filter((a) => a.type === "revenue");
  const expenses = profitLoss.filter((a) => a.type === "expense");

  const totalRevenue = revenues
    .filter((account) => !account.parentAccountId)
    .reduce((acc, row) => acc + (row.totalBalance || 0), 0);

  const totalExpense = expenses
    .filter((account) => !account.parentAccountId)
    .reduce((acc, row) => acc + (row.totalBalance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Profit & Loss</h2>
        <div className="flex gap-4 items-end">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Date Range</label>
            <Select value={selectedPreset} onValueChange={(value) => setSelectedPreset(value as DateRangePreset)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="last90days">Last 90 Days</SelectItem>
                <SelectItem value="thismonth">This Month</SelectItem>
                <SelectItem value="thisquarter">This Quarter</SelectItem>
                <SelectItem value="yeartodate">Year to Date</SelectItem>
                <SelectItem value="thisyear">This Year</SelectItem>
                <SelectItem value="lastmonth">Last Month</SelectItem>
                <SelectItem value="lastquarter">Last Quarter</SelectItem>
                <SelectItem value="lastyear">Last Year</SelectItem>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedPreset === "custom" && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Class</label>
            <Select value={selectedClass || "all"} onValueChange={(value) => setSelectedClass(value === "all" ? undefined : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead className="text-right w-[200px]">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2} className="font-bold text-base">
              Revenue
            </TableCell>
          </TableRow>
          <AccountList accounts={revenues} level={1} />
          <TableRow className="bg-muted/50">
            <TableCell className="font-bold">Total Revenue</TableCell>
            <TableCell className="text-right font-bold tabular-nums w-[200px]">
              ${formatCurrency(totalRevenue)}
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell colSpan={2} className="font-bold text-base pt-4">
              Expenses
            </TableCell>
          </TableRow>
          <AccountList accounts={expenses} level={1} />
          <TableRow className="bg-muted/50">
            <TableCell className="font-bold">Total Expenses</TableCell>
            <TableCell className="text-right font-bold tabular-nums w-[200px]">
              ${formatCurrency(totalExpense)}
            </TableCell>
          </TableRow>

          <TableRow className="bg-primary/10 border-t-2 border-primary">
            <TableCell className="font-bold text-lg">NET INCOME</TableCell>
            <TableCell className="text-right font-bold text-lg tabular-nums w-[200px]">
              ${formatCurrency(totalRevenue + totalExpense)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}