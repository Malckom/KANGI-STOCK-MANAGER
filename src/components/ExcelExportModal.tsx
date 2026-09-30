import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  X,
  CheckCircle2,
  Package,
  DollarSign,
  Truck,
  ShoppingCart,
  Users,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AppDatabase } from '../types';
import {
  exportMasterExcelWorkbook,
  exportInventoryToExcel,
  exportSalesToExcel,
  exportPurchasesToExcel,
  exportShoppingListToExcel,
  exportCustomersToExcel,
} from '../utils/excelExport';
import { formatKES } from '../utils/formatters';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: AppDatabase;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  db,
}) => {
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async (type: string, exportFn: () => boolean, name: string) => {
    setIsExporting(type);
    setExportSuccess(null);
    try {
      // Allow UI thread a tiny tick for button spinner
      setTimeout(() => {
        const ok = exportFn();
        setIsExporting(null);
        if (ok) {
          setExportSuccess(name);
          setTimeout(() => setExportSuccess(null), 4000);
        }
      }, 100);
    } catch (e) {
      console.error(e);
      setIsExporting(null);
    }
  };

  const storeName = db.settings?.businessName || 'KANGI Stock Manager';
  const totalInvValue = db.products.reduce(
    (sum, p) => sum + (p.currentStock || 0) * (p.buyingPrice || 0),
    0
  );
  const totalSalesRev = db.sales.reduce(
    (sum, s) => sum + (s.totalSale || s.totalAmount || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Excel Spreadsheet Generator
              </h3>
              <p className="text-xs text-slate-500">
                Generate clean, formatted Microsoft Excel (.xlsx) workbooks for accounting & records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Banner */}
        {exportSuccess && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 animate-in slide-in-from-top duration-150">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              <strong>{exportSuccess}</strong> generated and downloaded successfully as .xlsx file!
            </span>
          </div>
        )}

        {/* Primary Master Workbook Banner */}
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 p-4 sm:p-5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-700 px-2 py-0.5 text-xs font-black text-white">
                  Recommended
                </span>
                <h4 className="text-base font-black text-slate-900">
                  Complete Store Master Workbook (.xlsx)
                </h4>
              </div>
              <p className="text-xs text-slate-600">
                Contains all 7 workbook sheets: Overview, Stock Valuation, Sales Ledger, Purchases Inbound, Restock Cart, Customers CRM, and Follow-ups Schedule.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-medium text-slate-600">
                <span>📦 {db.products.length} Products ({formatKES(totalInvValue)})</span>
                <span>💰 {db.sales.length} Sales ({formatKES(totalSalesRev)})</span>
                <span>🚚 {db.purchases.length} Purchases</span>
              </div>
            </div>

            <button
              onClick={() =>
                handleExport('master', () => exportMasterExcelWorkbook(db), 'Complete Master Store Workbook')
              }
              disabled={isExporting !== null}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white shadow-md hover:bg-emerald-500 transition-colors disabled:opacity-50 shrink-0"
            >
              <Download className={`h-4 w-4 ${isExporting === 'master' ? 'animate-bounce' : ''}`} />
              <span>
                {isExporting === 'master' ? 'Generating Workbook...' : 'Download Master Excel'}
              </span>
            </button>
          </div>
        </div>

        {/* Individual Excel Exports Section */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-500">
            Export Specific Operational Sheets
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Inventory & Valuation */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition-colors flex flex-col justify-between">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-800 shrink-0">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Inventory Stock & Valuation</h5>
                  <p className="text-xs text-slate-500">
                    SKUs, stock quantities, buying & selling prices, unit profit margins, and reorder alerts.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  handleExport(
                    'inventory',
                    () => exportInventoryToExcel(db.products, db.settings),
                    'Inventory Stock Sheet'
                  )
                }
                disabled={isExporting !== null}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-amber-600" />
                <span>Export Stock (.xlsx)</span>
              </button>
            </div>

            {/* 2. Sales Ledger */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition-colors flex flex-col justify-between">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-800 shrink-0">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Sales Transactions & Revenue</h5>
                  <p className="text-xs text-slate-500">
                    Receipt numbers, item lines, M-Pesa transaction codes, COGS, and gross profit.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  handleExport(
                    'sales',
                    () => exportSalesToExcel(db.sales, db.settings),
                    'Sales Ledger'
                  )
                }
                disabled={isExporting !== null}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export Sales (.xlsx)</span>
              </button>
            </div>

            {/* 3. Purchases / Stock In */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition-colors flex flex-col justify-between">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-800 shrink-0">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Purchases & Inbound Stock</h5>
                  <p className="text-xs text-slate-500">
                    Supplier replenishment receipts, wholesale purchase prices, and payment status.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  handleExport(
                    'purchases',
                    () => exportPurchasesToExcel(db.purchases, db.settings),
                    'Purchases Report'
                  )
                }
                disabled={isExporting !== null}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-blue-600" />
                <span>Export Purchases (.xlsx)</span>
              </button>
            </div>

            {/* 4. Restock Shopping Plan */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition-colors flex flex-col justify-between">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="rounded-lg bg-rose-100 p-2 text-rose-800 shrink-0">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Shopping & Restock Order</h5>
                  <p className="text-xs text-slate-500">
                    Supplier order sheets with priority flags (Urgent / Bucket) and estimated buying costs.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  handleExport(
                    'shopping',
                    () => exportShoppingListToExcel(db.shoppingList, db.settings),
                    'Shopping Restock List'
                  )
                }
                disabled={isExporting !== null}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-rose-600" />
                <span>Export Order Sheet (.xlsx)</span>
              </button>
            </div>

            {/* 5. Customers & Follow-ups */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition-colors flex flex-col justify-between sm:col-span-2">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="rounded-lg bg-purple-100 p-2 text-purple-800 shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Customer CRM & Follow-ups Schedule</h5>
                  <p className="text-xs text-slate-500">
                    Contact book, lifetime purchase values, scheduled client callbacks, quotes, and calendar sync status.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  handleExport(
                    'customers',
                    () => exportCustomersToExcel(db.customers, db.followUps, db.settings),
                    'Customer CRM & Follow-ups'
                  )
                }
                disabled={isExporting !== null}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-purple-600" />
                <span>Export Customers & Follow-ups (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            Formatted for Microsoft Excel, Google Sheets & LibreOffice Calc
          </span>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
