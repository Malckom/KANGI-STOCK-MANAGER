import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Circle,
  Tag,
  Building2,
  Calendar,
  DollarSign,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  Edit2,
  X,
  ArrowRight,
  TrendingDown,
  History,
  CheckSquare,
  Square,
  AlertTriangle,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  ShoppingListItem,
  ShoppingHistoryItem,
  Product,
  Supplier,
  PriorityLabel,
} from '../types';
import { formatKES, formatDate, getTodayString } from '../utils/formatters';
import { exportShoppingListToExcel } from '../utils/excelExport';
import { useAuth } from '../services/AuthContext';

interface ShoppingListViewProps {
  shoppingList: ShoppingListItem[];
  shoppingHistory: ShoppingHistoryItem[];
  products: Product[];
  suppliers: Supplier[];
  priorityLabels: PriorityLabel[];
  isShoppingModeOpen: boolean;
  setIsShoppingModeOpen: (open: boolean) => void;
  onAddItem: (item: Omit<ShoppingListItem, 'id' | 'estimatedTotalCost' | 'purchaseStatus'>) => void;
  onEditItem: (item: ShoppingListItem) => void;
  onDeleteItem: (itemId: string) => void;
  onClearPurchased: () => void;
  onConfirmPurchaseToInventory: (
    item: ShoppingListItem,
    actualQuantity: number,
    actualPrice: number,
    supplierId: string,
    invoiceNumber: string,
    notes?: string
  ) => void;
  onManagePriorityLabels: (labels: PriorityLabel[]) => void;
}

export const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  shoppingList,
  shoppingHistory,
  products,
  suppliers,
  priorityLabels,
  isShoppingModeOpen,
  setIsShoppingModeOpen,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onClearPurchased,
  onConfirmPurchaseToInventory,
  onManagePriorityLabels,
}) => {
  const { permissions } = useAuth();

  const [viewMode, setViewMode] = useState<'priority' | 'supplier' | 'history'>('priority');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [convertingItem, setConvertingItem] = useState<ShoppingListItem | null>(null);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);

  // Convert / Add to Inventory Form State
  const [actualQty, setActualQty] = useState<number>(1);
  const [actualPrice, setActualPrice] = useState<number>(0);
  const [actualSupplierId, setActualSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [convertNotes, setConvertNotes] = useState<string>('');

  // Add Item Form State
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [customItemName, setCustomItemName] = useState<string>('');
  const [isCustomProduct, setIsCustomProduct] = useState<boolean>(false);
  const [quantityRequired, setQuantityRequired] = useState<number>(5);
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
  const [selectedLabelId, setSelectedLabelId] = useState<string>(priorityLabels[0]?.id || '');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Priority Label Manager Local State
  const [labelList, setLabelList] = useState<PriorityLabel[]>(priorityLabels);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#EF4444');
  const [newLabelDesc, setNewLabelDesc] = useState('');

  // Sync label state when props change
  React.useEffect(() => {
    setLabelList(priorityLabels);
  }, [priorityLabels]);

  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0] || null;
  }, [products, selectedProductId]);

  // Update estimated price when product changes
  React.useEffect(() => {
    if (activeProduct && !isCustomProduct) {
      setEstimatedPrice(activeProduct.buyingPrice);
      if (activeProduct.supplierId) {
        setSelectedSupplierId(activeProduct.supplierId);
      }
    }
  }, [activeProduct, isCustomProduct]);

  // Open conversion modal
  const openConversionModal = (item: ShoppingListItem) => {
    setConvertingItem(item);
    setActualQty(item.quantityRequired - item.quantityPurchased);
    setActualPrice(item.estimatedUnitPrice);
    setActualSupplierId(item.supplierId || suppliers[0]?.id || '');
    setInvoiceNumber(`PO-${Date.now().toString().slice(-5)}`);
    setConvertNotes(item.notes || 'Purchased from shopping list');
  };

  // Aggregated Counts
  const activeItems = shoppingList.filter((i) => i.purchaseStatus !== 'purchased');
  const totalUnitsRequired = activeItems.reduce((sum, i) => sum + i.quantityRequired, 0);
  const totalEstimatedCost = activeItems.reduce((sum, i) => sum + i.estimatedTotalCost, 0);

  // Group items by Priority Label
  const groupedByPriority = useMemo(() => {
    const map = new Map<string, { label: PriorityLabel; items: ShoppingListItem[] }>();

    priorityLabels.forEach((label) => {
      map.set(label.id, { label, items: [] });
    });

    shoppingList.forEach((item) => {
      const entry = map.get(item.priorityLabelId);
      if (entry) {
        entry.items.push(item);
      } else {
        // Fallback for custom or deleted labels
        const fallbackLabel: PriorityLabel = {
          id: item.priorityLabelId,
          name: item.priorityLabelName || 'Normal',
          color: item.priorityColor || '#3B82F6',
          level: 99,
        };
        map.set(item.priorityLabelId, { label: fallbackLabel, items: [item] });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.label.level - b.label.level);
  }, [shoppingList, priorityLabels]);

  // Group items by Supplier
  const groupedBySupplier = useMemo(() => {
    const map = new Map<string, { name: string; items: ShoppingListItem[] }>();

    shoppingList.forEach((item) => {
      const supKey = item.supplierId || 'unassigned';
      const supName = item.supplierName || 'Any / Unassigned Supplier';
      if (!map.has(supKey)) {
        map.set(supKey, { name: supName, items: [] });
      }
      map.get(supKey)!.items.push(item);
    });

    return Array.from(map.values());
  }, [shoppingList]);

  // Handle Add Item Submit
  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lbl = priorityLabels.find((l) => l.id === selectedLabelId) || priorityLabels[0];
    const sup = suppliers.find((s) => s.id === selectedSupplierId);

    const productName = isCustomProduct
      ? customItemName.trim()
      : activeProduct
      ? activeProduct.name
      : 'New Item';
    const sku = !isCustomProduct && activeProduct ? activeProduct.sku : undefined;
    const category = !isCustomProduct && activeProduct ? activeProduct.category : 'General';
    const unit = !isCustomProduct && activeProduct ? activeProduct.unit : 'Pcs';

    onAddItem({
      productId: isCustomProduct ? undefined : activeProduct?.id,
      productName,
      sku,
      category,
      unit,
      quantityRequired,
      quantityPurchased: 0,
      estimatedUnitPrice: estimatedPrice,
      priorityLabelId: lbl.id,
      priorityLabelName: lbl.name,
      priorityColor: lbl.color,
      supplierId: selectedSupplierId || undefined,
      supplierName: sup?.name,
      targetDate: targetDate || undefined,
      notes: notes || undefined,
    });

    setIsAddModalOpen(false);
    setCustomItemName('');
    setIsCustomProduct(false);
    setQuantityRequired(5);
    setNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Primary Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Shopping List & Purchase Cart
          </h2>
          <p className="text-sm text-slate-600">
            Plan restocks by priority. Converting an item to &quot;Add to Inventory&quot; increases real stock and tracks savings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportShoppingListToExcel(shoppingList)}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 transition-colors"
            title="Download Procurement Order Spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="h-4 w-4 text-rose-600" />
            <span>Export Order (.xlsx)</span>
          </button>
          <button
            id="btn-open-shopping-mode"
            onClick={() => setIsShoppingModeOpen(true)}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-amber-400 shadow-sm hover:bg-slate-800 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            <span>Store Shopping Mode</span>
          </button>
          <button
            id="btn-add-shopping-item"
            onClick={() => setIsAddModalOpen(true)}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Purchase Plan Summary Metrics Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          <div className="border-r border-slate-100 pr-4">
            <span className="text-xs font-semibold text-slate-500">
              Active Items
            </span>
            <p className="mt-1 text-2xl font-black text-slate-900">{activeItems.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">{totalUnitsRequired} total units</p>
          </div>

          <div className="border-r border-slate-100 pr-4">
            <span className="text-xs font-semibold text-slate-500">
              Estimated Total Cost
            </span>
            <p className="mt-1 text-2xl font-black text-rose-600">
              {formatKES(totalEstimatedCost)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">At estimated unit prices</p>
          </div>

          {/* Priority Breakdown Pills */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-2 self-center">
            {priorityLabels.map((lbl) => {
              const count = activeItems.filter((i) => i.priorityLabelId === lbl.id).length;
              return (
                <div
                  key={lbl.id}
                  className="rounded-xl border p-2.5 flex items-center gap-2.5 bg-slate-50"
                  style={{ borderColor: `${lbl.color}40` }}
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: lbl.color }}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {lbl.name}
                    </span>
                    <span className="text-xs font-black text-slate-900">{count} items</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation View Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode('priority')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              viewMode === 'priority'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Group by Priority
          </button>
          <button
            onClick={() => setViewMode('supplier')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              viewMode === 'supplier'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Group by Supplier
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 ${
              viewMode === 'history'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Shopping History ({shoppingHistory.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setIsLabelManagerOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Manage Labels</span>
          </button>
          {shoppingList.some((i) => i.purchaseStatus === 'purchased') && (
            <button
              onClick={onClearPurchased}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Purchased</span>
            </button>
          )}
        </div>
      </div>

      {/* --- VIEW MODE 1: GROUP BY PRIORITY --- */}
      {viewMode === 'priority' && (
        <div className="space-y-6">
          {groupedByPriority.map(({ label, items }) => {
            if (items.length === 0) return null;

            return (
              <div
                key={label.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
              >
                {/* Priority Section Header */}
                <div
                  className="flex items-center justify-between px-5 py-3 border-b"
                  style={{ backgroundColor: `${label.color}15`, borderColor: `${label.color}30` }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <h3 className="font-black text-slate-900 text-sm">
                      {label.name}
                    </h3>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    Est. Total: {formatKES(items.reduce((s, i) => s + i.estimatedTotalCost, 0))}
                  </span>
                </div>

                {/* Items List */}
                <div className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const isFullyPurchased = item.purchaseStatus === 'purchased';
                    const isPartial = item.purchaseStatus === 'partial';

                    return (
                      <div
                        key={item.id}
                        className={`p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:bg-slate-50/80 transition-colors ${
                          isFullyPurchased ? 'bg-slate-50/60 opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => openConversionModal(item)}
                            title="Convert / Add to Inventory"
                            className="mt-0.5 text-slate-400 hover:text-emerald-600"
                          >
                            {isFullyPurchased ? (
                              <CheckSquare className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4
                                className={`font-bold text-slate-900 text-sm ${
                                  isFullyPurchased ? 'line-through text-slate-500' : ''
                                }`}
                              >
                                {item.productName}
                              </h4>
                              {item.sku && (
                                <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  {item.sku}
                                </span>
                              )}
                              {isPartial && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-800">
                                  Partially Bought ({item.quantityPurchased}/{item.quantityRequired})
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                              <span>
                                Supplier:{' '}
                                <strong className="text-slate-700">
                                  {item.supplierName || 'Any'}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Target Date:{' '}
                                <strong className="text-slate-700">
                                  {item.targetDate ? formatDate(item.targetDate) : 'Not specified'}
                                </strong>
                              </span>
                              {item.notes && (
                                <>
                                  <span>•</span>
                                  <span className="italic text-slate-600">&ldquo;{item.notes}&rdquo;</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quantity, Cost & Confirm Inventory Action */}
                        <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          <div className="text-left md:text-right">
                            <div className="font-black text-slate-900 text-sm">
                              {item.quantityRequired} {item.unit} × {formatKES(item.estimatedUnitPrice)}
                            </div>
                            <span className="text-xs font-bold text-rose-600 block">
                              Total: {formatKES(item.estimatedTotalCost)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Prominent ADD TO INVENTORY button */}
                            <button
                              id={`btn-add-to-inv-${item.id}`}
                              onClick={() => openConversionModal(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Add to inventory</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => setEditingItem(item)}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => onDeleteItem(item.id)}
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {shoppingList.length === 0 && (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
              <ShoppingCart className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">Your Shopping List is Empty</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Add low-stock hardware, electrical cables, or items from your product catalog to plan restocks.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item to List</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- VIEW MODE 2: GROUP BY SUPPLIER --- */}
      {viewMode === 'supplier' && (
        <div className="space-y-6">
          {groupedBySupplier.map(({ name, items }) => (
            <div
              key={name}
              className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 bg-slate-100 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">{name}</h3>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                    {items.length} items
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-700">
                  Est. Spend: {formatKES(items.reduce((s, i) => s + i.estimatedTotalCost, 0))}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:bg-slate-50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.priorityColor || '#EF4444' }}
                        />
                        <h4 className="font-bold text-slate-900 text-sm">{item.productName}</h4>
                        <span className="text-xs font-mono text-slate-500">{item.sku}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Priority: {item.priorityLabelName} • Target: {item.targetDate || 'None'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3">
                      <div className="text-left md:text-right">
                        <span className="text-sm font-black text-slate-900 block">
                          {item.quantityRequired} {item.unit} @ {formatKES(item.estimatedUnitPrice)}
                        </span>
                        <span className="text-xs font-bold text-rose-600">
                          {formatKES(item.estimatedTotalCost)}
                        </span>
                      </div>

                      <button
                        onClick={() => openConversionModal(item)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        ADD TO INVENTORY
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- VIEW MODE 3: SHOPPING HISTORY & SAVINGS --- */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <History className="h-5 w-5 text-amber-700" />
              <div>
                <h4 className="font-bold text-amber-950 text-sm">Shopping Purchase Log</h4>
                <p className="text-xs text-amber-800">
                  Records of previous shopping trips with calculated estimated vs actual savings.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-amber-800 block">Total Past Purchases</span>
              <span className="text-lg font-black text-amber-950">
                {formatKES(shoppingHistory.reduce((s, h) => s + h.actualTotalCost, 0))}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 text-xs">
                  <tr>
                    <th className="py-3 px-3.5">Purchase Date</th>
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3">Supplier</th>
                    <th className="py-3 px-3 text-center">Qty Bought</th>
                    <th className="py-3 px-3 text-right">Est. Cost</th>
                    <th className="py-3 px-3 text-right">Actual Cost</th>
                    <th className="py-3 px-3 text-right">Price Variance / Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shoppingHistory.map((hist) => {
                    const isSaving = hist.savingsAchieved > 0;
                    return (
                      <tr key={hist.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3.5 font-medium text-slate-900">
                          {formatDate(hist.datePurchased)}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {hist.productName}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{hist.supplierName}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900">
                          {hist.quantityPurchased} units
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500">
                          {formatKES(hist.estimatedTotalCost)}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          {formatKES(hist.actualTotalCost)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              isSaving ? 'text-emerald-700' : 'text-slate-600'
                            }`}
                          >
                            {isSaving ? `Saved +${formatKES(hist.savingsAchieved)}` : 'On Budget'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {shoppingHistory.length === 0 && (
                <p className="py-10 text-center text-xs text-slate-400">
                  No shopping history recorded yet. Items confirmed via &quot;ADD TO INVENTORY&quot; will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- IN-STORE SHOPPING MODE OVERLAY --- */}
      {isShoppingModeOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white p-4 sm:p-6 overflow-y-auto">
          {/* Shopping Mode Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-xl font-black text-white">Live Store Shopping Mode</h2>
              </div>
              <p className="text-xs text-slate-400">
                High-contrast in-store checklist. Tap items to check off or convert to inventory.
              </p>
            </div>
            <button
              onClick={() => setIsShoppingModeOpen(false)}
              className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Running Tally Bar */}
          <div className="my-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-900 p-3 border border-slate-800 text-center">
            <div>
              <span className="text-xs text-slate-400 font-semibold">
                Remaining Items
              </span>
              <p className="text-2xl font-black text-amber-400">
                {activeItems.length} items ({totalUnitsRequired} units)
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold">
                Estimated Cart Total
              </span>
              <p className="text-2xl font-black text-emerald-400">
                {formatKES(totalEstimatedCost)}
              </p>
            </div>
          </div>

          {/* Checklist by Priority */}
          <div className="flex-1 space-y-4">
            {groupedByPriority.map(({ label, items }) => {
              if (items.length === 0) return null;
              return (
                <div key={label.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <h3 className="font-bold text-sm" style={{ color: label.color }}>
                      {label.name} ({items.length})
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg bg-slate-950 p-3.5 border border-slate-800/80 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openConversionModal(item)}
                            className="text-amber-400 hover:scale-110 transition-transform"
                          >
                            <Square className="h-6 w-6" />
                          </button>
                          <div>
                            <span className="font-black text-white text-base block">
                              {item.productName}
                            </span>
                            <span className="text-xs text-slate-400">
                              {item.supplierName || 'Any Wholesaler'} • Est: {formatKES(item.estimatedUnitPrice)}/ea
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-base font-black text-amber-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                            {item.quantityRequired} {item.unit}
                          </span>
                          <button
                            onClick={() => openConversionModal(item)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
                          >
                            Bought
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <button
              onClick={() => setIsShoppingModeOpen(false)}
              className="w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-700"
            >
              Exit Shopping Mode
            </button>
          </div>
        </div>
      )}

      {/* --- ADD SHOPPING LIST ITEM MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Add to Shopping List</h3>
                <p className="text-xs text-slate-500">
                  Planned purchase item. Stock will not change until purchased.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="mt-4 space-y-3.5 text-xs">
              {/* Product Selection Mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Item Source</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomProduct(!isCustomProduct)}
                    className="text-amber-700 font-bold hover:underline"
                  >
                    {isCustomProduct ? '← Choose from Catalog' : '+ Custom / New Item'}
                  </button>
                </div>

                {!isCustomProduct ? (
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Stock: {p.currentStock} {p.unit}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom item name or brand..."
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900"
                  />
                )}
              </div>

              {/* Quantity Required & Estimated Unit Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Quantity Required <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantityRequired}
                    onChange={(e) => setQuantityRequired(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Estimated Unit Price (KSh)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Priority Label & Supplier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Priority Label <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedLabelId}
                    onChange={(e) => setSelectedLabelId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900"
                  >
                    {priorityLabels.map((lbl) => (
                      <option key={lbl.id} value={lbl.id}>
                        {lbl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900"
                  >
                    <option value="">-- Any / Undecided --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Date & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. For Monday order..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Total Calculation */}
              <div className="rounded-lg bg-rose-50 p-2.5 border border-rose-200 flex items-center justify-between">
                <span className="text-rose-900 font-semibold">Total Estimated Cost:</span>
                <span className="text-base font-black text-rose-950">
                  {formatKES(quantityRequired * estimatedPrice)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRM PURCHASE / "ADD TO INVENTORY" MODAL --- */}
      {convertingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Confirm Purchase to Inventory</h3>
                  <p className="text-xs text-slate-500">{convertingItem.productName}</p>
                </div>
              </div>
              <button
                onClick={() => setConvertingItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onConfirmPurchaseToInventory(
                  convertingItem,
                  actualQty,
                  actualPrice,
                  actualSupplierId || convertingItem.supplierId || suppliers[0]?.id || '',
                  invoiceNumber || `PO-${Date.now().toString().slice(-5)}`,
                  convertNotes
                );
                setConvertingItem(null);
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1">
                <div className="flex justify-between font-bold text-emerald-950 text-sm">
                  <span>Planned Quantity: {convertingItem.quantityRequired} {convertingItem.unit}</span>
                  <span>Est. Price: {formatKES(convertingItem.estimatedUnitPrice)}</span>
                </div>
                <p className="text-xs text-emerald-800">
                  ✓ This will generate a formal Purchases record, directly increment product stock in
                  Inventory, and archive this shopping item with variance stats.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Actual Quantity Purchased ({convertingItem.unit}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={actualQty}
                    onChange={(e) => setActualQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                  {actualQty < convertingItem.quantityRequired && (
                    <span className="text-xs text-blue-600 block mt-0.5 font-semibold">
                      Partial purchase: Remaining {convertingItem.quantityRequired - actualQty} units will stay on shopping list.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Actual Unit Buying Price (KSh) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={actualPrice}
                    onChange={(e) => setActualPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Price Variance & Savings Banner */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Total Actual Cost:</span>
                  <span className="text-base font-black">{formatKES(actualQty * actualPrice)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Estimated Total for {actualQty} units:</span>
                  <span>{formatKES(actualQty * convertingItem.estimatedUnitPrice)}</span>
                </div>
                {actualPrice < convertingItem.estimatedUnitPrice && (
                  <div className="flex justify-between pt-1 border-t border-slate-200 text-xs font-bold text-emerald-700">
                    <span>Savings Achieved:</span>
                    <span>
                      +{formatKES((convertingItem.estimatedUnitPrice - actualPrice) * actualQty)}
                    </span>
                  </div>
                )}
              </div>

              {/* Supplier & Invoice */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier</label>
                  <select
                    value={actualSupplierId}
                    onChange={(e) => setActualSupplierId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Invoice # / Receipt Ref
                  </label>
                  <input
                    type="text"
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
                  value={convertNotes}
                  onChange={(e) => setConvertNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConvertingItem(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-emerald-500"
                >
                  Confirm & Add to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PRIORITY LABELS MANAGER MODAL --- */}
      {isLabelManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Manage Priority Labels</h3>
                <p className="text-xs text-slate-500">
                  Customize urgency tiers (e.g. Urgent, Bucket list, Normal, Fast Mover).
                </p>
              </div>
              <button
                onClick={() => setIsLabelManagerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Existing Labels List */}
              <div className="space-y-2">
                {labelList.map((lbl) => (
                  <div
                    key={lbl.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: lbl.color }}
                      />
                      <span className="font-bold text-slate-900">{lbl.name}</span>
                      {lbl.description && (
                        <span className="text-xs text-slate-500">({lbl.description})</span>
                      )}
                    </div>

                    {labelList.length > 1 && (
                      <button
                        onClick={() => {
                          const updated = labelList.filter((l) => l.id !== lbl.id);
                          setLabelList(updated);
                          onManagePriorityLabels(updated);
                        }}
                        className="rounded p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add New Label Form */}
              <div className="rounded-xl border border-dashed border-slate-300 p-3 space-y-2 bg-slate-50/50">
                <span className="font-bold text-slate-800 text-xs block">Add New Label</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Label name (e.g. Seasonal)"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      className="w-full rounded border border-slate-300 p-1.5 text-xs text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="color"
                      value={newLabelColor}
                      onChange={(e) => setNewLabelColor(e.target.value)}
                      className="h-8 w-full rounded border border-slate-300 cursor-pointer"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Optional description..."
                  value={newLabelDesc}
                  onChange={(e) => setNewLabelDesc(e.target.value)}
                  className="w-full rounded border border-slate-300 p-1.5 text-xs text-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newLabelName.trim()) return;
                    const newLbl: PriorityLabel = {
                      id: `lbl-${Date.now()}`,
                      name: newLabelName.trim(),
                      color: newLabelColor,
                      description: newLabelDesc.trim(),
                      level: labelList.length + 1,
                    };
                    const updated = [...labelList, newLbl];
                    setLabelList(updated);
                    onManagePriorityLabels(updated);
                    setNewLabelName('');
                    setNewLabelDesc('');
                  }}
                  className="w-full rounded-lg bg-slate-900 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  + Add Label
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setIsLabelManagerOpen(false)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
