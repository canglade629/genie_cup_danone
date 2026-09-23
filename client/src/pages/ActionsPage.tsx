import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@databricks/appkit-ui/react';
import { RefreshCw } from 'lucide-react';

type RecommendationRow = {
  id: number;
  store_id: string;
  store_name: string;
  recommendation_id: string;
  title: string;
  rationale: string;
  projected_lift_pct: string | number;
  estimated_weekly_eur: string | number;
  status: string;
  accepted_at: string;
};

export function ActionsPage() {
  const [rows, setRows] = useState<RecommendationRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recommendations');
      if (!res.ok) throw new Error('Failed to load accepted actions');
      const json = (await res.json()) as RecommendationRow[];
      setRows(json);
    } catch (err) {
      setError((err as Error).message);
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalWeekly = rows?.reduce((acc, r) => acc + Number(r.estimated_weekly_eur ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">Accepted actions</h2>
          <p className="text-sm text-muted-foreground">
            Persisted in Lakebase Postgres — the audit trail of rep decisions from shelf scans.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-muted-foreground">Accepted recommendations</p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-semibold">{rows?.length ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground">Lakebase · app.accepted_recommendations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-muted-foreground">Projected weekly € from accepted NBAs</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-semibold text-success">€{totalWeekly.toLocaleString('fr-FR')}</p>
            )}
            <p className="text-xs text-muted-foreground">Sum of estimated_weekly_eur</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load actions</AlertTitle>
          <AlertDescription>
            {error}. If this is the first run, deploy the app so the service principal can create the Lakebase schema,
            then refresh.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Decision log</CardTitle>
          <CardDescription>Most recent first</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}
          {!loading && rows && rows.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No accepted recommendations yet</EmptyTitle>
                <EmptyDescription>
                  Run a shelf scan and click Accept recommendation to write the first row.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {!loading && rows && rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Lift</TableHead>
                  <TableHead>€ / week</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(r.accepted_at).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell>{r.store_name}</TableCell>
                    <TableCell>
                      <div className="space-y-1 max-w-md">
                        <p className="font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.rationale}</p>
                      </div>
                    </TableCell>
                    <TableCell>+{Number(r.projected_lift_pct)}%</TableCell>
                    <TableCell>€{Number(r.estimated_weekly_eur).toLocaleString('fr-FR')}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
