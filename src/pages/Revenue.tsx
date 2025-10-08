import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/PageHeader';
import AppHeader from '@/components/AppHeader';
import { useNavigate } from 'react-router-dom';
import { getAllInvoices } from '@/lib/db';
import type { Invoice } from '@/lib/db';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Period = 'weekly' | 'monthly' | 'yearly' | 'all';

const startOfPeriod = (date: Date, period: Period) => {
  const d = new Date(date);
  if (period === 'weekly') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(d.setDate(diff));
  }
  if (period === 'monthly') return new Date(d.getFullYear(), d.getMonth(), 1);
  if (period === 'yearly') return new Date(d.getFullYear(), 0, 1);
  return new Date(0);
};

const Revenue = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [period, setPeriod] = useState<Period>('monthly');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

  useEffect(() => {
    (async () => {
      const data = await getAllInvoices();
      setInvoices(data);
    })();
  }, []);

  const now = new Date();
  const rangeStart = customFrom ? new Date(customFrom) : startOfPeriod(now, period);
  const rangeEnd = customTo ? new Date(customTo) : now;

  const filtered = useMemo(() => {
    return invoices.filter((inv) => inv.createdAt >= rangeStart.getTime() && inv.createdAt <= rangeEnd.getTime());
  }, [invoices, rangeStart, rangeEnd]);

  const totals = useMemo(() => {
    const revenue = filtered.reduce((s, inv) => s + inv.total, 0);
    const received = filtered.reduce((s, inv) => s + inv.paid, 0);
    const cost = filtered.reduce((s, inv) => s + inv.items.reduce((ss, it) => ss + (it.costPerUnit ?? 0) * it.quantity, 0), 0);
    return { revenue, cost, profit: revenue - cost, received };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="ZES Electric Store" subtitle="Revenue" />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <PageHeader title="Revenue & Profit" subtitle="Track income vs cost" onBack={() => navigate('/dashboard')} />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Label>Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                  <SelectItem value="yearly">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From</Label>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Revenue</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">Rs {totals.revenue.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Cost</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">Rs {totals.cost.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Profit</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">Rs {totals.profit.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Amount Received</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">Rs {totals.received.toFixed(2)}</div></CardContent>
        </Card>
      </div>
      </main>
    </div>
  );
};

export default Revenue;


