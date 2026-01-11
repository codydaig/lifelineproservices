import { Fragment } from "react";
import {
  TableCell,
  TableRow,
} from "@workspace/ui/components/table";

export interface ReportAccount {
  id: string;
  name: string;
  parentAccountId: string | null;
  balance?: number;
  total?: number;
  totalBalance: number;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function findRootAccounts<T extends ReportAccount>(accounts: T[]): T[] {
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

export function AccountRow<T extends ReportAccount>({
  account,
  level = 0,
  amountField = "balance",
}: {
  account: T;
  level?: number;
  amountField?: "balance" | "total";
}) {
  const amount = amountField === "balance"
    ? (account.balance ?? 0)
    : (account.total ?? 0);

  if (amount === 0 && account.totalBalance === 0) return null;

  return (
    <TableRow key={account.id}>
      <TableCell>
        <div style={{ paddingLeft: `${level * 20}px` }}>{account.name}</div>
      </TableCell>
      <TableCell className="text-right tabular-nums w-[200px]">
        ${formatCurrency(amount)}
      </TableCell>
    </TableRow>
  );
}

export function AccountList<T extends ReportAccount>({
  accounts,
  parentId = null,
  level = 0,
  amountField = "balance",
}: {
  accounts: T[];
  parentId?: string | null;
  level?: number;
  amountField?: "balance" | "total";
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
            <AccountRow account={account} level={level} amountField={amountField} />
            <AccountList
              accounts={accounts}
              parentId={account.id}
              level={level + 1}
              amountField={amountField}
            />
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
