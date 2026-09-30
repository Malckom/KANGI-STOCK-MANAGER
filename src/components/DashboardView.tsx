import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  XCircle,
  ShoppingCart,
  CalendarClock,
  Clock,
  ArrowRight,
  Plus,
  Phone,
  MessageCircle,
  CheckCircle2,
  Truck,
  Sparkles,
} from 'lucide-react';
import {
  Product,
  Sale,
  Purchase,
  FollowUp,
  ShoppingListItem,
  Customer,
  NavView,
} from '../types';
import {
  formatKES,
  formatDate,
  formatTime,
  formatDateTime,
  isFollowUpOverdue,
  isDateToday,
} from '../utils/formatters';

interface DashboardViewProps {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  followUps: FollowUp[];
  shoppingList: ShoppingListItem[];
  customers: Customer[];
  setActiveTab?: (tab: NavView) => void;
  onNavigate?: (view: NavView) => void;
  onOpenQuickSale?: () => void;
  onOpenQuickPurchase?: () => void;
  onOpenQuickFollowUp?: () => void;
  onOpenShoppingMode?: () => void;
  onCompleteFollowUp?: (followUp: FollowUp) => void;
  onAddProductToShoppingList?: (product: Product) => void;
  onQuickLowStockView?: () => void;
  onQuickOverdueFollowUpsView?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  sales,
  purchases,
  followUps,
  shoppingList,
  customers,
  setActiveTab,
  onNavigate,
  onOpenQuickSale,
  onOpenQuickPurchase,
  onOpenQuickFollowUp,
  onOpenShoppingMode,
  onCompleteFollowUp,
  onAddProductToShoppingList,
  onQuickLowStockView,
  onQuickOverdueFollowUpsView,
}) => {
  const navigate = (tab: NavView) => {
    if (onNavigate) {
      onNavigate(tab);
    } else if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  // Calculations
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + p.currentStock * p.buyingPrice,
    0
  );

  const todaySalesList = sales.filter((s) => isDateToday(s.date));
  const todaySalesTotal = todaySalesList.reduce((sum, s) => sum + s.totalSale, 0);
  const todayProfitTotal = todaySalesList.reduce((sum, s) => sum + s.grossProfit, 0);

  const lowStockProducts = products.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.minStockLevel
  );
  const outOfStockProducts = products.filter((p) => p.currentStock === 0);

  const pendingFollowUps = followUps.filter((f) => f.status === 'pending');
  const overdueFollowUps = pendingFollowUps.filter((f) =>
    isFollowUpOverdue(f.date, f.time, f.status)
  );

  // Determine "Next Follow-up" spotlight (sorted by scheduled date & time)
  const sortedPendingFollowUps = [...pendingFollowUps].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateA.getTime() - dateB.getTime();
  });
  const nextFollowUp = sortedPendingFollowUps[0] || null;

  // Shopping list counts
  const activeShoppingItems = shoppingList.filter((i) => i.purchaseStatus !== 'purchased');
  const urgentShoppingCount = activeShoppingItems.filter(
    (i) => i.priorityLabelName?.toUpperCase() === 'URGENT'
  ).length;
  const bucketListShoppingCount = activeShoppingItems.filter(
    (i) => i.priorityLabelName?.toUpperCase() === 'BUCKET LIST'
  ).length;
  const normalShoppingCount = activeShoppingItems.filter(
    (i) => i.priorityLabelName?.toUpperCase() === 'NORMAL'
  ).length;
  const totalEstimatedCost = activeShoppingItems.reduce(
    (sum, i) => sum + i.estimatedTotalCost,
    0
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Responsive Quick Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Business Overview
          </h2>
          <p className="text-sm text-slate-600">
            Stock value, today's takings and open follow-ups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenQuickSale && (
            <button
              id="dashboard-btn-new-sale"
              onClick={onOpenQuickSale}
              className="flex min-h-[44px] sm:min-h-0 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Record Sale</span>
            </button>
          )}
          {onOpenQuickPurchase && (
            <button
              id="dashboard-btn-new-purchase"
              onClick={onOpenQuickPurchase}
              className="flex min-h-[44px] sm:min-h-0 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
            >
              <Truck className="h-4 w-4" />
              <span>Stock In</span>
            </button>
          )}
          {onOpenQuickFollowUp && (
            <button
              id="dashboard-btn-new-followup"
              onClick={onOpenQuickFollowUp}
              className="flex min-h-[44px] sm:min-h-0 w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors"
            >
              <CalendarClock className="h-4 w-4" />
              <span>Add Follow-up</span>
            </button>
          )}
        </div>
      </div>

      {/* Overdue follow-ups */}
      {overdueFollowUps.length > 0 && (
        <div className="flex flex-col gap-3 border border-slate-200 border-l-4 border-l-red-600 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {overdueFollowUps.length} follow-up{overdueFollowUps.length > 1 ? 's are' : ' is'} overdue
            </h3>
            <p className="text-xs text-slate-600">
              Calls or quotations that were due are still open.
            </p>
          </div>
          <button
            id="dashboard-btn-view-overdue"
            onClick={() => onQuickOverdueFollowUpsView ? onQuickOverdueFollowUpsView() : navigate('follow-ups')}
            className="flex min-h-[40px] items-center justify-center rounded-lg border border-red-600 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors sm:min-h-0"
          >
            Review overdue
          </button>
        </div>
      )}

      {/* Key figures: one ledger strip rather than six separate tiles */}
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 border border-slate-200 bg-white sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        <KpiCell label="Inventory value" value={formatKES(totalInventoryValue)} note="At buying cost" />
        <KpiCell label="Sales today" value={formatKES(todaySalesTotal)} note={`${todaySalesList.length} ${todaySalesList.length === 1 ? 'sale' : 'sales'}`} />
        <KpiCell label="Profit today" value={formatKES(todayProfitTotal)} note="Gross margin" tone={todayProfitTotal > 0 ? 'good' : 'plain'} />
        <KpiCell label="Products" value={String(products.length)} note="View inventory" onClick={() => navigate('inventory')} />
        <KpiCell
          label="Low stock"
          value={String(lowStockProducts.length)}
          note="At or below reorder level"
          tone={lowStockProducts.length > 0 ? 'warn' : 'plain'}
          onClick={() => onQuickLowStockView ? onQuickLowStockView() : navigate('inventory')}
        />
        <KpiCell
          label="Out of stock"
          value={String(outOfStockProducts.length)}
          note="No units available"
          tone={outOfStockProducts.length > 0 ? 'bad' : 'plain'}
          onClick={() => onQuickLowStockView ? onQuickLowStockView() : navigate('inventory')}
        />
      </div>

      {/* Row: Next Follow-Up Spotlight & Shopping List Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Next Follow-up Spotlight Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900">Next Scheduled Follow-up</h3>
              </div>
              <button
                onClick={() => navigate('follow-ups')}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-transform"
              >
                <span>View All ({pendingFollowUps.length})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {nextFollowUp ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900">{nextFollowUp.customerName}</h4>
                    <p className="text-xs text-slate-500">{nextFollowUp.customerPhone}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      isFollowUpOverdue(nextFollowUp.date, nextFollowUp.time, nextFollowUp.status)
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : isDateToday(nextFollowUp.date)
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {isFollowUpOverdue(nextFollowUp.date, nextFollowUp.time, nextFollowUp.status)
                      ? 'Overdue'
                      : isDateToday(nextFollowUp.date)
                      ? 'Today'
                      : formatDate(nextFollowUp.date)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Product / Interest:</span>
                    <span className="font-semibold text-slate-800">{nextFollowUp.productOrService || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Scheduled Time:</span>
                    <span className="font-semibold text-slate-800">
                      {formatDateTime(nextFollowUp.date, nextFollowUp.time)}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200">
                    <span className="text-slate-400 block font-medium">Reason & Notes:</span>
                    <span className="text-slate-700 font-medium">{nextFollowUp.reasonForFollowUp}</span>
                    {nextFollowUp.notes && (
                      <p className="text-slate-500 italic mt-0.5 text-xs">&ldquo;{nextFollowUp.notes}&rdquo;</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-slate-600">All follow-ups completed!</p>
                <p className="text-xs text-slate-400 mt-1">No pending customer calls scheduled.</p>
              </div>
            )}
          </div>

          {nextFollowUp && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${nextFollowUp.customerPhone}`}
                  className="flex min-h-[38px] items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/${nextFollowUp.customerPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[38px] items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
              {onCompleteFollowUp && (
                <button
                  onClick={() => onCompleteFollowUp(nextFollowUp)}
                  className="flex min-h-[38px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark Done</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Shopping List Summary Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900">Purchase Cart / Shopping List</h3>
              </div>
              {onOpenShoppingMode && (
                <button
                  id="btn-shopping-mode-shortcut"
                  onClick={onOpenShoppingMode}
                  className="flex min-h-[36px] items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-slate-800 transition-colors"
                >
                  <span>In-Store Mode</span>
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-2.5 text-center">
                <span className="text-xs sm:text-xs font-bold text-rose-700 block">Urgent</span>
                <span className="text-lg sm:text-xl font-black text-rose-900">{urgentShoppingCount}</span>
                <span className="text-xs text-rose-600 block">items</span>
              </div>
              <div className="rounded-xl bg-purple-50 border border-purple-100 p-2.5 text-center">
                <span className="text-xs sm:text-xs font-bold text-purple-700 block">Bucket list</span>
                <span className="text-lg sm:text-xl font-black text-purple-900">{bucketListShoppingCount}</span>
                <span className="text-xs text-purple-600 block">items</span>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-2.5 text-center">
                <span className="text-xs sm:text-xs font-bold text-blue-700 block">Normal</span>
                <span className="text-lg sm:text-xl font-black text-blue-900">{normalShoppingCount}</span>
                <span className="text-xs text-blue-600 block">items</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div>
                <span className="text-xs text-slate-500 block">Total Active Items</span>
                <span className="text-sm font-bold text-slate-800">{activeShoppingItems.length} planned items</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Total Estimated Cost</span>
                <span className="text-base font-black text-slate-900">{formatKES(totalEstimatedCost)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-slate-500 italic">Planned purchases do not alter stock until confirmed.</span>
            <button
              id="dashboard-btn-view-shopping-list"
              onClick={() => navigate('shopping-list')}
              className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-colors"
            >
              <span>View Shopping List</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row: Low & Out of Stock Quick Action Table */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="font-bold text-slate-900">Items to reorder</h3>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {lowStockProducts.length + outOfStockProducts.length}
              </span>
            </div>
            <button
              onClick={() => onQuickLowStockView ? onQuickLowStockView() : navigate('inventory')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Manage in Inventory</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-600 font-bold">
                <tr>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Stock Left</th>
                  <th className="py-2.5 px-3">Reorder Point</th>
                  <th className="py-2.5 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...outOfStockProducts, ...lowStockProducts].slice(0, 5).map((prod) => {
                  const isOutOfStock = prod.currentStock === 0;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{prod.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{prod.category}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {prod.currentStock} {prod.unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">
                        {prod.reorderLevel || prod.minStockLevel || 5} {prod.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {onAddProductToShoppingList && (
                          <button
                            onClick={() => onAddProductToShoppingList(prod)}
                            className="flex min-h-[34px] items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-slate-800 transition-colors ml-auto"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            <span>+ To Cart</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row: Recent Sales & Purchases */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Sales */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900">Recent Sales</h3>
            </div>
            <button
              onClick={() => navigate('sales')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-transform"
            >
              <span>View All Sales</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2">
            {sales.slice(0, 5).map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs hover:bg-slate-100/80 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{sale.productName || (sale.items && sale.items[0]?.productName) || 'Sale'}</span>
                    <span className="rounded-md bg-slate-200 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                      Qty: {sale.quantity || (sale.items?.reduce((s, i) => s + i.quantity, 0)) || 1}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <span>{sale.customerName || 'Walk-in'}</span> • <span>{sale.paymentMethod}</span> •{' '}
                    <span>{formatDate(sale.date)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-slate-900 block">{formatKES(sale.totalSale || sale.totalAmount)}</span>
                  <span className="text-xs font-bold text-emerald-600">
                    Profit: +{formatKES(sale.grossProfit)}
                  </span>
                </div>
              </div>
            ))}
            {sales.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">No sales recorded yet.</p>
            )}
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              <h3 className="font-bold text-slate-900">Recent Purchases (Stock In)</h3>
            </div>
            <button
              onClick={() => navigate('purchases')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-transform"
            >
              <span>View All Purchases</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2">
            {purchases.slice(0, 5).map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs hover:bg-slate-100/80 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{purchase.productName}</span>
                    <span className="rounded-md bg-blue-100 text-blue-800 px-1.5 py-0.5 font-mono text-xs font-bold">
                      +{purchase.quantity} units
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <span>{purchase.supplierName}</span> • <span>{formatDate(purchase.date)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-slate-900 block">{formatKES(purchase.totalCost)}</span>
                  <span className="text-xs text-slate-500">
                    @{formatKES(purchase.unitCost || purchase.buyingPrice)}/unit
                  </span>
                </div>
              </div>
            ))}
            {purchases.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">No purchases recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


type KpiTone = 'plain' | 'good' | 'warn' | 'bad';

const KPI_VALUE_TONE: Record<KpiTone, string> = {
  plain: 'text-slate-900',
  good: 'text-emerald-700',
  warn: 'text-warn-800',
  bad: 'text-red-700',
};

function KpiCell({
  label,
  value,
  note,
  tone = 'plain',
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  tone?: KpiTone;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="block text-xs font-medium text-slate-600">{label}</span>
      <span className={`mt-1 block truncate text-xl font-semibold ${KPI_VALUE_TONE[tone]}`}>{value}</span>
      <span className="mt-0.5 block text-xs text-slate-500">{note}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="px-4 py-3.5 text-left hover:bg-slate-50 transition-colors">
        {body}
      </button>
    );
  }
  return <div className="px-4 py-3.5">{body}</div>;
}
