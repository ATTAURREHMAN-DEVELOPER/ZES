import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAllInvoices } from '@/lib/db';
import type { Invoice } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { savePDF, printPDF } from '@/lib/pdf';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Search } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

const Invoices = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [query, setQuery] = useState('');
  const user = getCurrentUser();

  useEffect(() => {
    (async () => {
      const list = await getAllInvoices();
      // sort by date desc
      setInvoices(list.sort((a, b) => b.createdAt - a.createdAt));
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      (inv.customerPhone?.toLowerCase().includes(q) ?? false),
    );
  }, [invoices, query]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <PageHeader title="Invoices" subtitle="View and reprint previous invoices" onBack={() => navigate('/dashboard')} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>All Invoices</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search by number, name, phone..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Invoice #</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Paid</th>
                  {user?.role === 'owner' && (<th className="py-2 pr-4">Profit</th>)}
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{inv.invoiceNumber}</td>
                    <td className="py-2 pr-4">{new Date(inv.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">{inv.customerName}</td>
                    <td className="py-2 pr-4">{inv.customerPhone ?? '-'}</td>
                    <td className="py-2 pr-4">Rs {inv.total}</td>
                    <td className="py-2 pr-4">Rs {inv.paid}</td>
                    {user?.role === 'owner' && (
                      <td className="py-2 pr-4">{
                        (() => {
                          const cost = inv.items.reduce((s, it) => s + (it.costPerUnit ?? 0) * it.quantity, 0);
                          return `Rs ${inv.total - cost}`;
                        })()
                      }</td>
                    )}
                    <td className="py-2 pr-4 capitalize">{inv.status}</td>
                    <td className="py-2">
                      <Button size="sm" onClick={() => printPDF(inv)}>Print</Button>
                      <Button size="sm" variant="outline" className="ml-2" onClick={() => savePDF(inv)}>Save PDF</Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">No invoices found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;


