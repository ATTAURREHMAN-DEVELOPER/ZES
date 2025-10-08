import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import AppHeader from '@/components/AppHeader';
import { useNavigate } from 'react-router-dom';
import { getAllInvoices, getAllProducts } from '@/lib/db';
import type { Invoice, Product } from '@/lib/db';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, TrendingUp, TrendingDown, Package, Users, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

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
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [period, setPeriod] = useState<Period>('monthly');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    (async () => {
      const [invoicesData, productsData] = await Promise.all([
        getAllInvoices(),
        getAllProducts()
      ]);
      setInvoices(invoicesData);
      setProducts(productsData);
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

  // Detailed analytics
  const analytics = useMemo(() => {
    // Payment method breakdown
    const paymentMethods = filtered.reduce((acc, inv) => {
      acc[inv.paymentMethod] = (acc[inv.paymentMethod] || 0) + inv.paid;
      return acc;
    }, {} as Record<string, number>);

    // Top selling products
    const productSales = filtered.reduce((acc, inv) => {
      inv.items.forEach(item => {
        const existing = acc.find(p => p.productId === item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.total;
          existing.cost += (item.costPerUnit ?? 0) * item.quantity;
        } else {
          acc.push({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            revenue: item.total,
            cost: (item.costPerUnit ?? 0) * item.quantity,
            profit: item.total - ((item.costPerUnit ?? 0) * item.quantity)
          });
        }
      });
      return acc;
    }, [] as Array<{
      productId: string;
      productName: string;
      quantity: number;
      revenue: number;
      cost: number;
      profit: number;
    }>);

    // Customer analysis
    const customerStats = filtered.reduce((acc, inv) => {
      const customerKey = inv.customerId || inv.customerName || 'Walk-in';
      if (!acc[customerKey]) {
        acc[customerKey] = { invoices: 0, revenue: 0, paid: 0, due: 0 };
      }
      acc[customerKey].invoices += 1;
      acc[customerKey].revenue += inv.total;
      acc[customerKey].paid += inv.paid;
      acc[customerKey].due += inv.due;
      return acc;
    }, {} as Record<string, { invoices: number; revenue: number; paid: number; due: number }>);

    // Daily revenue trend
    const dailyRevenue = filtered.reduce((acc, inv) => {
      const date = new Date(inv.createdAt).toDateString();
      acc[date] = (acc[date] || 0) + inv.total;
      return acc;
    }, {} as Record<string, number>);

    return {
      paymentMethods,
      topProducts: productSales.sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      customerStats: Object.entries(customerStats).map(([customer, stats]) => ({
        customer,
        ...stats
      })).sort((a, b) => b.revenue - a.revenue),
      dailyRevenue: Object.entries(dailyRevenue).map(([date, revenue]) => ({
        date,
        revenue
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      totalInvoices: filtered.length,
      averageInvoiceValue: filtered.length > 0 ? totals.revenue / filtered.length : 0,
      profitMargin: totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0
    };
  }, [filtered, totals.revenue, totals.profit]);

  // PDF Export functionality
  const exportReport = () => {
    const doc = new jsPDF();
    
    // Set up colors matching the website's design system
    const primaryColor: [number, number, number] = [255, 193, 7]; // Golden yellow
    const secondaryColor: [number, number, number] = [14, 165, 233]; // Sky blue
    const accentColor: [number, number, number] = [20, 184, 166]; // Teal
    const destructiveColor: [number, number, number] = [239, 68, 68]; // Red
    const mutedColor: [number, number, number] = [241, 245, 249]; // Light gray
    const sidebarColor: [number, number, number] = [30, 41, 59]; // Dark blue-gray

    const formatCurrency = (amount: number) => `Rs ${amount.toFixed(2)}`;
    
    // Header with background
    doc.setFillColor(...sidebarColor);
    doc.rect(0, 0, 210, 50, 'F');
    
    // Golden accent stripe
    doc.setFillColor(...primaryColor);
    doc.rect(0, 45, 210, 5, 'F');
    
    // Company logo/name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('ZES', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Zia Electric and Solar Systems', 105, 28, { align: 'center' });
    
    // Report title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REVENUE REPORT', 105, 38, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    let y = 65;
    
    // Report details box
    doc.setFillColor(...mutedColor);
    doc.rect(15, y, 180, 25, 'F');
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(1);
    doc.rect(15, y, 180, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`, 20, y + 8);
    doc.text(`Date Range: ${rangeStart.toDateString()} to ${rangeEnd.toDateString()}`, 20, y + 13);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y + 18);
    
    y += 35;
    
    // Summary section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...sidebarColor);
    doc.text('FINANCIAL SUMMARY', 20, y);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    y += 10;
    
    const summaryData = [
      ['Total Revenue', formatCurrency(totals.revenue)],
      ['Total Cost', formatCurrency(totals.cost)],
      ['Net Profit', formatCurrency(totals.profit)],
      ['Profit Margin', `${analytics.profitMargin.toFixed(1)}%`],
      ['Amount Received', formatCurrency(totals.received)],
      ['Outstanding Amount', formatCurrency(totals.revenue - totals.received)],
      ['Collection Rate', `${totals.revenue > 0 ? ((totals.received / totals.revenue) * 100).toFixed(1) : 0}%`],
      ['Total Invoices', analytics.totalInvoices.toString()],
      ['Average Invoice', formatCurrency(analytics.averageInvoiceValue)]
    ];
    
    summaryData.forEach(([label, value]) => {
      doc.text(`${label}:`, 20, y);
      doc.text(value, 110, y);
      y += 6;
    });
    
    y += 10;
    
    // Payment methods section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...sidebarColor);
    doc.text('PAYMENT METHODS BREAKDOWN', 20, y);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    y += 15;
    
    // Table header
    doc.setFillColor(...secondaryColor);
    doc.rect(20, y - 8, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Method', 25, y - 2);
    doc.text('Amount', 120, y - 2);
    doc.text('Percentage', 160, y - 2);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 2;
    
    Object.entries(analytics.paymentMethods).forEach(([method, amount]) => {
      const percentage = ((amount / totals.received) * 100).toFixed(1);
      doc.text(method.charAt(0).toUpperCase() + method.slice(1), 25, y);
      doc.text(formatCurrency(amount), 120, y);
      doc.text(`${percentage}%`, 160, y);
      y += 6;
    });
    
    y += 10;
    
    // Top products section
    if (analytics.topProducts.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...sidebarColor);
      doc.text('TOP SELLING PRODUCTS', 20, y);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      y += 15;
      
      // Table header
      doc.setFillColor(...secondaryColor);
      doc.rect(20, y - 8, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Product', 25, y - 2);
      doc.text('Qty', 100, y - 2);
      doc.text('Revenue', 120, y - 2);
      doc.text('Profit', 150, y - 2);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      y += 2;
      
      analytics.topProducts.slice(0, 8).forEach((product, index) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        const productName = product.productName.length > 25 ? 
          product.productName.substring(0, 22) + '...' : product.productName;
        
        doc.text(`${index + 1}. ${productName}`, 25, y);
        doc.text(product.quantity.toString(), 100, y);
        doc.text(formatCurrency(product.revenue), 120, y);
        doc.text(formatCurrency(product.profit), 150, y);
        y += 6;
      });
      
      y += 10;
    }
    
    // Customer analysis section
    if (analytics.customerStats.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...sidebarColor);
      doc.text('TOP CUSTOMERS', 20, y);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      y += 15;
      
      // Table header
      doc.setFillColor(...secondaryColor);
      doc.rect(20, y - 8, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Customer', 25, y - 2);
      doc.text('Invoices', 100, y - 2);
      doc.text('Revenue', 130, y - 2);
      doc.text('Due', 170, y - 2);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      y += 2;
      
      analytics.customerStats.slice(0, 10).forEach((customer, index) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        const customerName = customer.customer.length > 20 ? 
          customer.customer.substring(0, 17) + '...' : customer.customer;
        
        doc.text(`${index + 1}. ${customerName}`, 25, y);
        doc.text(customer.invoices.toString(), 100, y);
        doc.text(formatCurrency(customer.revenue), 130, y);
        doc.text(formatCurrency(customer.due), 170, y);
        y += 6;
      });
    }
    
    // Footer
    y = 275;
    doc.setFillColor(...mutedColor);
    doc.rect(15, y, 180, 15, 'F');
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.rect(15, y, 180, 15);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...sidebarColor);
    doc.text('This is a computerized report generated by ZES Electric Store System.', 105, y + 8, { align: 'center' });
    doc.text('For any queries, please contact us at your convenience.', 105, y + 12, { align: 'center' });
    
    // Clean design without page border
    
    // Save the PDF
    doc.save(`ZES-Revenue-Report-${period}-${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: 'Report exported',
      description: 'Revenue report has been downloaded as a PDF'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="ZES Electric Store" subtitle="Revenue" />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <PageHeader title="Revenue & Profit" subtitle="Track income vs cost" onBack={() => navigate('/dashboard')} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters & Controls</CardTitle>
            <div className="flex gap-2">
              <Button onClick={exportReport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button 
                onClick={() => setShowDetails(!showDetails)} 
                variant={showDetails ? "default" : "outline"} 
                size="sm"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
          </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card className="transition-colors hover:bg-accent/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs {totals.revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From {analytics.totalInvoices} invoices</p>
          </CardContent>
        </Card>
        
        <Card className="transition-colors hover:bg-accent/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Total Cost</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs {totals.cost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Product costs</p>
          </CardContent>
        </Card>
        
        <Card className="transition-colors hover:bg-accent/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Net Profit</CardTitle>
            <TrendingUp className={`h-4 w-4 ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rs {totals.profit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.profitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>
        
        <Card className="transition-colors hover:bg-accent/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Amount Received</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs {totals.received.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {((totals.received / totals.revenue) * 100).toFixed(1)}% of revenue
            </p>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Pending Amount</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Rs {(totals.revenue - totals.received).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Outstanding dues</p>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Avg Invoice</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs {analytics.averageInvoiceValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Section */}
      {showDetails && (
        <div className="space-y-6">
          {/* Payment Methods Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(analytics.paymentMethods).map(([method, amount]) => (
                  <div key={method} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">Rs {amount.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground capitalize">{method}</div>
                    <div className="text-xs text-muted-foreground">
                      {((amount / totals.received) * 100).toFixed(1)}% of received
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Selling Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Product</th>
                      <th className="py-2 pr-4">Quantity Sold</th>
                      <th className="py-2 pr-4">Revenue</th>
                      <th className="py-2 pr-4">Cost</th>
                      <th className="py-2 pr-4">Profit</th>
                      <th className="py-2">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topProducts.map((product, index) => (
                      <tr key={product.productId} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <div className="font-medium">{product.productName}</div>
                          <div className="text-xs text-muted-foreground">#{index + 1}</div>
                        </td>
                        <td className="py-2 pr-4">{product.quantity}</td>
                        <td className="py-2 pr-4">Rs {product.revenue.toFixed(2)}</td>
                        <td className="py-2 pr-4">Rs {product.cost.toFixed(2)}</td>
                        <td className="py-2 pr-4">
                          <span className={product.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            Rs {product.profit.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={product.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {((product.profit / product.revenue) * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Customer Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Customer</th>
                      <th className="py-2 pr-4">Invoices</th>
                      <th className="py-2 pr-4">Total Revenue</th>
                      <th className="py-2 pr-4">Paid</th>
                      <th className="py-2 pr-4">Due</th>
                      <th className="py-2">Avg Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.customerStats.slice(0, 15).map((customer) => (
                      <tr key={customer.customer} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{customer.customer}</td>
                        <td className="py-2 pr-4">{customer.invoices}</td>
                        <td className="py-2 pr-4">Rs {customer.revenue.toFixed(2)}</td>
                        <td className="py-2 pr-4">Rs {customer.paid.toFixed(2)}</td>
                        <td className="py-2 pr-4">
                          <span className={customer.due > 0 ? 'text-red-600' : 'text-green-600'}>
                            Rs {customer.due.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2">Rs {(customer.revenue / customer.invoices).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Daily Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.dailyRevenue.slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                    <span className="font-medium">Rs {day.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary Report */}
          <Card>
            <CardHeader>
              <CardTitle>Period Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Financial Overview</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Revenue:</span>
                      <span className="font-medium">Rs {totals.revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Cost:</span>
                      <span className="font-medium">Rs {totals.cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Profit:</span>
                      <span className={`font-medium ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Rs {totals.profit.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Margin:</span>
                      <span className={`font-medium ${analytics.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Business Metrics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Invoices:</span>
                      <span className="font-medium">{analytics.totalInvoices}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Invoice:</span>
                      <span className="font-medium">Rs {analytics.averageInvoiceValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Collection Rate:</span>
                      <span className="font-medium">
                        {totals.revenue > 0 ? ((totals.received / totals.revenue) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outstanding:</span>
                      <span className="font-medium text-red-600">
                        Rs {(totals.revenue - totals.received).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </main>
    </div>
  );
};

export default Revenue;


