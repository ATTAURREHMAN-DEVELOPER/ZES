import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { getAllProducts, getAllInvoices, getAllCustomers, getInvoicesByStatus } from '@/lib/db';
import { Package, Receipt, Users, AlertCircle, Zap } from 'lucide-react';
import type { Product, Invoice, Customer } from '@/lib/db';
import AppHeader from '@/components/AppHeader';

const Dashboard = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    const [productsData, invoicesData, customersData, pendingData] = await Promise.all([
      getAllProducts(),
      getAllInvoices(),
      getAllCustomers(),
      getInvoicesByStatus('partial'),
    ]);
    setProducts(productsData);
    setInvoices(invoicesData);
    setCustomers(customersData);
    setPendingInvoices(pendingData);
  };


  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.paid, 0);
  // Sum due from invoices (covers walk-in customers too)
  const totalDue = invoices.reduce((sum, inv) => sum + (inv.due || 0), 0);
  const pendingCustomersCount = (() => {
    const keys = new Set<string>();
    invoices.forEach((inv) => {
      if ((inv.due || 0) > 0) {
        keys.add(inv.customerId || inv.customerName || 'Walk-in');
      }
    });
    return keys.size;
  })();
  const lowStockProducts = products.filter(p => p.stock < 10);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="ZES Electric Store" subtitle="Dashboard" />

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="transition-colors hover:bg-accent/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">
                {lowStockProducts.length} low stock
              </p>
            </CardContent>
          </Card>

          <Card className="transition-colors hover:bg-accent/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices.length}</div>
              <p className="text-xs text-muted-foreground">
                {pendingInvoices.length} pending payments
              </p>
            </CardContent>
          </Card>

          <Card className="transition-colors hover:bg-accent/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs {totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="transition-colors hover:bg-accent/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Dues</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">Rs {totalDue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From {pendingCustomersCount} customers</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button onClick={() => navigate('/products')} className="h-24">
            <Package className="mr-2 h-5 w-5" />
            Manage Products
          </Button>
          <Button onClick={() => navigate('/billing')} className="h-24">
            <Receipt className="mr-2 h-5 w-5" />
            Create Invoice
          </Button>
          <Button onClick={() => navigate('/customers')} className="h-24">
            <Users className="mr-2 h-5 w-5" />
            View Customers
          </Button>
          <Button onClick={() => navigate('/pending')} variant="outline" className="h-24">
            <AlertCircle className="mr-2 h-5 w-5" />
            Pending Payments
          </Button>
          <Button onClick={() => navigate('/invoices')} variant="outline" className="h-24">
            <Receipt className="mr-2 h-5 w-5" />
            All Invoices
          </Button>
          {user?.role === 'owner' && (
            <Button onClick={() => navigate('/users')} variant="outline" className="h-24">
              <Users className="mr-2 h-5 w-5" />
              Users
            </Button>
          )}
          {user?.role === 'owner' && (
            <Button onClick={() => navigate('/revenue')} className="h-24">
              <Receipt className="mr-2 h-5 w-5" />
              Revenue
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
