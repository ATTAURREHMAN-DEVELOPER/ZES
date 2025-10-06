import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllProducts, getAllCustomers, createInvoice } from '@/lib/db';
import type { Product, Customer, InvoiceItem } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { savePDF, printPDF } from '@/lib/pdf';

const Billing = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [cart, setCart] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'easypay' | 'jazzcash' | 'bank'>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [customerPhone, setCustomerPhone] = useState<string>('');

  useEffect(() => {
    Promise.all([getAllProducts(), getAllCustomers()]).then(([p, c]) => {
      setProducts(p);
      setCustomers(c);
    });
  }, []);

  const [productQuery, setProductQuery] = useState('');
  const productSuggestions = useMemo(() => {
    const q = productQuery.toLowerCase();
    if (!q) return [] as Product[];
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 8);
  }, [productQuery, products]);

  const items: InvoiceItem[] = useMemo(() => {
    const list: InvoiceItem[] = [];
    for (const c of cart) {
      const p = products.find((pp) => pp.id === c.productId);
      if (!p) continue;
      list.push({
        productId: p.id,
        productName: p.name,
        quantity: c.quantity,
        unit: p.unit,
        pricePerUnit: p.pricePerUnit,
        costPerUnit: p.costPerUnit,
        total: p.pricePerUnit * c.quantity,
      });
    }
    return list;
  }, [cart, products]);

  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const tax = Math.round(subtotal * 0.0); // adjust if needed
  const total = subtotal + tax;
  const due = Math.max(0, total - paidAmount);

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const ex = prev.find((x) => x.productId === productId);
      if (ex) return prev.map((x) => (x.productId === productId ? { ...x, quantity: x.quantity + 1 } : x));
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    setCart((prev) => prev.map((x) => (x.productId === productId ? { ...x, quantity: Math.max(1, qty) } : x)));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((x) => x.productId !== productId));
  };

  const onCreateInvoice = async (saveOnly: boolean) => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'Cart is empty' });
      return;
    }

    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
    const customerNameValue = selectedCustomerId ? (customers.find((c) => c.id === selectedCustomerId)?.name || customerName) : customerName;
    const invoice = {
      invoiceNumber: invoiceNum,
      customerId: selectedCustomerId,
      customerName: customerNameValue,
      customerPhone: selectedCustomerId ? customers.find((c) => c.id === selectedCustomerId)?.phone : customerPhone,
      items,
      subtotal,
      tax,
      total,
      paid: paidAmount,
      due,
      paymentMethod,
      status: due === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
      createdBy: 'current-user',
    } as const;

    try {
      const id = await createInvoice(invoice as any);
      // build a printable invoice with current timestamp
      const finalInvoice = { ...(invoice as any), id, createdAt: Date.now() } as any;
      if (saveOnly) {
        savePDF(finalInvoice);
        toast({ title: 'Invoice saved as PDF' });
      } else {
        printPDF(finalInvoice);
        toast({ title: 'Invoice sent to print' });
      }
      // reset
      setCart([]);
      setPaidAmount(0);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error creating invoice', description: (err as Error).message });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <PageHeader title="Billing" subtitle="Create invoices and accept payments" onBack={() => navigate('/dashboard')} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Unit</th>
                    <th className="py-2 pr-4">Price</th>
                    <th className="py-2 pr-4">Qty</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.productId} className="border-b last:border-0">
                      <td className="py-2 pr-4">{it.productName}</td>
                      <td className="py-2 pr-4">{it.unit}</td>
                      <td className="py-2 pr-4">Rs {it.pricePerUnit}</td>
                      <td className="py-2 pr-4">
                        <Input type="number" className="w-24" value={cart.find((c) => c.productId === it.productId)?.quantity ?? 1} onChange={(e) => updateQty(it.productId, Number(e.target.value))} />
                      </td>
                      <td className="py-2 pr-4">Rs {it.total}</td>
                      <td className="py-2">
                        <Button size="sm" variant="destructive" onClick={() => removeFromCart(it.productId)}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer & Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Existing Customer</Label>
                <Select value={selectedCustomerId ?? 'walkin'} onValueChange={(v) => setSelectedCustomerId(v === 'walkin' ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Walk-in Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walkin">Walk-in Customer</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!selectedCustomerId && (
                <div>
                  <Label>Customer Name</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
              )}
              {!selectedCustomerId && (
                <div>
                  <Label>Phone Number</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
              )}
              <div>
                <Label>Paid Amount</Label>
                <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
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

              <div className="pt-2 text-sm space-y-2 rounded-md border p-3 bg-muted/30">
                <div className="flex justify-between"><span>Subtotal</span><span>Rs {subtotal}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>Rs {tax}</span></div>
                <div className="flex justify-between font-semibold"><span>Total</span><span>Rs {total}</span></div>
                <div className="flex justify-between"><span>Paid</span><span>Rs {paidAmount}</span></div>
                <div className="flex justify-between font-semibold"><span>Due</span><span>Rs {due}</span></div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => onCreateInvoice(false)} disabled={items.length === 0}>Print</Button>
                <Button variant="outline" onClick={() => onCreateInvoice(true)} disabled={items.length === 0}>Save as PDF</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Products</CardTitle>
            <div className="relative w-full max-w-md">
              <Input placeholder="Search products to add..." value={productQuery} onChange={(e) => setProductQuery(e.target.value)} />
              {productSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow">
                  {productSuggestions.map((p) => (
                    <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-accent" onClick={() => { addToCart(p.id); setProductQuery(''); }}>
                      {p.name} <span className="text-xs text-muted-foreground">• {p.category} • {p.unit} • Rs {p.pricePerUnit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p) => (
              <div key={p.id} className="border rounded-md p-3">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.category} • {p.unit}{p.watts ? ` • ${p.watts}` : ''}</div>
                <div className="mt-1 text-sm">Rs {p.pricePerUnit} • Stock {p.stock}</div>
                <Button className="mt-2" size="sm" onClick={() => addToCart(p.id)}>Add</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;


