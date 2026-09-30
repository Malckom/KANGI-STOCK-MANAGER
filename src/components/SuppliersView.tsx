import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Tag,
  Truck,
  DollarSign,
  Edit2,
  Trash2,
  X,
  MessageCircle,
  Package,
} from 'lucide-react';
import { Supplier, Purchase, Product } from '../types';
import { formatKES } from '../utils/formatters';

interface SuppliersViewProps {
  suppliers: Supplier[];
  purchases: Purchase[];
  products: Product[];
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onInitiatePurchaseForSupplier: (supplier: Supplier) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  purchases,
  products,
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
  onInitiatePurchaseForSupplier,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formProductsSupplied, setFormProductsSupplied] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Cash on Delivery');
  const [formNotes, setFormNotes] = useState('');

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        s.phone.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.productsSupplied.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [suppliers, searchQuery]);

  const openAddModal = () => {
    setFormName('');
    setFormContactPerson('');
    setFormPhone('+254 ');
    setFormEmail('');
    setFormLocation('Nairobi');
    setFormProductsSupplied('');
    setFormPaymentTerms('Cash on Delivery');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setFormName(s.name);
    setFormContactPerson(s.contactPerson || '');
    setFormPhone(s.phone);
    setFormEmail(s.email || '');
    setFormLocation(s.location);
    setFormProductsSupplied(s.productsSupplied.join(', '));
    setFormPaymentTerms(s.paymentTerms || 'Cash on Delivery');
    setFormNotes(s.notes || '');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const tags = formProductsSupplied
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onAddSupplier({
      name: formName.trim(),
      contactPerson: formContactPerson.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      location: formLocation.trim(),
      productsSupplied: tags.length > 0 ? tags : ['General Hardware'],
      paymentTerms: formPaymentTerms,
      notes: formNotes.trim() || undefined,
    });

    setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !formName.trim() || !formPhone.trim()) return;

    const tags = formProductsSupplied
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onEditSupplier({
      ...editingSupplier,
      name: formName.trim(),
      contactPerson: formContactPerson.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      location: formLocation.trim(),
      productsSupplied: tags.length > 0 ? tags : ['General Hardware'],
      paymentTerms: formPaymentTerms,
      notes: formNotes.trim() || undefined,
    });

    setEditingSupplier(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Suppliers & Wholesalers
          </h2>
          <p className="text-sm text-slate-600">
            Manage your hardware distributors, electrical importers, and plumbing wholesalers.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700 transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search suppliers by name, product category, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none shadow-xs"
        />
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.map((supplier) => {
          const supplierPurchases = purchases.filter((p) => p.supplierId === supplier.id);
          const totalSpent = supplierPurchases.reduce((sum, p) => sum + p.totalCost, 0);
          const linkedProductsCount = products.filter((p) => p.supplierId === supplier.id).length;

          return (
            <div
              key={supplier.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{supplier.name}</h3>
                      <p className="text-xs text-slate-500">{supplier.contactPerson || 'Direct Line'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(supplier)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete supplier "${supplier.name}"? Existing purchase history will be preserved.`
                          )
                        ) {
                          onDeleteSupplier(supplier.id);
                        }
                      }}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{supplier.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                </div>

                {/* Product Tags */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {supplier.productsSupplied.map((tag, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Spend & Stock Stats */}
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">
                      Total Restock Spend
                    </span>
                    <span className="font-bold text-slate-900">{formatKES(totalSpent)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">
                      Linked Catalog Items
                    </span>
                    <span className="font-bold text-slate-900">{linkedProductsCount} items</span>
                  </div>
                </div>

                {supplier.notes && (
                  <p className="mt-2 text-xs text-slate-500 italic truncate">
                    &ldquo;{supplier.notes}&rdquo;
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${supplier.phone}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    <Phone className="h-3 w-3" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`https://wa.me/${supplier.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-3 w-3" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                <button
                  onClick={() => onInitiatePurchaseForSupplier(supplier)}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-blue-500"
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>Stock In</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <Building2 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No suppliers found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or add a new supplier.</p>
        </div>
      )}

      {/* --- ADD / EDIT SUPPLIER MODAL --- */}
      {(isAddModalOpen || editingSupplier) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingSupplier(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={editingSupplier ? handleEditSubmit : handleAddSubmit}
              className="mt-4 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Supplier / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kenya Cables Wholesalers"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Maina, Sales Dept"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+254 7..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / Street</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. River Road, Nairobi"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="orders@supplier.co.ke"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Supplied Products / Categories (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cables, Switches, Sockets, Pipes"
                  value={formProductsSupplied}
                  onChange={(e) => setFormProductsSupplied(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                <input
                  type="text"
                  placeholder="e.g. Cash on Delivery, 30 days credit, M-Pesa Till"
                  value={formPaymentTerms}
                  onChange={(e) => setFormPaymentTerms(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Delivers free on orders above KSh 20,000..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingSupplier(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-amber-700"
                >
                  {editingSupplier ? 'Save Changes' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
