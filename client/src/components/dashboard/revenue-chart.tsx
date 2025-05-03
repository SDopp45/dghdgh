import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export function RevenueChart() {
  const { data: tenants } = useQuery<any[]>({ queryKey: ["/api/tenants"] });
  
  // Calculer les revenus mensuels pour les 12 derniers mois
  const monthlyData = Array.from({ length: 12 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - index));
    const monthYear = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    
    // Filtrer les locataires actifs pour ce mois
    const activeTenantsRevenue = tenants
      ?.filter(tenant => {
        const leaseStart = new Date(tenant.leaseStart);
        const leaseEnd = new Date(tenant.leaseEnd);
        return tenant.active && leaseStart <= date && leaseEnd >= date;
      })
      .reduce((sum, tenant) => sum + Number(tenant.rentAmount), 0) ?? 0;

    return {
      month: monthYear,
      revenue: activeTenantsRevenue,
    };
  });

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Revenus Locatifs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `${value}€`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Revenue
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {payload[0].value}€
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
