import { auth } from "@/auth";
import {
  getProfitAndLossReport,
  getDateRange,
  DateRangePreset,
  DateRange,
  getAccountingClasses,
} from "@workspace/db";
import { redirect } from "next/navigation";
import { ProfitLossClient } from "./profit-loss-client";

export default async function ProfitAndLossReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [_key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) return redirect("/api/auth/signin");

  const params = await searchParams;
  const preset = (params.preset as DateRangePreset) || "thisyear";
  const customStartDate = params.startDate as string;
  const customEndDate = params.endDate as string;
  const classId = params.classId as string | undefined;

  let dateRange: DateRange;
  if (preset === "custom" && customStartDate && customEndDate) {
    dateRange = {
      startDate: new Date(customStartDate),
      endDate: new Date(customEndDate),
    };
  } else {
    dateRange = getDateRange(preset);
  }

  const [profitLoss, classes] = await Promise.all([
    getProfitAndLossReport(session.user.organizationId, dateRange, classId),
    getAccountingClasses(session.user.organizationId),
  ]);

  return (
    <div className="p-8">
      <ProfitLossClient
        profitLoss={profitLoss}
        classes={classes}
        preset={preset}
        dateRange={dateRange}
        classId={classId}
      />
    </div>
  );
}
