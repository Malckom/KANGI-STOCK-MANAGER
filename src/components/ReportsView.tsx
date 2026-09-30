import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Printer,
  PieChart,
  Layers,
  Users,
  Package,
  ShoppingBag,
  ArrowUpRight,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Sale,
  Purchase,
  Product,
  Customer,
  AppDatabase,
} from '../types';
import {
  formatKES,
  formatDate,
  getTodayString,
  getYesterdayString,
} from '../utils/formatters';
import { exportSalesToExcel } from '../utils/excelExport';

interface ReportsViewProps {
  sales: Sale[];
  purchases: Purchase[];
  products: Product[];
  customers: Customer[];
  onOpenExcelModal?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  purchases,
  products,
  customers,
  onOpenExcelModal,
}) => {
  const [dateRangePreset, setDateRangePreset] = useState<
    'today' | 'yesterday' | 'this-week' | 'this-month' | 'last-month' | 'custom'
  >('this-month');
  const [customStartDate, setCustomStartDate] = useState(getTodayString());
  const [customEndDate, setCustomEndDate] = useState(getTodayString());

  // Date range filter calculation
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const todayStr = getTodayString();

    if (dateRangePreset === 'today') {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (dateRangePreset === 'yesterday') {
      const yestStr = getYesterdayString();
      return { startDate: yestStr, endDate: yestStr };
    }
    if (dateRangePreset === 'this-week') {
      const start = new Date(today);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
    }
    if (dateRangePreset === 'this-month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
    }
    if (dateRangePreset === 'last-month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    }
    return { startDate: customStartDate, endDate: customEndDate };
  }, [dateRangePreset, customStartDate, customEndDate]);

  // Filtered sales and purchases for the period
  const periodSales = useMemo(() => {
    return sales.filter((s) => s.date >= startDate && s.date <= endDate);
  }, [sales, startDate, endDate]);

  const periodPurchases = useMemo(() => {
    return purchases.filter((p) => p.date >= startDate && p.date <= endDate);
  }, [purchases, startDate, endDate]);

  // Aggregated Financials
  const totalRevenue = periodSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCost = periodSales.reduce((sum, s) => sum + s.totalCost, 0);
  const totalGrossProfit = periodSales.reduce((sum, s) => sum + s.grossProfit, 0);
  const totalRestockSpend = periodPurchases.reduce((sum, p) => sum + p.totalCost, 0);
  const profitMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  // Top Selling Products (by quantity and revenue)
  const productPerformance = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        sku: string;
        category: string;
        unitsSold: number;
        revenue: number;
        profit: number;
      }
    >();

    periodSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const prodId = item.productId;
        const current = map.get(prodId) || {
          name: item.productName,
          sku: item.sku || 'N/A',
          category: item.category || 'General',
          unitsSold: 0,
          revenue: 0,
          profit: 0,
        };

        const itemRev = item.sellingPrice * item.quantity;
        const itemCost = item.buyingPrice * item.quantity;
        const itemProfit = itemRev - itemCost;

        current.unitsSold += item.quantity;
        current.revenue += itemRev;
        current.profit += itemProfit;
        map.set(prodId, current);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [periodSales]);

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { revenue: number; profit: number; count: number }>();

    periodSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const cat = item.category || 'General';
        const current = map.get(cat) || { revenue: 0, profit: 0, count: 0 };
        current.revenue += item.sellingPrice * item.quantity;
        current.profit += (item.sellingPrice - item.buyingPrice) * item.quantity;
        current.count += item.quantity;
        map.set(cat, current);
      });
    });

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
      percentOfRev: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }));
  }, [periodSales, totalRevenue]);

  // Payment Method Breakdown
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    periodSales.forEach((s) => {
      const pm = s.paymentMethod;
      map.set(pm, (map.get(pm) || 0) + s.totalAmount);
    });
    return Array.from(map.entries()).map(([method, amount]) => ({
      method,
      amount,
      percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
    }));
  }, [periodSales, totalRevenue]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Receipt #',
      'Date',
      'Customer',
      'Payment Method',
      'Items Count',
      'Total Amount (KES)',
      'Total Cost (KES)',
      'Gross Profit (KES)',
    ];

    const rows = periodSales.map((s) => [
      s.receiptNumber,
      s.date,
      `"${s.customerName.replace(/"/g, '""')}"`,
      s.paymentMethod,
      s.items.length,
      s.totalAmount,
      s.totalCost,
      s.grossProfit,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KANGI_Sales_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Date Range Selectors */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Financial & Sales Reports
          </h2>
          <p className="text-sm text-slate-600">
            Real-time gross profit, margins, top-selling electrical/plumbing lines, and M-Pesa breakdown.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenExcelModal && (
            <button
              onClick={onOpenExcelModal}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Excel Hub</span>
            </button>
          )}
          <button
            onClick={() => exportSalesToExcel(periodSales, undefined, `KANGI_Sales_${startDate}_to_${endDate}.xlsx`)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 shadow-xs transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-700" />
            <span>Export Period (.xlsx)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-xs"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Date Filter Tabs & Pickers */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setDateRangePreset('today')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              dateRangePreset === 'today'
                ? 'bg-amber-600 text-white font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateRangePreset('yesterday')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              dateRangePreset === 'yesterday'
                ? 'bg-amber-600 text-white font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={() => setDateRangePreset('this-week')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              dateRangePreset === 'this-week'
                ? 'bg-amber-600 text-white font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setDateRangePreset('this-month')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              dateRangePreset === 'this-month'
                ? 'bg-amber-600 text-white font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setDateRangePreset('last-month')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              dateRangePreset === 'last-month'
                ? 'bg-amber-600 text-white font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Last Month
          </button>
          <button
            onClick={() => setDateRangePreset('custom')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              dateRangePreset === 'custom'
                ? 'bg-amber-600 text-white font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Custom Range
          </button>
        </div>

        {dateRangePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-700">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 p-1.5 text-xs text-slate-900"
            />
            <span className="font-bold text-slate-700">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 p-1.5 text-xs text-slate-900"
            />
          </div>
        )}

        <div className="text-xs text-slate-500 font-medium pt-1">
          Showing data from <strong className="text-slate-900">{formatDate(startDate)}</strong> to{' '}
          <strong className="text-slate-900">{formatDate(endDate)}</strong> ({periodSales.length}{' '}
          sales recorded)
        </div>
      </div>

      {/* Main KPI Summary Dashboard Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Sales Revenue</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{formatKES(totalRevenue)}</p>
          <p className="mt-1 text-xs text-slate-500">{periodSales.length} sales receipts issued</p>
        </div>

        {/* Total COGS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Cost of Goods Sold</span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{formatKES(totalCost)}</p>
          <p className="mt-1 text-xs text-slate-500">Wholesale cost of items sold</p>
        </div>

        {/* Gross Profit */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold">Gross Profit</span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-700">+{formatKES(totalGrossProfit)}</p>
          <p className="mt-1 text-xs font-bold text-emerald-800">
            Profit Margin: {profitMargin.toFixed(1)}%
          </p>
        </div>

        {/* Restock Spend */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">New Restock Spend</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{formatKES(totalRestockSpend)}</p>
          <p className="mt-1 text-xs text-slate-500">{periodPurchases.length} restock batches purchased</p>
        </div>
      </div>

      {/* Top Products Table & Breakdown Grids */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Top Selling Products */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base">Top Performing Products</h3>
              <p className="text-xs text-slate-500">Ranked by revenue & gross profit contribution</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 text-xs">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Units Sold</th>
                  <th className="py-3 px-3 text-right">Revenue (KES)</th>
                  <th className="py-3 px-4 text-right">Profit (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productPerformance.slice(0, 10).map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {p.name}
                      <span className="block text-xs font-mono text-slate-400">{p.sku}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-slate-900">
                      {p.unitsSold}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatKES(p.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600">
                      +{formatKES(p.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {productPerformance.length === 0 && (
              <p className="py-10 text-center text-xs text-slate-400">
                No sales recorded in the selected period.
              </p>
            )}
          </div>
        </div>

        {/* Category Breakdown & Payment Channels */}
        <div className="lg:col-span-4 space-y-6">
          {/* Category Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="font-black text-slate-900 text-base mb-3 flex items-center gap-1.5">
              <PieChart className="h-4 w-4 text-amber-600" />
              <span>Sales by Category</span>
            </h3>

            <div className="space-y-3 text-xs">
              {categoryBreakdown.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{cat.name}</span>
                    <span>{formatKES(cat.revenue)} ({cat.percentOfRev.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-600"
                      style={{ width: `${Math.min(cat.percentOfRev, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{cat.count} units</span>
                    <span className="text-emerald-700 font-semibold">
                      Profit: +{formatKES(cat.profit)}
                    </span>
                  </div>
                </div>
              ))}

              {categoryBreakdown.length === 0 && (
                <p className="text-xs text-slate-400 italic">No category data for period.</p>
              )}
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="font-black text-slate-900 text-base mb-3">Payment Methods</h3>

            <div className="space-y-3 text-xs">
              {paymentBreakdown.map((pm, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-bold text-slate-900">{pm.method}</span>
                  <div className="text-right">
                    <span className="font-black text-slate-900 block">{formatKES(pm.amount)}</span>
                    <span className="text-xs text-slate-500">{pm.percentage.toFixed(1)}% of sales</span>
                  </div>
                </div>
              ))}

              {paymentBreakdown.length === 0 && (
                <p className="text-xs text-slate-400 italic">No payments recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
