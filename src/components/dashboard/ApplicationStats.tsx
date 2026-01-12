import { useMemo } from 'react';
import { parseDate } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import type { Application } from '@/types/resume';

interface ApplicationStatsProps {
  applications: Application[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'hsl(220, 14%, 50%)',
  applied: 'hsl(210, 80%, 52%)',
  interview: 'hsl(38, 92%, 50%)',
  offer: 'hsl(152, 60%, 40%)',
  rejected: 'hsl(0, 72%, 51%)',
  withdrawn: 'hsl(220, 10%, 45%)',
};

export function ApplicationStats({ applications }: ApplicationStatsProps) {
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach((app) => {
      counts[app.status] = (counts[app.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: STATUS_COLORS[name] || 'hsl(220, 14%, 50%)',
    }));
  }, [applications]);

  const responseStats = useMemo(() => {
    const total = applications.length;
    const responded = applications.filter((app) =>
      ['interview', 'offer', 'rejected'].includes(app.status)
    ).length;
    const positive = applications.filter((app) =>
      ['interview', 'offer'].includes(app.status)
    ).length;

    return {
      responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      positiveRate: total > 0 ? Math.round((positive / total) * 100) : 0,
      interviewRate: total > 0 ? Math.round((applications.filter(a => a.status === 'interview').length / total) * 100) : 0,
      offerRate: total > 0 ? Math.round((applications.filter(a => a.status === 'offer').length / total) * 100) : 0,
    };
  }, [applications]);

  const timelineData = useMemo(() => {
    const grouped: Record<string, number> = {};
    applications.forEach((app) => {
      const date = parseDate(app.applicationDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      grouped[monthKey] = (grouped[monthKey] || 0) + 1;
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, count]) => ({
        month: parseDate(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        applications: count,
      }));
  }, [applications]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks: { week: string; count: number }[] = [];
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7 + now.getDay()));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const count = applications.filter((app) => {
        const appDate = parseDate(app.applicationDate);
        return appDate >= weekStart && appDate <= weekEnd;
      }).length;

      weeks.push({
        week: `Week ${4 - i}`,
        count,
      });
    }
    return weeks;
  }, [applications]);

  if (applications.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Status Breakdown Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Response Rates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Response Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Overall Response</span>
                <span className="font-medium">{responseStats.responseRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${responseStats.responseRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Interview Rate</span>
                <span className="font-medium">{responseStats.interviewRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning transition-all"
                  style={{ width: `${responseStats.interviewRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Offer Rate</span>
                <span className="font-medium">{responseStats.offerRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-success transition-all"
                  style={{ width: `${responseStats.offerRate}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Monthly Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="applications" fill="hsl(172, 50%, 35%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Activity */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weekly Activity (Last 4 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(172, 50%, 35%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(172, 50%, 35%)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
