import { companiesApi } from "@/lib/api";
import { CompanyMap } from "./CompanyMap";

export const dynamic = "force-dynamic";

export default async function CompanyMapPage() {
  // Load initial viewport markers for South Africa bounding box
  const initialMarkers = await companiesApi.boundingBox(
    -35.0, // southernmost SA
    -22.0, // northernmost SA
    16.0, // western SA
    33.0, // eastern SA
    { limit: 5000 }
  );

  return (
    <div className="h-[calc(100vh-8rem)]">
      <CompanyMap initialMarkers={initialMarkers} />
    </div>
  );
}
