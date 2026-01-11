import { auth } from "@/auth";
import { getBalanceSheetReport } from "@workspace/db";
import { redirect } from "next/navigation";
import { BalanceSheetClient } from "./balance-sheet-client";

export default async function BalanceSheetReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [_key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) return redirect("/api/auth/signin");

  const params = await searchParams;
  const asOfDateParam = params.asOfDate as string | undefined;

  const asOfDate = asOfDateParam ? new Date(asOfDateParam) : undefined;

  const { balanceSheet, netIncome } = await getBalanceSheetReport(
    session.user.organizationId,
    asOfDate,
  );

  return (
    <div className="p-8">
      <BalanceSheetClient
        balanceSheet={balanceSheet}
        netIncome={netIncome}
        asOfDate={asOfDate}
      />
    </div>
  );
}
