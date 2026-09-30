import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  FileText,
  Printer,
  Sparkles,
  AlertCircle,
  X,
  CheckCircle2,
  Phone,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  Sale,
  Product,
  Customer,
  PaymentMethod,
} from '../types';
import { formatKES, formatDate, formatDateTime, getTodayString } from '../utils/formatters';
import { exportSalesToExcel } from '../utils/excelExport';

interface SalesViewProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  isNewSaleModalOpen: boolean;
  setIsNewSaleModalOpen: (open: boolean) => void;
  onRecordSale: (saleData: {
    productId: string;
    quantity: number;
    sellingPrice: number;
    date: string;
    paymentMethod: PaymentMethod;
    customerId?: string;
    customerName?: string;
    reference?: string;
    notes?: string;
  }) => { success: boolean; error?: string };
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  products,
  customers,
  isNewSaleModalOpen,
  setIsNewSaleModalOpen,
  onRecordSale,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('All');
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [saleDate, setSaleDate] = useState<string>(getTodayString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('M-Pesa');
  const [customerMode, setCustomerMode] = useState<'registered' | 'walk-in'>('registered');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [walkInName, setWalkInName] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Active product details
  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0] || null;
  }, [products, selectedProductId]);

  // Set default selling price when product changes
  React.useEffect(() => {
    if (activeProduct) {
      setCustomPrice(activeProduct.sellingPrice);
    }
  }, [activeProduct]);

  // Real-time calculations
  const totalSale = (quantity || 0) * (customPrice || 0);
  const unitBuyingCost = activeProduct ? activeProduct.buyingPrice : 0;
  const totalCOGS = (quantity || 0) * unitBuyingCost;
  const grossProfit = totalSale - totalCOGS;
  const profitMargin = totalSale > 0 ? ((grossProfit / totalSale) * 100) : 0;

  // Filtered sales list
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        s.productName.toLowerCase().includes(q) ||
        s.invoiceNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.reference && s.reference.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (selectedPaymentFilter !== 'All' && s.paymentMethod !== selectedPaymentFilter) {
        return false;
      }

      if (selectedDateFilter === 'Today' && s.date !== getTodayString()) {
        return false;
      }

      return true;
    });
  }, [sales, searchQuery, selectedPaymentFilter, selectedDateFilter]);

  // Summary Metrics
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.totalSale, 0);
  const totalGrossProfit = sales.reduce((sum, s) => sum + s.grossProfit, 0);
  const averageMargin =
    totalSalesRevenue > 0 ? Math.round((totalGrossProfit / totalSalesRevenue) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!activeProduct) {
      setFormError('Please select a product.');
      return;
    }

    if (quantity <= 0) {
      setFormError('Quantity must be at least 1.');
      return;
    }

    if (quantity > activeProduct.currentStock) {
      setFormError(
        `Insufficient stock! Only ${activeProduct.currentStock} ${activeProduct.unit} available.`
      );
      return;
    }

    let customerName = 'Walk-in Customer';
    let custId: string | undefined = undefined;

    if (customerMode === 'registered' && selectedCustomerId) {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      if (cust) {
        custId = cust.id;
        customerName = cust.name;
      }
    } else if (walkInName.trim()) {
      customerName = walkInName.trim();
    }

    const result = onRecordSale({
      productId: activeProduct.id,
      quantity,
      sellingPrice: customPrice,
      date: saleDate,
      paymentMethod,
      customerId: custId,
      customerName,
      reference,
      notes,
    });

    if (result.success) {
      setIsNewSaleModalOpen(false);
      // Reset form
      setQuantity(1);
      setReference('');
      setNotes('');
      setWalkInName('');
    } else {
      setFormError(result.error || 'Failed to record sale.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Sales & Revenue
          </h2>
          <p className="text-sm text-slate-600">
            Record customer sales, track M-Pesa/Cash receipts, and calculate real gross margins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => exportSalesToExcel(filteredSales)}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 transition-colors"
            title="Download Sales Ledger Spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export Sales (.xlsx)</span>
          </button>
          <button
            id="btn-open-sale-modal"
            onClick={() => {
              setFormError(null);
              setIsNewSaleModalOpen(true);
            }}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Record New Sale</span>
          </button>
        </div>
      </div>

      {/* Top Sales Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Total Sales Revenue
          </span>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatKES(totalSalesRevenue)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{sales.length} transactions recorded</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Total Gross Profit
          </span>
          <p className="mt-1 text-2xl font-black text-emerald-600">{formatKES(totalGrossProfit)}</p>
          <p className="text-xs text-emerald-700 mt-0.5">Sales Revenue − Actual COGS</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Average Profit Margin
          </span>
          <p className="mt-1 text-2xl font-black text-amber-600">{averageMargin}%</p>
          <p className="text-xs text-slate-500 mt-0.5">Weighted average across sales</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          {/* Search Box */}
          <div className="relative sm:col-span-6">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="input-sales-search"
              placeholder="Search by invoice #, product, customer, or M-Pesa ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedPaymentFilter}
              onChange={(e) => setSelectedPaymentFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
            >
              <option value="All">All Payment Methods</option>
              <option value="M-Pesa">M-Pesa</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Credit/Invoice">Credit / Invoice</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today&apos;s Sales</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 text-xs">
              <tr>
                <th className="py-3 px-3.5">Invoice & Date</th>
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3 text-center">Qty</th>
                <th className="py-3 px-3 text-right">Unit Price</th>
                <th className="py-3 px-3 text-right">Total Sale</th>
                <th className="py-3 px-3 text-right">Gross Profit</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Customer / Ref</th>
                <th className="py-3 px-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3.5">
                    <div className="font-bold font-mono text-slate-900">{sale.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">{formatDate(sale.date)}</div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{sale.productName}</div>
                    <div className="text-xs font-mono text-slate-400">{sale.sku}</div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-800">
                      {sale.quantity}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right text-slate-600">
                    {formatKES(sale.sellingPrice)}
                  </td>

                  <td className="py-3 px-3 text-right font-black text-slate-900">
                    {formatKES(sale.totalSale)}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <span className="font-bold text-emerald-600 block">
                      +{formatKES(sale.grossProfit)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {Math.round(sale.profitMargin)}% margin
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                        sale.paymentMethod === 'M-Pesa'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sale.paymentMethod === 'Cash'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {sale.paymentMethod}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-900 truncate max-w-[130px]">
                      {sale.customerName || 'Walk-in'}
                    </div>
                    {sale.reference && (
                      <div className="font-mono text-xs text-slate-400 truncate max-w-[130px]">
                        {sale.reference}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setViewingReceipt(sale)}
                      className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <FileText className="h-3 w-3" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSales.length === 0 && (
            <div className="py-12 text-center">
              <TrendingUp className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No sales transactions found</p>
              <p className="text-xs text-slate-400 mt-1">Click &quot;Record New Sale&quot; to log a customer sale.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- RECORD NEW SALE MODAL --- */}
      {isNewSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Record New Sale</h3>
                  <p className="text-xs text-slate-500">
                    Stock decreases automatically and profit is calculated from unit cost.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewSaleModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              {/* Product Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Product <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.currentStock === 0}>
                      {p.name} ({p.sku}) — Available: {p.currentStock} {p.unit} — Price: {formatKES(p.sellingPrice)}
                      {p.currentStock === 0 ? ' [OUT OF STOCK]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Indicator Banner */}
              {activeProduct && (
                <div
                  className={`rounded-lg p-2.5 border flex items-center justify-between ${
                    activeProduct.currentStock === 0
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : activeProduct.currentStock <= activeProduct.reorderLevel
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div>
                    <span className="font-semibold block">
                      Current Available Stock: <strong>{activeProduct.currentStock} {activeProduct.unit}</strong>
                    </span>
                    <span className="text-xs opacity-80">
                      Buying Cost: {formatKES(activeProduct.buyingPrice)} | Standard Price: {formatKES(activeProduct.sellingPrice)}
                    </span>
                  </div>
                  {activeProduct.currentStock === 0 && (
                    <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                      Out of Stock
                    </span>
                  )}
                </div>
              )}

              {/* Quantity & Selling Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Sale Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={activeProduct ? activeProduct.currentStock : 999}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                  {activeProduct && quantity > activeProduct.currentStock && (
                    <span className="text-xs text-red-600 font-bold mt-0.5 block">
                      Cannot exceed {activeProduct.currentStock} units!
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Unit Selling Price (KSh)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={customPrice}
                    onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">Defaults to item standard price</span>
                </div>
              </div>

              {/* Dynamic Profit & Margin Calculation Card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Total Sale Amount:</span>
                  <span className="text-lg font-black text-slate-900">{formatKES(totalSale)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Cost of Goods Sold (COGS):</span>
                  <span>{formatKES(totalCOGS)} ({quantity} × {formatKES(unitBuyingCost)})</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-200 text-xs">
                  <span className="font-bold text-emerald-900">Gross Profit / Margin:</span>
                  <span className="font-black text-emerald-700">
                    +{formatKES(grossProfit)} ({Math.round(profitMargin)}%)
                  </span>
                </div>
              </div>

              {/* Customer Link Mode */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Customer Link</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('registered')}
                    className={`rounded-lg p-2 text-xs font-bold border transition-colors ${
                      customerMode === 'registered'
                        ? 'bg-amber-50 border-amber-500 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Select Registered Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('walk-in')}
                    className={`rounded-lg p-2 text-xs font-bold border transition-colors ${
                      customerMode === 'walk-in'
                        ? 'bg-amber-50 border-amber-500 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Walk-in / Cash Client
                  </button>
                </div>

                {customerMode === 'registered' ? (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  >
                    <option value="">-- Choose Customer from CRM --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.customerType} — {c.phone})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Optional Walk-in customer name or nickname"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                )}
                {customerMode === 'registered' && selectedCustomerId && (
                  <span className="text-xs text-emerald-700 block">
                    ✓ This customer&apos;s total purchases, spend, and profit will automatically update.
                  </span>
                )}
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  >
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit/Invoice">Credit / Invoice</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sale Date</label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              {/* Reference & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Reference # (e.g. M-Pesa Code)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MPESA-QWE9928"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Site delivery..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSaleModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!activeProduct || activeProduct.currentStock === 0 || quantity > activeProduct.currentStock}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
                >
                  Confirm & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RECEIPT / INVOICE MODAL --- */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold text-slate-500">
                Official Sales Receipt
              </span>
              <button
                onClick={() => setViewingReceipt(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs space-y-3 font-mono">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="text-base font-black text-slate-900 font-sans">KANGI Stock Manager</h4>
                <p className="text-xs text-slate-500">Nairobi, Kenya</p>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  Invoice #: {viewingReceipt.invoiceNumber}
                </p>
                <p className="text-xs text-slate-400">Date: {formatDate(viewingReceipt.date)}</p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{viewingReceipt.customerName || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold">{viewingReceipt.paymentMethod}</span>
                </div>
                {viewingReceipt.reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference:</span>
                    <span>{viewingReceipt.reference}</span>
                  </div>
                )}
              </div>

              <div className="py-2 border-t border-b border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{viewingReceipt.productName}</span>
                  <span>{formatKES(viewingReceipt.totalSale)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>
                    {viewingReceipt.quantity} units @ {formatKES(viewingReceipt.sellingPrice)}
                  </span>
                  <span>SKU: {viewingReceipt.sku}</span>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-sm font-black text-slate-900">
                  <span>TOTAL PAID:</span>
                  <span>{formatKES(viewingReceipt.totalSale)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 font-bold">
                  <span>Profit Margin:</span>
                  <span>+{formatKES(viewingReceipt.grossProfit)} ({Math.round(viewingReceipt.profitMargin)}%)</span>
                </div>
              </div>

              <div className="text-center pt-2 text-xs text-slate-400 italic">
                Thank you for your business with KANGI!
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-slate-800"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setViewingReceipt(null)}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
