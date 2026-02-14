import { briefingsApi } from "@/lib/api";
import { BriefingsDashboard } from "./BriefingsDashboard";

export const dynamic = "force-dynamic";

export default async function BriefingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = dateParam || today;

  const [briefings, stats, dates] = await Promise.all([
    briefingsApi.listByDate(date),
    briefingsApi.statsForDate(date),
    briefingsApi.listDates(14),
  ]);

  return (
    <BriefingsDashboard
      date={date}
      today={today}
      briefings={briefings.items}
      stats={stats}
      availableDates={dates}
    />
  );
}
