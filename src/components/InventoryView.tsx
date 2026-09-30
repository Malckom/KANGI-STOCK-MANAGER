import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ShoppingCart,
  Eye,
  Edit2,
  Trash2,
  SlidersHorizontal,
  History,
  X,
  Sparkles,
  Info,
  TrendingDown,
  TrendingUp,
  Package,
  FileSpreadsheet,
  Download,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import {
  Product,
  ProductCategory,
  StockMovement,
  Supplier,
  PriorityLabel,
  StockMovementType,
} from '../types';
import { formatKES, formatDate, formatDateTime } from '../utils/formatters';
import { generateSKU } from '../utils/skuGenerator';
import { exportInventoryToExcel } from '../utils/excelExport';
import { useAuth } from '../services/AuthContext';

interface InventoryViewProps {
  products: Product[];
  stockMovements: StockMovement[];
  suppliers: Supplier[];
  priorityLabels: PriorityLabel[];
  onAddProduct: (product: Omit<Product, 'id' | 'currentStock'> & { openingStock: number }) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onStockAdjustment: (
    productId: string,
    quantity: number,
    type: 'ADJUSTMENT_ADD' | 'ADJUSTMENT_SUB',
    reason: string
  ) => void;
  onAddToShoppingList: (
    product: Product,
    quantity: number,
    priorityLabelId: string,
    supplierId?: string,
    targetDate?: string,
    notes?: string
  ) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  stockMovements,
  suppliers,
  priorityLabels,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onStockAdjustment,
  onAddToShoppingList,
}) => {
  const { permissions, user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Low Stock' | 'Out of Stock' | 'Healthy'>('All');
  const [sortBy, setSortBy] = useState<'stock-asc' | 'stock-desc' | 'name' | 'price-desc'>('stock-asc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [quickAddShoppingProduct, setQuickAddShoppingProduct] = useState<Product | null>(null);

  // Form states for Add Product
  const [addForm, setAddForm] = useState({
    name: '',
    category: 'Electrical' as ProductCategory,
    unit: 'Pcs',
    buyingPrice: 0,
    sellingPrice: 0,
    openingStock: 0,
    reorderLevel: 3,
    supplierId: suppliers[0]?.id || '',
    sku: '',
    customType: '',
    customVariant: '',
    notes: '',
  });

  // Shopping cart quick prompt state
  const [cartPromptQty, setCartPromptQty] = useState<number>(5);
  const [cartPromptLabel, setCartPromptLabel] = useState<string>(
    priorityLabels[0]?.id || 'lbl-urgent'
  );
  const [cartPromptSupplier, setCartPromptSupplier] = useState<string>('');
  const [cartPromptDate, setCartPromptDate] = useState<string>('');
  const [cartPromptNotes, setCartPromptNotes] = useState<string>('');

  // Stock Adjustment Form
  const [adjQty, setAdjQty] = useState<number>(1);
  const [adjType, setAdjType] = useState<'ADJUSTMENT_ADD' | 'ADJUSTMENT_SUB'>('ADJUSTMENT_ADD');
  const [adjReason, setAdjReason] = useState<string>('Inventory audit adjustment');

  // Generate SKU helper for Add Form
  const handleAutoGenerateSku = (
    cat: ProductCategory,
    pName: string,
    type?: string,
    variant?: string
  ) => {
    if (!pName.trim()) return '';
    const existingSkus = products.map((p) => p.sku);
    return generateSKU(cat, pName, type, variant, existingSkus);
  };

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.supplierName && p.supplierName.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        // Category Filter
        if (selectedCategory !== 'All' && p.category !== selectedCategory) {
          return false;
        }

        // Status Filter
        if (selectedStatus === 'Out of Stock' && p.currentStock !== 0) return false;
        if (selectedStatus === 'Low Stock' && (p.currentStock === 0 || p.currentStock > p.reorderLevel))
          return false;
        if (selectedStatus === 'Healthy' && p.currentStock <= p.reorderLevel) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'stock-asc') return a.currentStock - b.currentStock;
        if (sortBy === 'stock-desc') return b.currentStock - a.currentStock;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
        return 0;
      });
  }, [products, searchQuery, selectedCategory, selectedStatus, sortBy]);

  const categories: ProductCategory[] = [
    'Electrical',
    'Plumbing',
    'Tools & Accessories',
    'Experimental/New Products',
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Primary Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Inventory & Stock Control
          </h2>
          <p className="text-sm text-slate-600">
            Current stock dynamically tracked via Purchases, Sales, and Audit adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {permissions.canAddProduct ? (
            <button
              id="btn-add-new-product"
              onClick={() => {
                const defaultSku = handleAutoGenerateSku(
                  'Electrical',
                  'New Item',
                  '',
                  ''
                );
                setAddForm({
                  name: '',
                  category: 'Electrical',
                  unit: 'Pcs',
                  buyingPrice: 0,
                  sellingPrice: 0,
                  openingStock: 0,
                  reorderLevel: 3,
                  supplierId: suppliers[0]?.id || '',
                  sku: '',
                  customType: '',
                  customVariant: '',
                  notes: '',
                });
                setIsAddModalOpen(true);
              }}
              className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-amber-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Product</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Catalog edits reserved for Admin</span>
            </div>
          )}

          <button
            onClick={() => exportInventoryToExcel(filteredProducts)}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 transition-colors"
            title="Download Inventory Stock Valuation Spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export Stock (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          {/* Search Box */}
          <div className="relative sm:col-span-5">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="input-inventory-search"
              placeholder="Search by product name, SKU, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              id="select-inventory-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
            >
              <option value="All">All Categories ({products.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({products.filter((p) => p.category === cat).length})
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="sm:col-span-2">
            <select
              id="select-inventory-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Healthy">Healthy Stock</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="sm:col-span-2">
            <select
              id="select-inventory-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
            >
              <option value="stock-asc">Stock: Low → High</option>
              <option value="stock-desc">Stock: High → Low</option>
              <option value="name">Product Name (A-Z)</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>
        </div>

        {/* Category Pills for quick filtering */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              selectedCategory === 'All'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Products ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat} ({products.filter((p) => p.category === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 text-xs">
              <tr>
                <th className="py-3 px-3.5">Product & SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Buying Price</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">Current Stock</th>
                <th className="py-3 px-3 text-center">Reorder Level</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const isOut = product.currentStock === 0;
                const isLow = product.currentStock > 0 && product.currentStock <= product.reorderLevel;
                const margin =
                  product.sellingPrice > 0
                    ? Math.round(
                        ((product.sellingPrice - product.buyingPrice) / product.sellingPrice) * 100
                      )
                    : 0;

                return (
                  <tr
                    key={product.id}
                    id={`product-row-${product.id}`}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isOut ? 'bg-red-50/30' : isLow ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Product Name & SKU */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 text-sm">{product.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs font-medium whitespace-nowrap text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {product.sku}
                        </span>
                        <span className="text-xs text-slate-400">Added: {formatDate(product.dateAdded)}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {product.category}
                      </span>
                    </td>

                    {/* Buying Price */}
                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                      {formatKES(product.buyingPrice)}
                    </td>

                    {/* Selling Price & Margin */}
                    <td className="py-3 px-3 text-right">
                      <span className="font-bold text-slate-900 block">{formatKES(product.sellingPrice)}</span>
                      <span className="text-xs font-medium text-emerald-700 whitespace-nowrap">
                        {margin}% margin
                      </span>
                    </td>

                    {/* Current Stock with calculation badge */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isOut
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOut ? (
                            <XCircle className="h-3 w-3" />
                          ) : isLow ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          <span>
                            {product.currentStock} {product.unit}
                          </span>
                        </span>
                        {isOut && <span className="text-xs font-bold text-red-600 mt-0.5">Out of stock</span>}
                        {isLow && <span className="text-xs font-bold text-amber-700 mt-0.5">Low stock</span>}
                      </div>
                    </td>

                    {/* Reorder Level */}
                    <td className="py-3 px-3 text-center font-medium text-slate-500">
                      {product.reorderLevel} {product.unit}
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-3 text-slate-600 truncate max-w-[130px]">
                      {product.supplierName || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Add to Shopping List / Cart (Available to all users with canManageCart) */}
                        {permissions.canManageCart && (
                          <button
                            id={`btn-add-cart-${product.id}`}
                            title="Add to Shopping List / Cart"
                            onClick={() => {
                              setQuickAddShoppingProduct(product);
                              setCartPromptQty(
                                Math.max(product.reorderLevel * 2 - product.currentStock, 5)
                              );
                              setCartPromptSupplier(product.supplierId || '');
                              setCartPromptNotes(
                                isOut
                                  ? 'Urgent restock — out of stock'
                                  : isLow
                                  ? 'Low stock replenishment'
                                  : 'Planned restock'
                              );
                              setCartPromptLabel(
                                isOut ? 'lbl-urgent' : isLow ? 'lbl-urgent' : 'lbl-normal'
                              );
                            }}
                            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-bold shadow-2xs transition-colors ${
                              isOut || isLow
                                ? 'border border-red-600 bg-white text-red-700 hover:bg-red-50'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <ShoppingCart className="h-3 w-3" />
                            <span className="hidden md:inline whitespace-nowrap">
                              {isOut || isLow ? 'Reorder' : 'To cart'}
                            </span>
                          </button>
                        )}

                        {/* View Movements (Read-only) */}
                        <button
                          id={`btn-view-${product.id}`}
                          title="View Stock Movements"
                          onClick={() => setViewingProduct(product)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Audit / Stock Adjust (Edit Product permission) */}
                        {permissions.canEditProduct && (
                          <button
                            id={`btn-adj-${product.id}`}
                            title="Stock Adjustment"
                            onClick={() => {
                              setAdjustingProduct(product);
                              setAdjQty(1);
                              setAdjType('ADJUSTMENT_ADD');
                              setAdjReason('Stock audit adjustment');
                            }}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Edit Product (Admin only) */}
                        {permissions.canEditProduct && (
                          <button
                            id={`btn-edit-${product.id}`}
                            title="Edit Product Details (Admin)"
                            onClick={() => setEditingProduct(product)}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Delete Product (Admin only) */}
                        {permissions.canDeleteProduct && (
                          <button
                            id={`btn-delete-${product.id}`}
                            title="Delete Product (Admin)"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to delete "${product.name}" (${product.sku})? This cannot be undone.`
                                )
                              ) {
                                onDeleteProduct(product.id);
                              }
                            }}
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="py-12 text-center">
              <Package className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No products found</p>
              <p className="text-xs text-slate-400 mt-1">Try changing your search query or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- ADD PRODUCT MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Add New Product</h3>
                <p className="text-xs text-slate-500">
                  SKU will be generated using CATEGORY-TYPE-VARIANT pattern.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!addForm.name.trim()) return;

                const selectedSup = suppliers.find((s) => s.id === addForm.supplierId);
                const finalSku =
                  addForm.sku.trim() ||
                  handleAutoGenerateSku(
                    addForm.category,
                    addForm.name,
                    addForm.customType,
                    addForm.customVariant
                  );

                onAddProduct({
                  sku: finalSku,
                  name: addForm.name.trim(),
                  category: addForm.category,
                  unit: addForm.unit || 'Pcs',
                  buyingPrice: Number(addForm.buyingPrice) || 0,
                  sellingPrice: Number(addForm.sellingPrice) || 0,
                  openingStock: Number(addForm.openingStock) || 0,
                  reorderLevel: Number(addForm.reorderLevel) || 3,
                  supplierId: addForm.supplierId,
                  supplierName: selectedSup?.name,
                  dateAdded: new Date().toISOString().split('T')[0],
                  notes: addForm.notes,
                });
                setIsAddModalOpen(false);
              }}
              className="mt-4 space-y-4 text-xs"
            >
              {/* Product Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2.5mm² Twin Cable, LED Bulb 9W, Ball Valve..."
                  value={addForm.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const autoSku = handleAutoGenerateSku(
                      addForm.category,
                      newName,
                      addForm.customType,
                      addForm.customVariant
                    );
                    setAddForm({ ...addForm, name: newName, sku: autoSku });
                  }}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => {
                      const newCat = e.target.value as ProductCategory;
                      const autoSku = handleAutoGenerateSku(
                        newCat,
                        addForm.name,
                        addForm.customType,
                        addForm.customVariant
                      );
                      setAddForm({ ...addForm, category: newCat, sku: autoSku });
                    }}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    placeholder="Pcs, Rolls, Meters, Sets, Boxes"
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Auto SKU Generator Section */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span>Auto-Generated SKU (CATEGORY-TYPE-VARIANT)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const autoSku = handleAutoGenerateSku(
                        addForm.category,
                        addForm.name,
                        addForm.customType,
                        addForm.customVariant
                      );
                      setAddForm({ ...addForm, sku: autoSku });
                    }}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 underline"
                  >
                    Regenerate
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-0.5">
                      Optional Short Type Code (e.g. CBL, SW, VLV)
                    </label>
                    <input
                      type="text"
                      placeholder="Auto guessed from name"
                      value={addForm.customType}
                      onChange={(e) => {
                        const typeVal = e.target.value;
                        const autoSku = handleAutoGenerateSku(
                          addForm.category,
                          addForm.name,
                          typeVal,
                          addForm.customVariant
                        );
                        setAddForm({ ...addForm, customType: typeVal, sku: autoSku });
                      }}
                      className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-semibold mb-0.5">
                      Optional Variant (e.g. 2.5MM, 9W, BALL)
                    </label>
                    <input
                      type="text"
                      placeholder="Auto guessed from name"
                      value={addForm.customVariant}
                      onChange={(e) => {
                        const varVal = e.target.value;
                        const autoSku = handleAutoGenerateSku(
                          addForm.category,
                          addForm.name,
                          addForm.customType,
                          varVal
                        );
                        setAddForm({ ...addForm, customVariant: varVal, sku: autoSku });
                      }}
                      className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Final SKU (Editable):
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.sku}
                    onChange={(e) => setAddForm({ ...addForm, sku: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-amber-300 bg-white font-mono text-sm font-bold text-amber-900 p-2"
                  />
                </div>
              </div>

              {/* Buying Price & Selling Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Buying Price (KSh)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={addForm.buyingPrice || ''}
                    onChange={(e) =>
                      setAddForm({ ...addForm, buyingPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price (KSh)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={addForm.sellingPrice || ''}
                    onChange={(e) =>
                      setAddForm({ ...addForm, sellingPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Opening Stock & Reorder Level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Opening Stock (Units)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={addForm.openingStock}
                    onChange={(e) =>
                      setAddForm({ ...addForm, openingStock: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">Initial count when starting system</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reorder Level (Alert Threshold)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={addForm.reorderLevel}
                    onChange={(e) =>
                      setAddForm({ ...addForm, reorderLevel: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">Triggers Low Stock warning</span>
                </div>
              </div>

              {/* Supplier Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Supplier</label>
                <select
                  value={addForm.supplierId}
                  onChange={(e) => setAddForm({ ...addForm, supplierId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 1.8L cordless stainless electric kettle..."
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-amber-700"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT PRODUCT MODAL (Cannot alter currentStock directly!) --- */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Edit Product</h3>
                <p className="text-xs text-slate-500 font-mono">SKU: {editingProduct.sku}</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const sup = suppliers.find((s) => s.id === editingProduct.supplierId);
                onEditProduct({
                  ...editingProduct,
                  supplierName: sup?.name,
                });
                setEditingProduct(null);
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        category: e.target.value as ProductCategory,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              {/* Price fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Buying Price (KSh)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.buyingPrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        buyingPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price (KSh)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.sellingPrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        sellingPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Stock Protection Notice */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-blue-900">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Current Stock Level:</span>
                  <span className="text-base font-black">
                    {editingProduct.currentStock} {editingProduct.unit}
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Current stock cannot be manually altered here. It automatically calculates from purchases,
                  sales, and audit adjustments.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reorder Level Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={editingProduct.reorderLevel}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        reorderLevel: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier</label>
                  <select
                    value={editingProduct.supplierId}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, supplierId: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  >
                    <option value="">-- None --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editingProduct.notes || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, notes: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-amber-700"
                >
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PRODUCT DETAILS & STOCK MOVEMENT HISTORY DRAWER/MODAL --- */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900">{viewingProduct.name}</h3>
                  <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                    {viewingProduct.sku}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Category: {viewingProduct.category} • Supplier: {viewingProduct.supplierName || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setViewingProduct(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Product Summary Grid */}
            <div className="my-4 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-xs text-slate-500 block">Current Stock</span>
                <span className="text-base font-black text-slate-900">
                  {viewingProduct.currentStock} {viewingProduct.unit}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-xs text-slate-500 block">Reorder Level</span>
                <span className="text-base font-bold text-amber-700">
                  {viewingProduct.reorderLevel} {viewingProduct.unit}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-xs text-slate-500 block">Buying Price</span>
                <span className="text-base font-bold text-slate-700">
                  {formatKES(viewingProduct.buyingPrice)}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-xs text-slate-500 block">Selling Price</span>
                <span className="text-base font-bold text-emerald-700">
                  {formatKES(viewingProduct.sellingPrice)}
                </span>
              </div>
            </div>

            {/* Stock Movements Log */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <History className="h-4 w-4 text-amber-600" />
                <span>Stock Movement History</span>
              </h4>
              <span className="text-xs text-slate-500">
                Formula: Opening + Purchases - Sales + Adjustments
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50 min-h-[220px]">
              {stockMovements
                .filter((m) => m.productId === viewingProduct.id)
                .map((m) => {
                  const isPositive =
                    m.movementType === 'OPENING_STOCK' ||
                    m.movementType === 'PURCHASE' ||
                    m.movementType === 'ADJUSTMENT_ADD' ||
                    m.movementType === 'RETURN';

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg bg-white p-2.5 text-xs border border-slate-100 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg font-bold ${
                            isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {m.movementType.replace('_', ' ')}: {m.referenceNumber}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDate(m.date)} • {m.supplierOrCustomerName || 'Internal'}
                          </div>
                          {m.notes && <p className="text-xs text-slate-400 italic mt-0.5">{m.notes}</p>}
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-sm font-black ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isPositive ? `+${m.quantity}` : `-${m.quantity}`} {viewingProduct.unit}
                        </span>
                        <span className="text-xs text-slate-400 block">
                          @{formatKES(m.unitCost)}/unit
                        </span>
                      </div>
                    </div>
                  );
                })}

              {stockMovements.filter((m) => m.productId === viewingProduct.id).length === 0 && (
                <p className="py-8 text-center text-xs text-slate-400">
                  No stock movement history recorded for this product yet.
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setViewingProduct(null);
                  setAdjustingProduct(viewingProduct);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Adjust Stock Count</span>
              </button>
              <button
                onClick={() => setViewingProduct(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- QUICK PROMPT: ADD TO SHOPPING LIST MODAL --- */}
      {quickAddShoppingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Add to Shopping List</h3>
                  <p className="text-xs text-slate-500">{quickAddShoppingProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setQuickAddShoppingProduct(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onAddToShoppingList(
                  quickAddShoppingProduct,
                  Number(cartPromptQty) || 1,
                  cartPromptLabel,
                  cartPromptSupplier || quickAddShoppingProduct.supplierId,
                  cartPromptDate,
                  cartPromptNotes
                );
                setQuickAddShoppingProduct(null);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Quantity Required ({quickAddShoppingProduct.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={cartPromptQty}
                  onChange={(e) => setCartPromptQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                />
                <div className="text-xs text-slate-500 mt-1 flex justify-between">
                  <span>Estimated Unit Cost: {formatKES(quickAddShoppingProduct.buyingPrice)}</span>
                  <span className="font-bold text-slate-900">
                    Total: {formatKES(quickAddShoppingProduct.buyingPrice * cartPromptQty)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority / Label</label>
                <select
                  value={cartPromptLabel}
                  onChange={(e) => setCartPromptLabel(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                >
                  {priorityLabels.map((lbl) => (
                    <option key={lbl.id} value={lbl.id}>
                      {lbl.name} {lbl.description ? `(${lbl.description})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Supplier</label>
                <select
                  value={cartPromptSupplier}
                  onChange={(e) => setCartPromptSupplier(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                >
                  <option value="">Default ({quickAddShoppingProduct.supplierName || 'Any'})</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Purchase Date</label>
                <input
                  type="date"
                  value={cartPromptDate}
                  onChange={(e) => setCartPromptDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Low stock alert, requested by contractor..."
                  value={cartPromptNotes}
                  onChange={(e) => setCartPromptNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div className="rounded bg-slate-50 p-2 text-xs text-slate-500 border border-slate-100">
                ⚠️ Adding to Shopping List does NOT alter current inventory. Stock only increases when
                confirmed as purchased.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickAddShoppingProduct(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                >
                  Add to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- STOCK ADJUSTMENT MODAL (Audit / Damaged stock) --- */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900">Stock Adjustment</h3>
                <p className="text-xs text-slate-500">{adjustingProduct.name} ({adjustingProduct.sku})</p>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onStockAdjustment(
                  adjustingProduct.id,
                  Math.abs(adjQty),
                  adjType,
                  adjReason || 'Audit adjustment'
                );
                setAdjustingProduct(null);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Current Stock in System:</span>
                <span className="font-black text-slate-900 text-sm">
                  {adjustingProduct.currentStock} {adjustingProduct.unit}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adjustment Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('ADJUSTMENT_ADD')}
                    className={`rounded-lg p-2 text-xs font-bold border transition-colors ${
                      adjType === 'ADJUSTMENT_ADD'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    + Add Found Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('ADJUSTMENT_SUB')}
                    className={`rounded-lg p-2 text-xs font-bold border transition-colors ${
                      adjType === 'ADJUSTMENT_SUB'
                        ? 'bg-rose-50 border-rose-500 text-rose-800'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    - Deduct (Damaged/Lost)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Quantity ({adjustingProduct.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  max={adjType === 'ADJUSTMENT_SUB' ? adjustingProduct.currentStock : 9999}
                  required
                  value={adjQty}
                  onChange={(e) => setAdjQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  New calculated stock will be:{' '}
                  <strong className="text-slate-900">
                    {adjType === 'ADJUSTMENT_ADD'
                      ? adjustingProduct.currentStock + adjQty
                      : Math.max(0, adjustingProduct.currentStock - adjQty)}{' '}
                    {adjustingProduct.unit}
                  </strong>
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Adjustment</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of month physical stock count, damaged item..."
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-700"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
