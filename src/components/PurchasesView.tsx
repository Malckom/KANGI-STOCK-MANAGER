import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Calendar,
  Package,
  DollarSign,
  X,
  FileText,
  CheckCircle2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  Purchase,
  Product,
  Supplier,
} from '../types';
import { formatKES, formatDate, getTodayString } from '../utils/formatters';
import { exportPurchasesToExcel } from '../utils/excelExport';

interface PurchasesViewProps {
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  isNewPurchaseModalOpen: boolean;
  setIsNewPurchaseModalOpen: (open: boolean) => void;
  onRecordPurchase: (purchaseData: {
    productId: string;
    supplierId: string;
    quantity: number;
    buyingPrice: number;
    date: string;
    invoiceNumber?: string;
    notes?: string;
  }) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  purchases,
  products,
  suppliers,
  isNewPurchaseModalOpen,
  setIsNewPurchaseModalOpen,
  onRecordPurchase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('All');

  // Form state
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitBuyingPrice, setUnitBuyingPrice] = useState<number>(0);
  const [purchaseDate, setPurchaseDate] = useState<string>(getTodayString());
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0] || null;
  }, [products, selectedProductId]);

  // Set default buying price and supplier when product changes
  React.useEffect(() => {
    if (activeProduct) {
      setUnitBuyingPrice(activeProduct.buyingPrice);
      if (activeProduct.supplierId) {
        setSelectedSupplierId(activeProduct.supplierId);
      }
    }
  }, [activeProduct]);

  const totalCost = (quantity || 0) * (unitBuyingPrice || 0);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.productName.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (selectedSupplierFilter !== 'All' && p.supplierId !== selectedSupplierFilter) {
        return false;
      }

      return true;
    });
  }, [purchases, searchQuery, selectedSupplierFilter]);

  const totalSpentOnPurchases = purchases.reduce((sum, p) => sum + p.totalCost, 0);
  const totalUnitsRestocked = purchases.reduce((sum, p) => sum + p.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct || !selectedSupplierId || quantity <= 0) return;

    onRecordPurchase({
      productId: activeProduct.id,
      supplierId: selectedSupplierId,
      quantity,
      buyingPrice: unitBuyingPrice,
      date: purchaseDate,
      invoiceNumber: invoiceNumber.trim() || `PO-${Date.now().toString().slice(-5)}`,
      notes,
    });

    setIsNewPurchaseModalOpen(false);
    setQuantity(10);
    setInvoiceNumber('');
    setNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Stock Purchases & Inbound Orders
          </h2>
          <p className="text-sm text-slate-600">
            Every recorded purchase directly adds to your physical inventory stock and tracks supplier cost.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => exportPurchasesToExcel(filteredPurchases)}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 transition-colors"
            title="Download Purchases & Procurement Spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            <span>Export Purchases (.xlsx)</span>
          </button>
          <button
            id="btn-open-purchase-modal"
            onClick={() => setIsNewPurchaseModalOpen(true)}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Record Stock In / Purchase</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Total Purchase Spend
          </span>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatKES(totalSpentOnPurchases)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{purchases.length} restock batches</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Total Units Received
          </span>
          <p className="mt-1 text-2xl font-black text-blue-600">{totalUnitsRestocked} units</p>
          <p className="text-xs text-slate-500 mt-0.5">Across electrical & plumbing stock</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">
            Active Suppliers
          </span>
          <p className="mt-1 text-2xl font-black text-slate-900">{suppliers.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Wholesalers & distributors</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          {/* Search Box */}
          <div className="relative sm:col-span-8">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="input-purchases-search"
              placeholder="Search purchases by product, supplier, invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Supplier Filter */}
          <div className="sm:col-span-4">
            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
            >
              <option value="All">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Purchases List Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 text-xs">
              <tr>
                <th className="py-3 px-3.5">Invoice & Date</th>
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3 text-center">Qty Added</th>
                <th className="py-3 px-3 text-right">Unit Cost</th>
                <th className="py-3 px-3 text-right">Total Cost</th>
                <th className="py-3 px-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3.5">
                    <div className="font-bold font-mono text-slate-900">
                      {purchase.invoiceNumber || 'PO-DIRECT'}
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(purchase.date)}</div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{purchase.productName}</div>
                    <div className="text-xs font-mono text-slate-400">{purchase.sku}</div>
                  </td>

                  <td className="py-3 px-3 font-semibold text-slate-800">
                    {purchase.supplierName}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 font-bold text-blue-800">
                      +{purchase.quantity}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right font-medium text-slate-600">
                    {formatKES(purchase.buyingPrice)}
                  </td>

                  <td className="py-3 px-3 text-right font-black text-slate-900">
                    {formatKES(purchase.totalCost)}
                  </td>

                  <td className="py-3 px-3 text-slate-500 italic max-w-[200px] truncate">
                    {purchase.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPurchases.length === 0 && (
            <div className="py-12 text-center">
              <Truck className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No stock purchases found</p>
              <p className="text-xs text-slate-400 mt-1">
                Record incoming stock or convert shopping list items to purchases.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- RECORD PURCHASE MODAL --- */}
      {isNewPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Record Stock In / Purchase</h3>
                  <p className="text-xs text-slate-500">
                    Directly increments product current stock and updates supplier history.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewPurchaseModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              {/* Product Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Current Stock: {p.currentStock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Buying Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Quantity Received <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  {activeProduct && (
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      New Stock will be:{' '}
                      <strong className="text-slate-900">
                        {activeProduct.currentStock + quantity} {activeProduct.unit}
                      </strong>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Actual Unit Buying Cost (KSh)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={unitBuyingPrice}
                    onChange={(e) => setUnitBuyingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Total Calculation Banner */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-blue-800 font-semibold block">
                    Total Purchase Cost:
                  </span>
                  <span className="text-lg font-black text-blue-950">{formatKES(totalCost)}</span>
                </div>
                <span className="text-xs text-blue-700 font-medium">
                  {quantity} units × {formatKES(unitBuyingPrice)}
                </span>
              </div>

              {/* Date & Invoice */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Supplier Invoice / PO #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-9921 or PO-001"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Delivery batch 1, paid via M-Pesa Till..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewPurchaseModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-500"
                >
                  Confirm & Increase Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
