import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import AppHeader from '@/components/AppHeader';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAllProducts, addProduct, updateProduct, deleteProduct } from '@/lib/db';
import type { Product } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/auth';

const emptyForm = { name: '', category: '', unit: 'piece', pricePerUnit: 0, stock: 0, watts: '' } as const;

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const user = getCurrentUser();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const list = await getAllProducts();
    setProducts(list);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateProduct(editingId, form);
        toast({ title: 'Product updated' });
      } else {
        await addProduct(form as any);
        toast({ title: 'Product added' });
      }
      setForm({ ...emptyForm });
      setEditingId(null);
      await load();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    }
  };

  const onEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ name: p.name, category: p.category, unit: p.unit, pricePerUnit: p.pricePerUnit, stock: p.stock, watts: p.watts ?? '' });
  };

  const onDelete = async (id: string) => {
    await deleteProduct(id);
    toast({ title: 'Product deleted' });
    await load();
  };

  const onStockChange = async (p: Product, delta: number) => {
    const currentStock = p.stock || 0;
    const next = currentStock + delta;
    
    // Prevent negative stock
    if (next < 0) {
      toast({
        variant: 'destructive',
        title: 'Cannot reduce stock below zero',
        description: `Stock for ${p.name} cannot go below 0`
      });
      return;
    }
    
    try {
      await updateProduct(p.id, { stock: next });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, stock: next } : x)));
      
      // Show success message for stock updates
      toast({
        title: 'Stock updated',
        description: `${p.name} stock changed from ${currentStock} to ${next}`
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to update stock',
        description: (err as Error).message
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="ZES Electric Store" subtitle="Products" />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <PageHeader title="Products" subtitle="Manage your inventory" onBack={() => navigate('/dashboard')} />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Product' : 'Add Product'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="unit">Unit (piece/meter/pack)</Label>
              <Input id="unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as any })} required />
            </div>
            <div>
              <Label htmlFor="price">Price per unit</Label>
              <Input id="price" type="number" value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: Number(e.target.value) })} required />
            </div>
            {user?.role === 'owner' && (
              <div>
                <Label htmlFor="cost">Cost per unit (owner only)</Label>
                <Input id="cost" type="number" value={(form as any).costPerUnit ?? ''} onChange={(e) => setForm({ ...form, costPerUnit: Number(e.target.value) } as any)} />
              </div>
            )}
            <div>
              <Label htmlFor="stock">Stock</Label>
              <Input 
                id="stock" 
                type="number" 
                min="0"
                value={form.stock} 
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 0) {
                    setForm({ ...form, stock: value });
                  }
                }} 
                required 
              />
            </div>
            <div>
              <Label htmlFor="watts">Watts (optional)</Label>
              <Input id="watts" value={form.watts} onChange={(e) => setForm({ ...form, watts: e.target.value })} />
            </div>
            <div className="md:col-span-3">
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
            <CardTitle>Inventory</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search products..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Unit</th>
                  <th className="py-2 pr-4">Watts</th>
                  <th className="py-2 pr-4">Price</th>
                  {user?.role === 'owner' && (<th className="py-2 pr-4">Cost</th>)}
                  <th className="py-2 pr-4">Stock</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.filter((p) => {
                  const q = query.toLowerCase();
                  return !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
                }).map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{p.name}</td>
                    <td className="py-2 pr-4">{p.category}</td>
                    <td className="py-2 pr-4 capitalize">{p.unit}</td>
                    <td className="py-2 pr-4">{p.watts ?? '-'}</td>
                    <td className="py-2 pr-4">Rs {p.pricePerUnit}</td>
                    {user?.role === 'owner' && (<td className="py-2 pr-4">{p.costPerUnit ? `Rs ${p.costPerUnit}` : '-'}</td>)}
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" onClick={() => onStockChange(p, -1)}>-</Button>
                        <span className="min-w-10 text-center">{p.stock}</span>
                        <Button size="icon" variant="outline" onClick={() => onStockChange(p, +1)}>+</Button>
                      </div>
                    </td>
                    <td className="py-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(p)}>Edit</Button>
                      <Button size="sm" variant="destructive" className="ml-2" onClick={() => onDelete(p.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">No products yet. Use the form above to add one.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </main>
    </div>
  );
};

export default Products;


