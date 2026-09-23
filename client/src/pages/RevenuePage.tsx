import { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  BarChart,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';

const COUNTRIES = ['France', 'Germany', 'Spain', 'Netherlands', 'Austria', 'Switzerland'] as const;

export function RevenuePage() {
  const [country, setCountry] = useState<string>('France');
  const shareParams = useMemo(
    () => ({
      country: sql.string(country),
      period_short: sql.string('MAT'),
    }),
    [country]
  );

  const { data: brands, loading: brandsLoading, error: brandsError } = useAnalyticsQuery('brand_sales_france');
  const { data: lift, loading: liftLoading, error: liftError } = useAnalyticsQuery('lift_assumptions');

  const topBrand = brands?.[0];
  const totalBrandSales = brands?.reduce((acc, row) => acc + Number(row.value_sales_k_eur ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Revenue impact case</h2>
        <p className="text-sm text-muted-foreground">
          Structured sell-out in Delta Lake (MAT) plus shelf optimization lift assumptions — how the scan translates to
          euros.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-muted-foreground">Danone FR dairy brands · MAT · €k</p>
            {brandsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-semibold text-foreground">{totalBrandSales.toLocaleString('fr-FR')}</p>
            )}
            <p className="text-xs text-muted-foreground">Source: sellout.sellout_sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-muted-foreground">Top platform brand</p>
            {brandsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-semibold text-foreground">{topBrand ? String(topBrand.brand) : '—'}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {topBrand ? `${Number(topBrand.value_sales_k_eur).toLocaleString('fr-FR')} €k value sales` : 'No data'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-muted-foreground">Eye-level SKU lift assumption</p>
            <p className="text-2xl font-semibold text-success">+12%</p>
            <p className="text-xs text-muted-foreground">For SKUs moved into the strike zone</p>
          </CardContent>
        </Card>
      </div>

      {brandsError && (
        <Alert variant="destructive">
          <AlertTitle>Brand sales query failed</AlertTitle>
          <AlertDescription>{brandsError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Danone France brand value sales</CardTitle>
            <CardDescription>MAT · value_sales_1000 (€k) · sellout Delta table</CardDescription>
          </CardHeader>
          <CardContent>
            {brandsLoading && <Skeleton className="h-[300px] w-full" />}
            {!brandsLoading && brands && brands.length > 0 && (
              <BarChart
                data={brands}
                xKey="brand"
                yKey="value_sales_k_eur"
                height={300}
                colorPalette="categorical"
                orientation="horizontal"
                ariaLabel="Danone France brand value sales"
              />
            )}
            {!brandsLoading && brands && brands.length === 0 && (
              <p className="text-sm text-muted-foreground">No brand rows for France MAT.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3">
            <div>
              <CardTitle>Manufacturer value share</CardTitle>
              <CardDescription>Dairy · MAT · competitive context for SoS pitches</CardDescription>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <BarChart
              queryKey="manufacturer_value_share"
              parameters={shareParams}
              xKey="manufacturer"
              yKey="value_share_pct"
              height={300}
              colorPalette="categorical"
              ariaLabel="Manufacturer value share"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Optimization strategies → estimated lift</CardTitle>
          <CardDescription>
            Hackathon business case assumptions stored in shelf_optimizer.sku_lift_assumptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {liftLoading && <Skeleton className="h-40 w-full" />}
          {liftError && (
            <Alert variant="destructive">
              <AlertTitle>Lift assumptions unavailable</AlertTitle>
              <AlertDescription>{liftError}</AlertDescription>
            </Alert>
          )}
          {!liftLoading && lift && <DataTable queryKey="lift_assumptions" parameters={{}} pageSize={10} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How this drives top-line growth</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <ImpactRow title="OOS reduction" body="2–4% total sales lift by restocking voids before leaving the store." />
          <ImpactRow
            title="Eye-level is buy-level"
            body="10–15% lift for high-margin SKUs relocated to the 1.2–1.6m strike zone."
          />
          <ImpactRow
            title="Trade spend compliance"
            body="Immediate ROI recovery when promo tags and end-caps paid for by Danone are verified."
          />
          <ImpactRow
            title="Cross-merchandising"
            body="Basket-size increase when dairy is placed next to granola / fresh berries."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ImpactRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border p-3 space-y-1">
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );
}
