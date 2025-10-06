import PageHeader from '@/components/PageHeader';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAllCustomers, getInvoicesByStatus, addPayment } from '@/lib/db';
import type { Customer, Invoice } from '@/lib/db';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const Pending = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<'cash' | 'card' | 'easypay' | 'jazzcash' | 'bank'>('cash');

  useEffect(() => {
    (async () => {
      const [cust, partial, unpaid] = await Promise.all([
        getAllCustomers(),
        getInvoicesByStatus('partial'),
        getInvoicesByStatus('unpaid'),
      ]);
      setCustomers(cust);
      // include both partial and unpaid
      setInvoices([...partial, ...unpaid].sort((a, b) => b.createdAt - a.createdAt));
    })();
  }, []);

  const selectedInvoice = useMemo(() => invoices.find((i) => i.id === selectedInvoiceId), [invoices, selectedInvoiceId]);

  const onReceive = async () => {
    if (!selectedInvoice) {
      toast({ variant: 'destructive', title: 'Select an invoice' });
      return;
    }
    if (amount <= 0) {
      toast({ variant: 'destructive', title: 'Enter a valid amount' });
      return;
    }
    await addPayment({ invoiceId: selectedInvoice.id, customerId: selectedInvoice.customerId, amount, method, createdBy: 'current-user' });
    toast({ title: 'Payment recorded' });
    setAmount(0);
    setSelectedInvoiceId('');
    const [partial, unpaid] = await Promise.all([
      getInvoicesByStatus('partial'),
      getInvoicesByStatus('unpaid'),
    ]);
    setInvoices([...partial, ...unpaid].sort((a, b) => b.createdAt - a.createdAt));
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <PageHeader title="Pending Payments" subtitle="Record payments for partially paid invoices" onBack={() => navigate('/dashboard')} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Invoice</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2 pr-4">Paid</th>
                    <th className="py-2 pr-4">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{inv.invoiceNumber}</td>
                      <td className="py-2 pr-4">{inv.customerName}</td>
                      <td className="py-2 pr-4">Rs {inv.total}</td>
                      <td className="py-2 pr-4">Rs {inv.paid}</td>
                      <td className="py-2 pr-4 font-medium">Rs {inv.due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receive Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Select Invoice</Label>
                <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber} • {inv.customerName} • Due Rs {inv.due}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Amount</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Method</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="easypay">EasyPay</SelectItem>
                      <SelectItem value="jazzcash">JazzCash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedInvoice && (
                <div className="text-sm text-muted-foreground">Remaining due: Rs {Math.max(0, selectedInvoice.total - selectedInvoice.paid)}</div>
              )}
              <Button onClick={onReceive}>Record Payment</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pending;


