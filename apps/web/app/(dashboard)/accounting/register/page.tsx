import { auth } from "@/auth";
import {
  getAccountingTransactions,
  getChartOfAccounts,
  getAccountingPayees,
  getAccountingClasses,
} from "@workspace/db";
import { redirect } from "next/navigation";
import { RegisterClient } from "./register-client";

export default async function RegisterPage() {
  const session = await auth();
  if (!session?.user?.organizationId) return redirect("/api/auth/signin");

  const [transactions, accounts, payees, classes] = await Promise.all([
    getAccountingTransactions(session.user.organizationId),
    getChartOfAccounts(session.user.organizationId),
    getAccountingPayees(session.user.organizationId),
    getAccountingClasses(session.user.organizationId),
  ]);

  return (
    <div className="p-8">
      <RegisterClient
        transactions={transactions}
        accounts={accounts}
        payees={payees}
        classes={classes}
      />
    </div>
  );
}
