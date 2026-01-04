import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getChartOfAccounts } from "@workspace/db";
import { ImportAccounts } from "./import-accounts";
import { ChartOfAccountsClient } from "./accounts-client";
import { AccountDialog } from "./account-dialog";

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return redirect("/organizations");
  }

  const data = await getChartOfAccounts(session.user.organizationId);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {data.length === 0 ? (
        <>
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Chart of Accounts
            </h2>
            <AccountDialog accounts={data} />
          </div>
          <ImportAccounts />
        </>
      ) : (
        <ChartOfAccountsClient data={data} />
      )}
    </div>
  );
}
