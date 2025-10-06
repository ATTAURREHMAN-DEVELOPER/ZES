import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAllCustomers, addCustomer, updateCustomer } from '@/lib/db';
import type { Customer } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

const emptyForm = { name: '', phone: '', email: '', address: '' } as const;

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const list = await getAllCustomers();
    setCustomers(list);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCustomer(editingId, form);
        toast({ title: 'Customer updated' });
      } else {
        await addCustomer(form as any);
        toast({ title: 'Customer added' });
      }
      setForm({ ...emptyForm });
      setEditingId(null);
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    }
  };

  const onEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone, email: c.email ?? '', address: c.address ?? '' });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <PageHeader title="Customers" subtitle="Manage customer records" onBack={() => navigate('/dashboard')} />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Customer' : 'Add Customer'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="md:col-span-4">
              <Button type="submit">{editingId ? 'Update' : 'Add'}</Button>
              {editingId && (
                <Button type="button" variant="ghost" className="ml-2" onClick={() => { setEditingId(null); setForm({ ...emptyForm }); }}>Cancel</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Customer List</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search customers..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Address</th>
                  <th className="py-2 pr-4">Total Due</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.filter((c) => {
                  const q = query.toLowerCase();
                  return !q || c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
                }).map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{c.name}</td>
                    <td className="py-2 pr-4">{c.phone}</td>
                    <td className="py-2 pr-4">{c.email ?? '-'}</td>
                    <td className="py-2 pr-4">{c.address ?? '-'}</td>
                    <td className="py-2 pr-4">Rs {c.totalDue.toFixed(2)}</td>
                    <td className="py-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(c)}>Edit</Button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No customers yet. Use the form above to add one.</td>
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

export default Customers;


