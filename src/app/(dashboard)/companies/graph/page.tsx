import { GraphExplorer } from "./GraphExplorer";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ companyId?: string; name?: string }>;
}

export default async function GraphExplorerPage({ searchParams }: Props) {
  const params = await searchParams;

  // Check if Neo4j env is configured
  const neo4jAvailable = !!(
    process.env.NEO4J_URI &&
    process.env.NEO4J_USER &&
    process.env.NEO4J_PASSWORD
  );

  return (
    <GraphExplorer
      initialAvailable={neo4jAvailable}
      initialCompanyId={params.companyId}
      initialCompanyName={params.name}
    />
  );
}
