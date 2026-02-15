import { briefingsApi, newsApi } from "@/lib/api";
import { BriefingsDashboard } from "./BriefingsDashboard";

export const dynamic = "force-dynamic";

export default async function BriefingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  // Fetch available dates first so we can default to the most recent one with data
  const dates = await briefingsApi.listDates(14);
  const date = dateParam || (dates.length > 0 ? dates[0] : today);

  const [briefings, stats, news] = await Promise.all([
    briefingsApi.listByDate(date),
    briefingsApi.statsForDate(date),
    newsApi.getByDate(date),
  ]);

  return (
    <BriefingsDashboard
      date={date}
      today={today}
      briefings={briefings.items}
      stats={stats}
      availableDates={dates}
      news={news}
    />
  );
}
