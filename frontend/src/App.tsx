import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from './services/api';
import {
  Banknote,
  BarChart3,
  Barcode,
  Building2,
  CheckCircle2,
  CreditCard,
  ArrowLeftRight,
  FileText,
  LayoutDashboard,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  Truck,
  TrendingDown,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import './App.css';

type Product = {
  product_id: number;
  name: string;
  barcode: string;
  selling_price: string;
  cost_price: string;
  category: string | null;
  category_id: number | null;
  quantity: string;
  is_new: boolean;
};

type CartItem = Product & { cartQuantity: number };
type InventoryItem = {
  inventory_id: number;
  product_id: number;
  name: string;
  barcode: string;
  category: string | null;
  quantity: string;
  reorder_level: string;
  low_stock: boolean;
};
type PaymentMethod = 'cash' | 'card' | 'bank_transfer';
type User = { userId: number; branchId: number; branchName: string; fullName: string; email: string; role: 'admin' | 'manager' | 'cashier' };
type ManagementReports = {
  from: string;
  to: string;
  group_by: 'day' | 'month';
  sales: { period: string; transaction_count: number; gross_sales: string; refunds: string; net_sales: string }[];
  profit: { period: string; gross_profit_estimate: string }[];
  cashiers: { user_id: number; cashier: string; transaction_count: number; gross_sales: string; refunds: string; net_sales: string; gross_profit_estimate: string }[];
  inventory: {
    items: { product_id: number; name: string; barcode: string; quantity: string; cost_price: string; selling_price: string; cost_value: string; retail_value: string }[];
    total_cost_value: string;
    total_retail_value: string;
  };
  profit_basis: string;
  tax_report: { available: boolean; message: string };
};
type SaleRecord = {
  sale_id: number;
  total_amount: string;
  status: string;
  created_at: string;
  cashier: string;
  amount_paid: string;
  change_amount: string;
  payment_method: PaymentMethod;
  item_count: number;
  payment_reference?: string | null;
};
type SaleDetail = SaleRecord & {
  branch_id: number;
  cashier_email: string;
  payment_id: number;
  paid_at: string;
  items: {
    sale_item_id: number;
    product_id: number;
    name: string;
    barcode: string;
    quantity: string;
    unit_price: string;
    subtotal: string;
  }[];
};
type ReturnResult = {
  return_id: number;
  sale_id: number;
  refund_amount: string;
  refund_method: PaymentMethod;
  reason: string;
  created_at: string;
  items: { sale_item_id: number; quantity: number; refund: number }[];
};
type View = 'dashboard' | 'checkout' | 'inventory' | 'sales' | 'returns' | 'purchases' | 'reports' | 'branches' | 'transfers';
type Branch = { branch_id: number; name: string; address: string | null };
type BranchUser = { user_id: number; full_name: string; email: string; role: 'manager' | 'cashier'; created_at: string };
type StockTransfer = {
  transfer_id: number;
  source_branch: string;
  destination_branch: string;
  note: string | null;
  created_at: string;
  transferred_by: string;
  items: { product_id: number; product_name: string; quantity: string }[];
};
type Supplier = { supplier_id: number; name: string; contact_name: string | null; email: string | null; phone: string | null };
type PurchaseOrder = {
  purchase_order_id: number; supplier_name: string; status: string; order_date: string;
  expected_date: string | null; total_cost: string; item_quantity: string; received_quantity: string;
};
type PurchaseOrderDetail = PurchaseOrder & {
  items: {
    purchase_order_item_id: number; product_id: number; product_name: string; barcode: string;
    ordered_quantity: string; received_quantity: string; remaining_quantity: number; unit_cost: string
  }[];
};
type ShopSettings = {
  branch_id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  currency: string;
  receipt_footer: string;
  default_reorder_level: number;
};
type ProductForm = {
  name: string;
  barcode: string;
  category_id: string;
  cost_price: string;
  selling_price: string;
  initial_quantity: string;
  reorder_level: string;
};
type DashboardData = {
  date: string;
  summary: { total_sales: string; total_profit: string; transaction_count: number };
  payments: { cash: string; card: string; bank_transfer: string };
  low_stock: { product_id: number; name: string; barcode: string; quantity: string; reorder_level: string }[];
  best_selling: { product_id: number; name: string; barcode: string; quantity_sold: string; sales_amount: string }[];
};
type ReturnableSale = {
  sale_id: number;
  total_amount: string;
  status: string;
  created_at: string;
  cashier: string;
  payment_method: PaymentMethod;
  items: {
    sale_item_id: number;
    product_id: number;
    name: string;
    barcode: string;
    sold_quantity: string;
    returned_quantity: string;
    returnable_quantity: number;
    unit_price: string;
    subtotal: string;
  }[];
};

const parseAmount = (value: string) => {
  const normalized = value.trim();
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const dateInputValue = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  .toISOString()
  .slice(0, 10);

const money = (value: number) => `LKR ${value.toLocaleString('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ category_id: number; name: string }[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('pos_user');
    return stored ? JSON.parse(stored) as User : null;
  });
  const [loginEmail, setLoginEmail] = useState('cashier@supermarket.local');
  const [loginPassword, setLoginPassword] = useState('password');
  const [signupMode, setSignupMode] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [view, setView] = useState<View>('checkout');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [reportFrom, setReportFrom] = useState(() => {
    const now = new Date();
    return dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [reportTo, setReportTo] = useState(() => dateInputValue(new Date()));
  const [reportGroup, setReportGroup] = useState<'day' | 'month'>('day');
  const [managementReports, setManagementReports] = useState<ManagementReports | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [salesPaymentMethod, setSalesPaymentMethod] = useState<'all' | PaymentMethod>('all');
  const [salesLoading, setSalesLoading] = useState(false);
  const [returnReceiptId, setReturnReceiptId] = useState('');
  const [returnSale, setReturnSale] = useState<ReturnableSale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, string>>({});
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [saleDetails, setSaleDetails] = useState<Record<number, SaleDetail>>({});
  const [saleDetailLoading, setSaleDetailLoading] = useState<number | null>(null);
  const [adjustingProductId, setAdjustingProductId] = useState<number | null>(null);
  const [adjustment, setAdjustment] = useState('1');
  const [adjustmentReason, setAdjustmentReason] = useState<'receipt' | 'adjustment' | 'damage'>('receipt');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>({
    name: '', barcode: '', category_id: '', cost_price: '', selling_price: '',
    initial_quantity: '0', reorder_level: '10',
  });
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvPortalOpen, setCsvPortalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrderDetail | null>(null);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseProduct, setPurchaseProduct] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('1');
  const [purchaseUnitCost, setPurchaseUnitCost] = useState('');
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_name: '', email: '', phone: '' });
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [receiving, setReceiving] = useState<Record<number, string>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchUsers, setBranchUsers] = useState<BranchUser[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchForm, setBranchForm] = useState({ name: '', address: '' });
  const [branchUserForm, setBranchUserForm] = useState({
    full_name: '', email: '', password: '', role: 'cashier' as 'manager' | 'cashier',
  });
  const [transferDestinationId, setTransferDestinationId] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('1');
  const [transferNote, setTransferNote] = useState('');
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferSaving, setTransferSaving] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    try {
      const response = await api.post<{ data: { token: string; user: User } }>('/auth/login', {
        email: loginEmail,
        password: loginPassword,
      });
      localStorage.setItem('pos_token', response.data.data.token);
      localStorage.setItem('pos_user', JSON.stringify(response.data.data.user));
      setUser(response.data.data.user);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Login failed.' });
    } finally {
      setLoginLoading(false);
    }
  }

  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signupPassword !== signupConfirmPassword) {
      setNotice({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setLoginLoading(true);
    try {
      const response = await api.post<{ data: { token: string; user: User } }>('/auth/signup', {
        full_name: signupName,
        email: signupEmail,
        password: signupPassword,
      });
      localStorage.setItem('pos_token', response.data.data.token);
      localStorage.setItem('pos_user', JSON.stringify(response.data.data.user));
      setUser(response.data.data.user);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Could not create the account.' });
    } finally {
      setLoginLoading(false);
    }
  }

  async function refreshCatalog() {
    const [productResponse, categoryResponse] = await Promise.all([
      api.get<{ data: Product[] }>('/products'),
      api.get<{ data: { category_id: number; name: string }[] }>('/products/categories'),
    ]);
    setProducts(productResponse.data.data.map(product => ({
      ...product,
      product_id: Number(product.product_id),
      category_id: product.category_id === null ? null : Number(product.category_id),
      quantity: String(product.quantity),
      selling_price: String(product.selling_price),
      cost_price: String(product.cost_price),
    })));
    setCategories(categoryResponse.data.data.map(item => ({
      ...item,
      category_id: Number(item.category_id),
    })));
  }

  function canManageProducts() {
    return user?.role === 'admin' || user?.role === 'manager';
  }

  async function refreshPurchases() {
    setPurchaseLoading(true);
    try {
      const [supplierResponse, orderResponse] = await Promise.all([
        api.get<{ data: Supplier[] }>('/purchases/suppliers'),
        api.get<{ data: PurchaseOrder[] }>('/purchases/orders'),
      ]);
      setSuppliers(supplierResponse.data.data.map(item => ({ ...item, supplier_id: Number(item.supplier_id) })));
      setPurchaseOrders(orderResponse.data.data.map(item => ({
        ...item,
        purchase_order_id: Number(item.purchase_order_id),
        total_cost: String(item.total_cost),
        item_quantity: String(item.item_quantity),
        received_quantity: String(item.received_quantity),
      })));
    } catch {
      setNotice({ type: 'error', text: 'Could not load purchasing data.' });
    } finally {
      setPurchaseLoading(false);
    }
  }

  async function saveSupplier(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!supplierForm.name.trim()) {
      setNotice({ type: 'error', text: 'Enter a supplier name before adding the supplier.' });
      return;
    }
    try {
      const response = await api.post<{ data: Supplier }>('/purchases/suppliers', supplierForm);
      const supplier = { ...response.data.data, supplier_id: Number(response.data.data.supplier_id) };
      setSuppliers(current => [...current, supplier].sort((a, b) => a.name.localeCompare(b.name)));
      setPurchaseSupplier(String(supplier.supplier_id));
      setSupplierForm({ name: '', contact_name: '', email: '', phone: '' });
      setNotice({ type: 'success', text: 'Supplier saved.' });
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Could not save supplier.' });
    }
  }

  async function savePurchaseOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!purchaseSupplier || !purchaseProduct) {
      setNotice({ type: 'error', text: 'Select a supplier and product.' });
      return;
    }
    try {
      await api.post('/purchases/orders', {
        supplier_id: Number(purchaseSupplier),
        items: [{ product_id: Number(purchaseProduct), ordered_quantity: Number(purchaseQuantity), unit_cost: Number(purchaseUnitCost) }],
      });
      setNotice({ type: 'success', text: 'Purchase order created.' });
      setPurchaseProduct('');
      setPurchaseQuantity('1');
      setPurchaseUnitCost('');
      await refreshPurchases();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Could not create purchase order.' });
    }
  }

  async function openPurchaseOrder(id: number) {
    try {
      const response = await api.get<{ data: PurchaseOrderDetail }>(`/purchases/orders/${id}`);
      setSelectedPurchaseOrder(response.data.data);
      setReceiving(Object.fromEntries(response.data.data.items.map(item => [item.purchase_order_item_id, item.remaining_quantity > 0 ? String(item.remaining_quantity) : '0'])));
    } catch {
      setNotice({ type: 'error', text: 'Could not load purchase order.' });
    }
  }

  async function receivePurchaseOrder() {
    if (!selectedPurchaseOrder) return;
    const items = selectedPurchaseOrder.items.map(item => ({
      purchase_order_item_id: item.purchase_order_item_id,
      quantity: Number(receiving[item.purchase_order_item_id] || 0),
    })).filter(item => item.quantity > 0);
    if (!items.length) {
      setNotice({ type: 'error', text: 'Enter at least one quantity to receive.' });
      return;
    }
    try {
      await api.post(`/purchases/orders/${selectedPurchaseOrder.purchase_order_id}/receive`, { items });
      setNotice({ type: 'success', text: 'Goods received and inventory updated.' });
      setSelectedPurchaseOrder(null);
      await Promise.all([refreshPurchases(), refreshInventory(), refreshCatalog()]);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Could not receive goods.' });
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductSaving(true);
    try {
      await api.post<{ data: Product }>('/products', {
        name: productForm.name,
        barcode: productForm.barcode,
        category_id: Number(productForm.category_id),
        cost_price: Number(productForm.cost_price),
        selling_price: Number(productForm.selling_price),
        initial_quantity: Number(productForm.initial_quantity),
        reorder_level: Number(productForm.reorder_level),
        active: true,
      });
      setProductFormOpen(false);
      setProductForm({ name: '', barcode: '', category_id: '', cost_price: '', selling_price: '', initial_quantity: '0', reorder_level: '10' });
      setNotice({ type: 'success', text: 'Product added successfully.' });
      await refreshCatalog();
    } catch (error) {
      const responseData = (error as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } }).response?.data;
      const validationError = responseData?.errors?.[0];
      setNotice({ type: 'error', text: validationError ? `${validationError.field}: ${validationError.message}` : responseData?.message ?? 'Could not add product.' });
    } finally {
      setProductSaving(false);
    }
  }

  async function importProductsFromCsv() {
    const file = csvFile;
    if (!file) return;
    setCsvImporting(true);
    try {
      const csv = await file.text();
      const response = await api.post<{ message: string }>('/products/import-csv', csv, {
        headers: { 'Content-Type': 'text/csv', 'X-File-Name': file.name },
      });
      setNotice({ type: 'success', text: response.data.message });
      setCsvPortalOpen(false);
      setCsvFile(null);
      await refreshCatalog();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Could not import products.' });
    } finally {
      setCsvImporting(false);
    }

  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Remove "${product.name}" from the active catalog?`)) return;
    try {
      await api.delete(`/products/${product.product_id}`);
      setCart(current => current.filter(item => item.product_id !== product.product_id));
      setNotice({ type: 'success', text: `${product.name} was removed from the catalog.` });
      await refreshCatalog();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Could not remove product.' });
    }
  }

  function downloadCsvTemplate() {
    const content = 'name,barcode,category,cost_price,selling_price,initial_quantity,reorder_level,active\nExample Product,20000001,Snacks,100.00,150.00,25,5,true\n';
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function openSettings() {
    setSettingsOpen(true);
    setSettingsLoading(true);
    try {
      const [settingsResponse, suppliersResponse] = await Promise.all([
        api.get<{ data: ShopSettings }>('/settings'),
        api.get<{ data: Supplier[] }>('/purchases/suppliers'),
      ]);
      setShopSettings({
        ...settingsResponse.data.data,
        branch_id: Number(settingsResponse.data.data.branch_id),
        default_reorder_level: Number(settingsResponse.data.data.default_reorder_level),
      });
      setSuppliers(suppliersResponse.data.data.map(item => ({
        ...item,
        supplier_id: Number(item.supplier_id),
      })));
    } catch (error) {
      const responseData = (error as {
        response?: { data?: { message?: string } };
      }).response?.data;
      setNotice({
        type: 'error',
        text: responseData?.message ?? 'Could not load shop settings.',
      });
    } finally {
      setSettingsLoading(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shopSettings) return;
    setSettingsSaving(true);
    try {
      const response = await api.put<{ data: ShopSettings }>('/settings', {
        name: shopSettings.name,
        address: shopSettings.address,
        phone: shopSettings.phone,
        email: shopSettings.email,
        tax_id: shopSettings.tax_id,
        currency: shopSettings.currency,
        receipt_footer: shopSettings.receipt_footer,
        default_reorder_level: Number(shopSettings.default_reorder_level),
      });
      setShopSettings({
        ...response.data.data,
        branch_id: Number(response.data.data.branch_id),
        default_reorder_level: Number(response.data.data.default_reorder_level),
      });
      setSettingsOpen(false);
      setNotice({ type: 'success', text: 'Shop settings saved successfully.' });
    } catch (error) {
      const responseData = (error as {
        response?: { data?: { message?: string; errors?: { field: string; message: string }[] } };
      }).response?.data;
      const validationError = responseData?.errors?.[0];
      setNotice({
        type: 'error',
        text: validationError ? `${validationError.field}: ${validationError.message}` : responseData?.message ?? 'Could not save shop settings.',
      });
    } finally {
      setSettingsSaving(false);
    }
  }

  async function refreshInventory() {
    setInventoryLoading(true);
    try {
      const response = await api.get<{ data: InventoryItem[] }>('/inventory', {
        params: { search: inventorySearch || undefined, low_stock: lowStockOnly },
      });
      setInventory(response.data.data.map(item => ({
        ...item,
        inventory_id: Number(item.inventory_id),
        product_id: Number(item.product_id),
        quantity: String(item.quantity),
        reorder_level: String(item.reorder_level),
      })));
    } catch {
      setNotice({ type: 'error', text: 'Could not load inventory.' });
    } finally {
      setInventoryLoading(false);
    }
  }

  async function refreshBranches() {
    setBranchLoading(true);
    try {
      const response = await api.get<{ data: Branch[] }>('/branches');
      const result = response.data.data.map(branch => ({ ...branch, branch_id: Number(branch.branch_id) }));
      setBranches(result);
      setSelectedBranchId(current => current || String(result[0]?.branch_id ?? ''));
      setTransferDestinationId(current => current || String(result.find(branch => branch.branch_id !== user?.branchId)?.branch_id ?? ''));
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Could not load branches.' });
    } finally {
      setBranchLoading(false);
    }
  }

  async function refreshBranchUsers(branchId: string) {
    if (!branchId) {
      setBranchUsers([]);
      return;
    }
    try {
      const response = await api.get<{ data: BranchUser[] }>(`/branches/${branchId}/users`);
      setBranchUsers(response.data.data);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Could not load branch users.' });
    }
  }

  async function saveBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await api.post<{ data: Branch }>('/branches', branchForm);
      const branch = { ...response.data.data, branch_id: Number(response.data.data.branch_id) };
      setBranches(current => [...current, branch].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedBranchId(String(branch.branch_id));
      setBranchForm({ name: '', address: '' });
      setNotice({ type: 'success', text: `${branch.name} created.` });
    } catch (error) {
      const responseData = (error as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } }).response?.data;
      setNotice({ type: 'error', text: responseData?.errors?.[0]?.message ?? responseData?.message ?? 'Could not create branch.' });
    }
  }

  async function saveBranchUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBranchId) return;
    try {
      await api.post(`/branches/${selectedBranchId}/users`, branchUserForm);
      setNotice({ type: 'success', text: 'Branch user created.' });
      setBranchUserForm({ full_name: '', email: '', password: '', role: 'cashier' });
      await refreshBranchUsers(selectedBranchId);
    } catch (error) {
      const responseData = (error as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } }).response?.data;
      setNotice({ type: 'error', text: responseData?.errors?.[0]?.message ?? responseData?.message ?? 'Could not create branch user.' });
    }
  }

  async function refreshStockTransfers() {
    setTransferLoading(true);
    try {
      const response = await api.get<{ data: StockTransfer[] }>('/inventory/transfers');
      setStockTransfers(response.data.data.map(item => ({ ...item, transfer_id: Number(item.transfer_id) })));
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Could not load stock transfers.' });
    } finally {
      setTransferLoading(false);
    }
  }

  async function submitStockTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!transferDestinationId || !transferProductId) {
      setNotice({ type: 'error', text: 'Choose a destination branch and product.' });
      return;
    }
    setTransferSaving(true);
    try {
      await api.post('/inventory/transfers', {
        destination_branch_id: Number(transferDestinationId),
        items: [{ product_id: Number(transferProductId), quantity: Number(transferQuantity) }],
        note: transferNote.trim() || undefined,
      });
      setNotice({ type: 'success', text: 'Stock transfer completed.' });
      setTransferProductId('');
      setTransferQuantity('1');
      setTransferNote('');
      await Promise.all([refreshStockTransfers(), refreshInventory(), refreshCatalog()]);
    } catch (error) {
      const responseData = (error as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } }).response?.data;
      setNotice({ type: 'error', text: responseData?.errors?.[0]?.message ?? responseData?.message ?? 'Could not transfer stock.' });
    } finally {
      setTransferSaving(false);
    }
  }

  async function refreshSales() {
    setSalesLoading(true);
    try {
      const response = await api.get<{ data: SaleRecord[] }>('/sales', {
        params: {
          search: salesSearch || undefined,
          payment_method: salesPaymentMethod,
        },
      });
      setSales(response.data.data);
    } catch {
      setNotice({ type: 'error', text: 'Could not load sales history.' });
    } finally {
      setSalesLoading(false);
    }
  }

  async function searchReturnReceipt(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const receiptId = Number(returnReceiptId);
    if (!Number.isInteger(receiptId) || receiptId <= 0) {
      setNotice({ type: 'error', text: 'Enter a valid receipt number.' });
      return;
    }
    setReturnLoading(true);
    setReturnSale(null);
    try {
      const response = await api.get<{ data: ReturnableSale }>(`/returns/receipts/${receiptId}`);
      setReturnSale(response.data.data);
      setReturnQuantities({});
      setReturnReason('');
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Could not find that receipt.' });
    } finally {
      setReturnLoading(false);
    }
  }

  async function submitReturn() {
    if (!returnSale) return;
    const items = returnSale.items
      .map(item => ({ sale_item_id: item.sale_item_id, quantity: Number(returnQuantities[item.sale_item_id] || 0) }))
      .filter(item => Number.isFinite(item.quantity) && item.quantity > 0);
    if (!items.length) {
      setNotice({ type: 'error', text: 'Enter a return quantity greater than 0 for at least one item.' });
      return;
    }
    if (!returnReason.trim()) {
      setNotice({ type: 'error', text: 'Enter a refund reason before recording the return.' });
      return;
    }
    setReturnSubmitting(true);
    try {
      const saleForBill = returnSale;
      const response = await api.post<{ data: ReturnResult }>('/returns', {
        sale_id: returnSale.sale_id,
        items,
        reason: returnReason.trim(),
      });
      setNotice({ type: 'success', text: `Return recorded. Refund: ${money(Number(response.data.data.refund_amount))}` });
      printReturnBill(response.data.data, saleForBill);
      await searchReturnReceipt();
    } catch (error) {
      const responseData = (error as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } }).response?.data;
      const validationError = responseData?.errors?.[0];
      setNotice({ type: 'error', text: validationError ? `${validationError.field}: ${validationError.message}` : responseData?.message ?? 'Could not record return.' });
    } finally {
      setReturnSubmitting(false);
    }
  }

  async function refreshDashboard() {
    setDashboardLoading(true);
    try {
      const response = await api.get<{ data: DashboardData }>('/dashboard');
      setDashboard(response.data.data);
    } catch {
      setNotice({ type: 'error', text: 'Could not load dashboard.' });
    } finally {
      setDashboardLoading(false);
    }
  }

  async function refreshManagementReports() {
    if (reportFrom > reportTo) {
      setNotice({ type: 'error', text: 'The report start date must be on or before the end date.' });
      return;
    }
    setReportsLoading(true);
    try {
      const response = await api.get<{ data: ManagementReports }>('/reports', {
        params: { from: reportFrom, to: reportTo, group_by: reportGroup },
      });
      setManagementReports(response.data.data);
    } catch {
      setNotice({ type: 'error', text: 'Could not load management reports.' });
    } finally {
      setReportsLoading(false);
    }
  }

  useEffect(() => {
    // Dashboard data is refreshed whenever its view becomes active.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (view === 'dashboard') void refreshDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (view === 'branches' || view === 'transfers') void refreshBranches();
    if (view === 'transfers') void refreshStockTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (view === 'branches' && selectedBranchId) void refreshBranchUsers(selectedBranchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedBranchId]);

  useEffect(() => {
    if (!user) return;
    // The initial request synchronizes the client with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCatalog()
      .catch(() => setNotice({ type: 'error', text: 'Could not connect to the POS server.' }))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    // Inventory filters are persisted by fetching the matching server view.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (view === 'inventory') void refreshInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, inventorySearch, lowStockOnly]);

  useEffect(() => {
    // Sales filters are synchronized with the server query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (view === 'sales') void refreshSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, salesSearch, salesPaymentMethod]);

  useEffect(() => {
    // Purchasing data is synchronized when its workspace becomes active.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (view === 'purchases') void refreshPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();
    return products.filter(product => {
      const matchesSearch = !term
        || product.name.toLowerCase().includes(term)
        || product.barcode.includes(term);
      const matchesCategory = category === 'all' || Number(product.category_id) === Number(category);
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const total = cart.reduce((sum, item) => sum + Number(item.selling_price) * item.cartQuantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
  const change = Math.max(0, Number(amountPaid || 0) - total);
  const selectedReturnTotal = returnSale?.items.reduce(
    (sum, item) => sum + Math.min(Number(returnQuantities[item.sale_item_id] || 0), item.returnable_quantity) * Number(item.unit_price),
    0,
  ) ?? 0;
  const reportTotals = managementReports ? {
    netSales: managementReports.sales.reduce((sum, item) => sum + Number(item.net_sales), 0),
    estimatedProfit: managementReports.profit.reduce((sum, item) => sum + Number(item.gross_profit_estimate), 0),
    transactions: managementReports.sales.reduce((sum, item) => sum + item.transaction_count, 0),
  } : null;

  async function toggleSaleDetails(saleId: number) {
    if (expandedSaleId === saleId) {
      setExpandedSaleId(null);
      return;
    }
    setExpandedSaleId(saleId);
    if (saleDetails[saleId]) return;
    setSaleDetailLoading(saleId);
    try {
      const response = await api.get<{ data: SaleDetail }>(`/sales/${saleId}`);
      setSaleDetails(current => ({ ...current, [saleId]: response.data.data }));
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Could not load sale details.' });
      setExpandedSaleId(null);
    } finally {
      setSaleDetailLoading(null);
    }
  }

  function printReceipt(
    saleId: number,
    items: { name: string; quantity: number | string; unit_price: number | string; subtotal?: number | string }[],
    paid: number,
    method: PaymentMethod,
    saleTotal: number,
    reference?: string | null,
    cashierName = user?.fullName ?? 'Cashier',
    createdAt = new Date().toISOString(),
  ) {
    const receiptWindow = window.open('', '_blank', 'width=420,height=700');
    if (!receiptWindow) {
      setNotice({ type: 'error', text: 'Allow pop-ups to print the receipt.' });
      return;
    }
    const lines = items.map(item => `<tr><td>${item.name}</td><td>${item.quantity} x ${money(Number(item.unit_price))}</td><td>${money(Number(item.subtotal ?? Number(item.unit_price) * Number(item.quantity)))}</td></tr>`).join('');
    receiptWindow.document.write(`<html><head><title>Receipt #${saleId}</title><style>body{font-family:Arial,sans-serif;width:320px;margin:20px auto;color:#111}h1{text-align:center;font-size:20px}p{text-align:center;font-size:12px}table{width:100%;font-size:11px;border-collapse:collapse}td{padding:5px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right}.total{font-weight:bold;font-size:14px}.meta{text-align:left}</style></head><body><h1>${shopSettings?.name ?? 'Supermarket POS'}</h1><p>Receipt #${saleId}<br>${new Date(createdAt).toLocaleString('en-LK')}<br>Cashier: ${cashierName}</p><table>${lines}</table><p class="total">Total: ${money(saleTotal)}<br>Paid: ${money(paid)}<br>Method: ${method}<br>${reference ? `Reference: ${reference}<br>` : ''}Change: ${money(Math.max(0, paid - saleTotal))}</p><p>${shopSettings?.receipt_footer ?? 'Thank you for shopping with us!'}</p></body></html>`);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  }

  function printReturnBill(returnResult: ReturnResult, sale: ReturnableSale) {
    const receiptWindow = window.open('', '_blank', 'width=420,height=700');
    if (!receiptWindow) {
      setNotice({ type: 'error', text: 'Allow pop-ups to print the return bill.' });
      return;
    }
    const items = returnResult.items.map(returnItem => {
      const saleItem = sale.items.find(item => item.sale_item_id === returnItem.sale_item_id);
      return `<tr><td>${saleItem?.name ?? 'Returned item'}</td><td>${returnItem.quantity}</td><td>${money(returnItem.refund)}</td></tr>`;
    }).join('');
    receiptWindow.document.write(`<html><head><title>Return #${returnResult.return_id}</title><style>body{font-family:Arial,sans-serif;width:320px;margin:20px auto;color:#111}h1{text-align:center;font-size:20px}p{text-align:center;font-size:12px}table{width:100%;font-size:11px;border-collapse:collapse}td{padding:5px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right}.total{font-weight:bold;font-size:14px}.reason{text-align:left}</style></head><body><h1>${shopSettings?.name ?? 'Supermarket POS'}</h1><p>Return bill #${returnResult.return_id}<br>Original receipt #${sale.sale_id}<br>${new Date(returnResult.created_at).toLocaleString('en-LK')}<br>Processed by: ${user?.fullName ?? 'Cashier'}</p><table><tr><th>Item</th><th>Qty</th><th>Refund</th></tr>${items}</table><p class="total">Refund total: ${money(Number(returnResult.refund_amount))}<br>Refund method: ${returnResult.refund_method === 'bank_transfer' ? 'Bank transfer' : returnResult.refund_method[0].toUpperCase() + returnResult.refund_method.slice(1)}</p><p class="reason">Reason: ${returnResult.reason}</p><p>${shopSettings?.receipt_footer ?? 'Thank you for shopping with us!'}</p></body></html>`);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  }

  function addToCart(product: Product) {
    setNotice(null);
    setCart(current => {
      const existing = current.find(item => item.product_id === product.product_id);
      if (existing) {
        if (existing.cartQuantity >= Number(product.quantity)) return current;
        return current.map(item => item.product_id === product.product_id
          ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      return [...current, { ...product, cartQuantity: 1 }];
    });
  }

  function updateQuantity(productId: number, delta: number) {
    setCart(current => current
      .map(item => item.product_id === productId
        ? { ...item, cartQuantity: Math.min(Number(item.quantity), item.cartQuantity + delta) }
        : item)
      .filter(item => item.cartQuantity > 0));
  }

  async function completeSale() {
    const parsedAmountPaid = parseAmount(amountPaid);
    if (!cart.length || parsedAmountPaid === null) {
      setNotice({ type: 'error', text: 'Enter a valid payment amount.' });
      return;
    }
    if (parsedAmountPaid < total || (paymentMethod !== 'cash' && parsedAmountPaid !== total)) {
      setNotice({ type: 'error', text: 'Cash received must cover the sale total.' });
      return;
    }
    if (paymentMethod !== 'cash' && !paymentReference.trim()) {
      setNotice({ type: 'error', text: 'Enter a payment reference for this payment.' });
      return;
    }
    setCheckingOut(true);
    setNotice(null);
    try {
      const response = await api.post<{ data: { sale_id: number; change: number } }>('/sales', {
        items: cart.map(item => ({ product_id: Number(item.product_id), quantity: item.cartQuantity })),
        payment_method: paymentMethod,
        amount_paid: parsedAmountPaid,
        payment_reference: paymentReference.trim() || undefined,
      });
      const completedItems = [...cart];
      setNotice({
        type: 'success',
        text: `Sale #${response.data.data.sale_id} completed. Change: ${money(response.data.data.change)}`,
      });
      printReceipt(response.data.data.sale_id, completedItems.map(item => ({
        name: item.name,
        quantity: item.cartQuantity,
        unit_price: item.selling_price,
      })), parsedAmountPaid, paymentMethod, total, paymentReference);
      setCart([]);
      setAmountPaid('');
      setPaymentReference('');
      await refreshCatalog();
      if (view === 'inventory') await refreshInventory();
    } catch (error) {
      const responseData = (error as {
        response?: { data?: { message?: string; errors?: { field: string; message: string }[] } };
      }).response?.data;
      const validationError = responseData?.errors?.[0];
      const message = validationError
        ? `${validationError.field || 'Payment'}: ${validationError.message}`
        : responseData?.message;
      setNotice({ type: 'error', text: message ?? 'Checkout failed. Please try again.' });
    } finally {
      setCheckingOut(false);
    }

  }

  async function submitAdjustment(productId: number) {
    const quantityDelta = Number(adjustment);
    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
      setNotice({ type: 'error', text: 'Enter a non-zero quantity adjustment.' });
      return;
    }

    try {
      await api.post('/inventory/adjustments', {
        product_id: productId,
        quantity_delta: quantityDelta,
        reason: adjustmentReason,
        note: adjustmentNote.trim() || undefined,
      });
      setNotice({ type: 'success', text: 'Inventory updated successfully.' });
      setAdjustingProductId(null);
      setAdjustmentNote('');
      await Promise.all([refreshInventory(), refreshCatalog()]);
    } catch (error) {
      const responseData = (error as {
        response?: { data?: { message?: string; errors?: { field: string; message: string }[] } };
      }).response?.data;
      const validationError = responseData?.errors?.[0];
      setNotice({
        type: 'error',
        text: validationError
          ? `${validationError.field || 'Adjustment'}: ${validationError.message}`
          : responseData?.message ?? 'Inventory update failed.',
      });
    }
  }

  if (!user) return <div className="login-page"><form className="login-card" onSubmit={event => void (signupMode ? signup(event) : login(event))}><div className="brand"><div className="brand-mark"><ShoppingCart size={20} /></div><span>Market<span className="brand-accent">Flow</span></span></div><h1>{signupMode ? 'Create your POS account' : 'Sign in to POS'}</h1>{signupMode ? <><label>Full name<input value={signupName} onChange={event => setSignupName(event.target.value)} required /></label><label>Email<input type="email" value={signupEmail} onChange={event => setSignupEmail(event.target.value)} required /></label><label>Password<input type="password" value={signupPassword} onChange={event => setSignupPassword(event.target.value)} minLength={8} required /></label><label>Confirm password<input type="password" value={signupConfirmPassword} onChange={event => setSignupConfirmPassword(event.target.value)} minLength={8} required /></label></> : <><label>Email<input type="email" value={loginEmail} onChange={event => setLoginEmail(event.target.value)} required /></label><label>Password<input type="password" value={loginPassword} onChange={event => setLoginPassword(event.target.value)} required /></label></>}{notice && <div className="notice error">{notice.text}</div>}<button className="complete-button" disabled={loginLoading}>{loginLoading ? (signupMode ? 'Creating account...' : 'Signing in...') : (signupMode ? 'Create account' : 'Sign in')}</button><button type="button" className="text-button login-switch" onClick={() => { setSignupMode(!signupMode); setNotice(null); }}>{signupMode ? 'Already have an account? Sign in' : 'First time here? Create an account'}</button>{!signupMode && <small>Demo cashier: cashier@supermarket.local / password</small>}<small>New accounts are created as cashier accounts.</small></form></div>;

  return (
    <div className="pos-app">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><ShoppingCart size={20} /></div><span>Market<span className="brand-accent">Flow</span></span></div>
        <div className="store-status"><span className="status-dot" /> {shopSettings?.name ?? user.branchName ?? 'Main Branch'} <span className="status-divider" /> Register 01</div>
        <div className="user-menu"><button className="settings-trigger" onClick={() => void openSettings()} aria-label="Open shop settings"><Settings size={17} /></button><div className="avatar">{user.fullName.slice(0, 2).toUpperCase()}</div><span>{user.fullName}</span><button className="text-button" onClick={() => { localStorage.clear(); setUser(null); }}>Sign out</button></div>
      </header>

      <div className={`layout ${view === 'checkout' ? 'checkout-layout' : 'workspace-layout'}`}>
        <aside className="sidebar">
          <nav>
            <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}><BarChart3 size={18} /> Dashboard</button>
            {canManageProducts() && <button className={`nav-item ${view === 'reports' ? 'active' : ''}`} onClick={() => { setView('reports'); void refreshManagementReports(); }}><FileText size={18} /> Reports</button>}
            <button className={`nav-item ${view === 'checkout' ? 'active' : ''}`} onClick={() => setView('checkout')}><LayoutDashboard size={18} /> Checkout</button>
            <button className={`nav-item ${view === 'inventory' ? 'active' : ''}`} onClick={() => setView('inventory')}><Package size={18} /> Inventory</button>
            <button className={`nav-item ${view === 'sales' ? 'active' : ''}`} onClick={() => setView('sales')}><Receipt size={18} /> Sales history</button>
            <button className={`nav-item ${view === 'returns' ? 'active' : ''}`} onClick={() => setView('returns')}><RotateCcw size={18} /> Returns</button>
            {canManageProducts() && <button className={`nav-item ${view === 'purchases' ? 'active' : ''}`} onClick={() => setView('purchases')}><Truck size={18} /> Purchasing</button>}
            {canManageProducts() && <button className={`nav-item ${view === 'transfers' ? 'active' : ''}`} onClick={() => setView('transfers')}><ArrowLeftRight size={18} /> Stock transfers</button>}
            {user.role === 'admin' && <button className={`nav-item ${view === 'branches' ? 'active' : ''}`} onClick={() => setView('branches')}><Building2 size={18} /> Branches & users</button>}
          </nav>
          <div className="sidebar-footer">v1.0.0 <span>●</span> System online</div>
        </aside>

        <main className="workspace">
          <div className="page-heading"><div><p className="eyebrow">{view === 'dashboard' ? 'OVERVIEW' : view === 'checkout' ? 'POINT OF SALE' : view === 'inventory' || view === 'transfers' ? 'STOCK CONTROL' : view === 'returns' ? 'CUSTOMER SERVICE' : view === 'purchases' ? 'SUPPLY CHAIN' : view === 'reports' || view === 'branches' ? 'MANAGEMENT' : 'REPORTING'}</p><h1>{view === 'dashboard' ? 'Dashboard' : view === 'checkout' ? 'New transaction' : view === 'inventory' ? 'Inventory' : view === 'returns' ? 'Returns & refunds' : view === 'purchases' ? 'Supplier & purchasing' : view === 'reports' ? 'Reports' : view === 'branches' ? 'Branches & users' : view === 'transfers' ? 'Stock transfers' : 'Sales history'}</h1></div><div className="date-label">{new Date().toLocaleDateString('en-LK', { weekday: 'long', month: 'short', day: 'numeric' })}</div></div>
          {notice && <div className={`notice ${notice.type}`}><span>{notice.type === 'success' ? <CheckCircle2 size={18} /> : '!'}</span>{notice.text}</div>}

          {view === 'branches' ? <div className="dashboard-content">
            <section className="panel dashboard-panel">
              <div className="panel-heading"><div><h2>Branches</h2><p>Create locations to track separate inventory and staff</p></div><button className="icon-button" onClick={() => void refreshBranches()} aria-label="Refresh branches"><RefreshCw size={16} /></button></div>
              <form className="catalog-controls" onSubmit={event => void saveBranch(event)}>
                <input value={branchForm.name} onChange={event => setBranchForm({ ...branchForm, name: event.target.value })} placeholder="Branch name" minLength={2} maxLength={100} required />
                <input value={branchForm.address} onChange={event => setBranchForm({ ...branchForm, address: event.target.value })} placeholder="Address (optional)" />
                <button className="small-button">Create branch</button>
              </form>
              {branchLoading ? <div className="dashboard-empty">Loading branches...</div> : <div className="inventory-list">{branches.map(branch => <div className="inventory-row" key={branch.branch_id}><div><strong>{branch.name}</strong><span>{branch.address || 'No address recorded'}</span></div><strong>{branch.branch_id === user.branchId ? 'Your branch' : ''}</strong></div>)}</div>}
            </section>
            <section className="panel dashboard-panel">
              <div className="panel-heading"><div><h2>Branch users</h2><p>Create manager and cashier accounts assigned to one branch</p></div></div>
              <div className="catalog-controls">
                <select value={selectedBranchId} onChange={event => { setSelectedBranchId(event.target.value); void refreshBranchUsers(event.target.value); }} aria-label="Select branch">
                  <option value="">Select branch</option>{branches.map(branch => <option key={branch.branch_id} value={branch.branch_id}>{branch.name}</option>)}
                </select>
              </div>
              <form className="catalog-controls" onSubmit={event => void saveBranchUser(event)}>
                <input value={branchUserForm.full_name} onChange={event => setBranchUserForm({ ...branchUserForm, full_name: event.target.value })} placeholder="Full name" minLength={2} required />
                <input type="email" value={branchUserForm.email} onChange={event => setBranchUserForm({ ...branchUserForm, email: event.target.value })} placeholder="Email" required />
                <input type="password" value={branchUserForm.password} onChange={event => setBranchUserForm({ ...branchUserForm, password: event.target.value })} placeholder="Password (8+ characters)" minLength={8} required />
                <select value={branchUserForm.role} onChange={event => setBranchUserForm({ ...branchUserForm, role: event.target.value as 'manager' | 'cashier' })}><option value="cashier">Cashier</option><option value="manager">Manager</option></select>
                <button className="small-button" disabled={!selectedBranchId}>Create user</button>
              </form>
              <div className="inventory-list">{branchUsers.map(branchUser => <div className="inventory-row" key={branchUser.user_id}><div><strong>{branchUser.full_name}</strong><span>{branchUser.email}</span></div><span className="payment-badge">{branchUser.role}</span></div>)}{!branchUsers.length && !branchLoading && <div className="empty-state">No users are assigned to this branch yet.</div>}</div>
            </section>
          </div> : view === 'transfers' ? <section className="catalog-panel panel">
            <div className="panel-heading"><div><h2>Transfer stock</h2><p>Move available stock from {user.branchName} to another branch</p></div><button className="icon-button" onClick={() => void refreshStockTransfers()} aria-label="Refresh transfers"><RefreshCw size={16} /></button></div>
            <form className="catalog-controls" onSubmit={event => void submitStockTransfer(event)}>
              <select value={transferDestinationId} onChange={event => setTransferDestinationId(event.target.value)} required>
                <option value="">Destination branch</option>{branches.filter(branch => branch.branch_id !== user.branchId).map(branch => <option key={branch.branch_id} value={branch.branch_id}>{branch.name}</option>)}
              </select>
              <select value={transferProductId} onChange={event => setTransferProductId(event.target.value)} required>
                <option value="">Product</option>{products.filter(product => Number(product.quantity) > 0).map(product => <option key={product.product_id} value={product.product_id}>{product.name} ({product.quantity} available)</option>)}
              </select>
              <input type="number" min="0.001" step="0.001" value={transferQuantity} onChange={event => setTransferQuantity(event.target.value)} aria-label="Transfer quantity" required />
              <input value={transferNote} onChange={event => setTransferNote(event.target.value)} placeholder="Note (optional)" maxLength={500} />
              <button className="small-button" disabled={transferSaving || !branches.some(branch => branch.branch_id !== user.branchId)}>{transferSaving ? 'Transferring...' : 'Transfer stock'}</button>
            </form>
            <div className="panel-heading"><div><h2>Recent transfers</h2><p>Transfers sent from or received by this branch</p></div></div>
            {transferLoading ? <div className="dashboard-empty">Loading transfers...</div> : <div className="inventory-list">{stockTransfers.map(transfer => <div className="inventory-row" key={transfer.transfer_id}><div><strong>#{transfer.transfer_id} · {transfer.source_branch} → {transfer.destination_branch}</strong><span>{transfer.items.map(item => `${item.product_name}: ${item.quantity}`).join(' · ')}{transfer.note ? ` · ${transfer.note}` : ''}</span></div><div className="stock-value"><strong>{transfer.transferred_by}</strong><span>{new Date(transfer.created_at).toLocaleString('en-LK')}</span></div></div>)}{!stockTransfers.length && <div className="empty-state">No stock transfers recorded yet.</div>}</div>}
          </section> : view === 'purchases' ? <section className="catalog-panel panel">
            <div className="panel-heading"><div><h2>Supplier records</h2><p>Maintain suppliers and track purchase costs</p></div><button className="icon-button" onClick={() => void refreshPurchases()} aria-label="Refresh purchasing"><RefreshCw size={16} /></button></div>
            {purchaseLoading && <div className="dashboard-empty">Loading purchasing data...</div>}
            {!purchaseLoading && <><form className="catalog-controls" onSubmit={event => void savePurchaseOrder(event)}><select value={purchaseSupplier} onChange={event => setPurchaseSupplier(event.target.value)} required><option value="">Supplier</option>{suppliers.map(supplier => <option key={supplier.supplier_id} value={supplier.supplier_id}>{supplier.name}</option>)}</select><select value={purchaseProduct} onChange={event => { setPurchaseProduct(event.target.value); const product = products.find(item => item.product_id === Number(event.target.value)); setPurchaseUnitCost(product?.cost_price ?? ''); }} required><option value="">Product</option>{products.map(product => <option key={product.product_id} value={product.product_id}>{product.name}</option>)}</select><input type="number" min="0.001" step="0.001" value={purchaseQuantity} onChange={event => setPurchaseQuantity(event.target.value)} aria-label="Order quantity" /><input type="number" min="0" step="0.01" value={purchaseUnitCost} onChange={event => setPurchaseUnitCost(event.target.value)} placeholder="Unit cost" aria-label="Unit cost" required /><button className="small-button">Create purchase order</button></form>
              <div className="inventory-list">{purchaseOrders.map(order => <div className="inventory-row" key={order.purchase_order_id}><div><strong>PO #{order.purchase_order_id} · {order.supplier_name}</strong><span>{order.status} · {order.item_quantity} units · {money(Number(order.total_cost))}</span></div><div className="stock-value"><strong>{order.received_quantity} received</strong><span>{order.order_date}</span></div><button className="small-button" onClick={() => void openPurchaseOrder(order.purchase_order_id)}>View / receive</button></div>)}{!purchaseOrders.length && <div className="empty-state">No purchase orders yet.</div>}</div>
              {selectedPurchaseOrder && <div className="panel" style={{ marginTop: 18, padding: 18 }}><div className="panel-heading"><div><h2>Receive PO #{selectedPurchaseOrder.purchase_order_id}</h2><p>{selectedPurchaseOrder.supplier_name}</p></div><button className="text-button" onClick={() => setSelectedPurchaseOrder(null)}>Close</button></div>{selectedPurchaseOrder.items.map(item => <div className="inventory-row" key={item.purchase_order_item_id}><div><strong>{item.product_name}</strong><span>{item.ordered_quantity} ordered · {item.remaining_quantity} remaining · {money(Number(item.unit_cost))} each</span></div><input type="number" min="0" max={item.remaining_quantity} step="0.001" value={receiving[item.purchase_order_item_id] ?? '0'} onChange={event => setReceiving(current => ({ ...current, [item.purchase_order_item_id]: event.target.value }))} aria-label={`Receive ${item.product_name}`} /><span /><button className="small-button" onClick={() => void receivePurchaseOrder()}>Receive goods</button></div>)}</div>}
            </>}
          </section> : view === 'dashboard' ? <section className="dashboard-content">
            {dashboardLoading && <div className="panel dashboard-empty">Loading dashboard...</div>}
            {!dashboardLoading && dashboard && <><div className="dashboard-cards">
              <div className="dashboard-card"><span className="dashboard-card-icon sales"><TrendingUp size={18} /></span><div><span>Today's sales</span><strong>{money(Number(dashboard.summary.total_sales))}</strong></div></div>
              <div className="dashboard-card"><span className="dashboard-card-icon profit"><BarChart3 size={18} /></span><div><span>Today's profit</span><strong>{money(Number(dashboard.summary.total_profit))}</strong></div></div>
              <div className="dashboard-card"><span className="dashboard-card-icon transactions"><Receipt size={18} /></span><div><span>Transactions</span><strong>{dashboard.summary.transaction_count}</strong></div></div>
            </div><div className="dashboard-grid">
                <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Payment totals</h2><p>Collected today by payment method</p></div><button className="icon-button" onClick={() => void refreshDashboard()} aria-label="Refresh dashboard"><RefreshCw size={16} /></button></div><div className="payment-total-list"><div><Banknote size={18} /><span>Cash</span><strong>{money(Number(dashboard.payments.cash))}</strong></div><div><CreditCard size={18} /><span>Card</span><strong>{money(Number(dashboard.payments.card))}</strong></div><div><WalletCards size={18} /><span>Bank transfer</span><strong>{money(Number(dashboard.payments.bank_transfer))}</strong></div></div></section>
                <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Low-stock products</h2><p>Items at or below reorder level</p></div><TrendingDown size={18} className="dashboard-warning" /></div>{!dashboard.low_stock.length ? <div className="dashboard-list-empty">All products are sufficiently stocked.</div> : <div className="dashboard-list">{dashboard.low_stock.map(item => <div key={item.product_id}><div><strong>{item.name}</strong><span>{item.barcode}</span></div><b className="dashboard-stock-warning">{item.quantity} / {item.reorder_level}</b></div>)}</div>}</section>
                <section className="panel dashboard-panel dashboard-best-selling"><div className="panel-heading"><div><h2>Best-selling products</h2><p>Top products sold today</p></div><TrendingUp size={18} className="dashboard-success" /></div>{!dashboard.best_selling.length ? <div className="dashboard-list-empty">No sales recorded today.</div> : <div className="dashboard-list">{dashboard.best_selling.map((item, index) => <div key={item.product_id}><div><strong><span className="rank">{index + 1}</span>{item.name}</strong><span>{money(Number(item.sales_amount))} in sales</span></div><b>{item.quantity_sold} sold</b></div>)}</div>}</section>
              </div></>}
          </section> : view === 'reports' ? <section className="reports-content">
            <div className="report-toolbar panel">
              <label>From<input type="date" value={reportFrom} max={reportTo} onChange={event => setReportFrom(event.target.value)} /></label>
              <label>To<input type="date" value={reportTo} min={reportFrom} onChange={event => setReportTo(event.target.value)} /></label>
              <label>Group by<select value={reportGroup} onChange={event => setReportGroup(event.target.value as typeof reportGroup)}><option value="day">Day</option><option value="month">Month</option></select></label>
              <button className="small-button report-run" onClick={() => void refreshManagementReports()} disabled={reportsLoading}><RefreshCw size={14} />{reportsLoading ? 'Loading...' : 'Run report'}</button>
            </div>
            {reportsLoading && <div className="panel report-empty">Loading reports...</div>}
            {!reportsLoading && !managementReports && <div className="panel report-empty">No report data loaded for this period.</div>}
            {!reportsLoading && managementReports && reportTotals && <>
              <div className="dashboard-cards report-summary">
                <div className="dashboard-card"><span className="dashboard-card-icon sales"><TrendingUp size={18} /></span><div><span>Net sales</span><strong>{money(reportTotals.netSales)}</strong></div></div>
                <div className="dashboard-card"><span className="dashboard-card-icon profit"><BarChart3 size={18} /></span><div><span>Estimated profit</span><strong>{money(reportTotals.estimatedProfit)}</strong></div></div>
                <div className="dashboard-card"><span className="dashboard-card-icon transactions"><Receipt size={18} /></span><div><span>Transactions</span><strong>{reportTotals.transactions}</strong></div></div>
              </div>
              <section className="panel report-section">
                <div className="panel-heading"><div><h2>Sales & profit</h2><p>{managementReports.from} to {managementReports.to} · profit uses current product costs</p></div></div>
                <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Period</th><th>Transactions</th><th>Gross sales</th><th>Refunds</th><th>Net sales</th><th>Est. profit</th></tr></thead><tbody>
                  {managementReports.sales.map((row, index) => <tr key={row.period}><td>{row.period}</td><td>{row.transaction_count}</td><td>{money(Number(row.gross_sales))}</td><td>{money(Number(row.refunds))}</td><td>{money(Number(row.net_sales))}</td><td>{money(Number(managementReports.profit[index]?.gross_profit_estimate ?? 0))}</td></tr>)}
                </tbody></table></div>
                <p className="report-note">{managementReports.profit_basis}</p>
              </section>
              <div className="report-grid">
                <section className="panel report-section"><div className="panel-heading"><div><h2>Cashier performance</h2><p>Sales and estimated gross profit by cashier</p></div></div>
                  <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Cashier</th><th>Transactions</th><th>Net sales</th><th>Est. profit</th></tr></thead><tbody>
                    {managementReports.cashiers.map(cashier => <tr key={cashier.user_id}><td>{cashier.cashier}</td><td>{cashier.transaction_count}</td><td>{money(Number(cashier.net_sales))}</td><td>{money(Number(cashier.gross_profit_estimate))}</td></tr>)}
                    {!managementReports.cashiers.length && <tr><td colSpan={4}>No cashier sales in this period.</td></tr>}
                  </tbody></table></div>
                </section>
                <section className="panel report-section"><div className="panel-heading"><div><h2>Inventory valuation</h2><p>Current stock valued at current product prices</p></div></div>
                  <div className="valuation-totals"><div><span>Cost value</span><strong>{money(Number(managementReports.inventory.total_cost_value))}</strong></div><div><span>Retail value</span><strong>{money(Number(managementReports.inventory.total_retail_value))}</strong></div></div>
                  <div className="report-table-wrap report-inventory-table"><table className="report-table"><thead><tr><th>Product</th><th>Qty</th><th>Cost value</th></tr></thead><tbody>
                    {managementReports.inventory.items.map(item => <tr key={item.product_id}><td>{item.name}</td><td>{item.quantity}</td><td>{money(Number(item.cost_value))}</td></tr>)}
                    {!managementReports.inventory.items.length && <tr><td colSpan={3}>No inventory recorded.</td></tr>}
                  </tbody></table></div>
                </section>
              </div>
              <section className="panel report-tax"><div><p className="eyebrow">TAX REPORT</p><h2>Tax calculation is not configured</h2><p>{managementReports.tax_report.message}</p></div><span className="tax-status">Setup required</span></section>
            </>}
          </section> : view === 'checkout' ? <section className="catalog-panel panel">
            <div className="panel-heading"><div><h2>Product catalog</h2><p>Select an item to add it to the current sale</p></div><div className="catalog-actions"><span className="product-count">{filteredProducts.length} products</span>{canManageProducts() && <><button className="small-button" onClick={() => setProductFormOpen(true)}>Manual add</button><button className="small-button secondary-button" onClick={() => setCsvPortalOpen(true)}>Upload CSV</button></>}</div></div>
            <div className="catalog-controls">
              <div className="search-box"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or scan barcode..." /><Barcode size={18} className="muted-icon" /></div>
              <select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(item => <option key={item.category_id} value={item.category_id}>{item.name}</option>)}</select>
            </div>
            <div className="product-grid">
              {loading && <div className="empty-state">Loading catalog...</div>}
              {!loading && !filteredProducts.length && <div className="empty-state">No products match your search.</div>}
              {filteredProducts.map(product => {
                const outOfStock = Number(product.quantity) <= 0;
                return <div className="product-card" key={product.product_id}>
                  <button className="product-card-main" onClick={() => addToCart(product)} disabled={outOfStock}>
                    <div className="product-icon"><Package size={23} /></div><div className="product-info"><span className="product-category">{product.category ?? 'General'}</span><strong>{product.name}</strong><span className="stock">{outOfStock ? 'Out of stock' : `${product.quantity} in stock`}</span></div><span className="product-price">{money(Number(product.selling_price))}</span>
                  </button>
                  <div className="product-card-footer">{product.is_new && <span className="new-badge">NEW</span>}{canManageProducts() && <button className="remove-product-button" onClick={() => void removeProduct(product)} aria-label={`Remove ${product.name}`}><Trash2 size={14} /> Remove</button>}</div>
                </div>;
              })}
            </div>
          </section> : view === 'inventory' ? <section className="catalog-panel panel inventory-panel">
            <div className="panel-heading"><div><h2>Stock levels</h2><p>Review availability and record stock movements</p></div><button className="icon-button" onClick={() => void refreshInventory()} aria-label="Refresh inventory"><RefreshCw size={16} /></button></div>
            <div className="catalog-controls">
              <div className="search-box"><Search size={18} /><input value={inventorySearch} onChange={event => setInventorySearch(event.target.value)} placeholder="Search inventory..." /></div>
              <label className="stock-filter"><input type="checkbox" checked={lowStockOnly} onChange={event => setLowStockOnly(event.target.checked)} /> Low stock</label>
            </div>
            <div className="inventory-list">
              {inventoryLoading && <div className="empty-state">Loading inventory...</div>}
              {!inventoryLoading && !inventory.length && <div className="empty-state">No inventory items match your search.</div>}
              {inventory.map(item => <div className="inventory-row" key={item.inventory_id}>
                <div><strong>{item.name}</strong><span>{item.category ?? 'General'} · {item.barcode}</span></div>
                <div className={item.low_stock ? 'stock-value low' : 'stock-value'}><strong>{item.quantity}</strong><span>reorder at {item.reorder_level}</span></div>
                {adjustingProductId === item.product_id ? <div className="adjustment-form">
                  <input type="number" step="0.001" value={adjustment} onChange={event => setAdjustment(event.target.value)} aria-label="Quantity adjustment" />
                  <select value={adjustmentReason} onChange={event => setAdjustmentReason(event.target.value as typeof adjustmentReason)} aria-label="Adjustment reason"><option value="receipt">Receipt</option><option value="adjustment">Correction</option><option value="damage">Damage</option></select>
                  <input value={adjustmentNote} onChange={event => setAdjustmentNote(event.target.value)} placeholder="Note (optional)" aria-label="Adjustment note" />
                  <button className="small-button" onClick={() => void submitAdjustment(item.product_id)}>Save</button>
                  <button className="text-button" onClick={() => setAdjustingProductId(null)}>Cancel</button>
                </div> : <button className="small-button" onClick={() => { setAdjustingProductId(item.product_id); setAdjustment('1'); }}>Adjust stock</button>}
              </div>)}
            </div>
          </section> : view === 'sales' ? <section className="catalog-panel panel sales-panel">
            <div className="panel-heading"><div><h2>Completed transactions</h2><p>Review cash payments and daily sales activity</p></div><button className="icon-button" onClick={() => void refreshSales()} aria-label="Refresh sales history"><RefreshCw size={16} /></button></div>
            <div className="catalog-controls">
              <div className="search-box"><Search size={18} /><input value={salesSearch} onChange={event => setSalesSearch(event.target.value)} placeholder="Search sale number or cashier..." /></div>
              <select value={salesPaymentMethod} onChange={event => setSalesPaymentMethod(event.target.value as typeof salesPaymentMethod)}><option value="all">All payments</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Transfer</option></select>
            </div>
            <div className="sales-list">
              {salesLoading && <div className="empty-state">Loading sales history...</div>}
              {!salesLoading && !sales.length && <div className="empty-state">No completed sales found.</div>}
              {sales.map(sale => {
                const detail = saleDetails[sale.sale_id];
                const expanded = expandedSaleId === sale.sale_id;
                return <div className={`sale-entry ${expanded ? 'expanded' : ''}`} key={sale.sale_id}>
                  <button className="sale-row" onClick={() => void toggleSaleDetails(sale.sale_id)} aria-expanded={expanded}>
                    <div><strong>Sale #{sale.sale_id}</strong><span>{new Date(sale.created_at).toLocaleString('en-LK')} · {sale.cashier}</span></div>
                    <div><strong>{money(Number(sale.total_amount))}</strong><span>{sale.item_count} item{sale.item_count === 1 ? '' : 's'}</span></div>
                    <div><span className="payment-badge">{sale.payment_method === 'bank_transfer' ? 'Transfer' : sale.payment_method[0].toUpperCase() + sale.payment_method.slice(1)}</span><span className="sale-status">{sale.status}</span></div>
                    <div className="sale-paid"><strong>Paid {money(Number(sale.amount_paid))}</strong><span>Change {money(Number(sale.change_amount))}</span><span className="sale-expand">{expanded ? 'Hide details' : 'View details'} {expanded ? '▲' : '▼'}</span></div>
                  </button>
                  {expanded && <div className="sale-details">
                    {saleDetailLoading === sale.sale_id && <div className="detail-loading">Loading transaction details...</div>}
                    {detail && <><div className="detail-header"><div><strong>Transaction details</strong><span>Payment completed {new Date(detail.paid_at).toLocaleString('en-LK')}</span></div><button className="small-button" onClick={() => printReceipt(detail.sale_id, detail.items, Number(detail.amount_paid), detail.payment_method, Number(detail.total_amount), detail.payment_reference, detail.cashier, detail.created_at)}>Print receipt</button></div>
                      <div className="detail-grid"><div><span>Cashier</span><strong>{detail.cashier}</strong><small>{detail.cashier_email}</small></div><div><span>Payment method</span><strong>{detail.payment_method === 'bank_transfer' ? 'Bank transfer' : detail.payment_method[0].toUpperCase() + detail.payment_method.slice(1)}</strong><small>{detail.payment_reference ? `Reference: ${detail.payment_reference}` : 'No reference recorded'}</small></div><div><span>Payment breakdown</span><strong>Paid {money(Number(detail.amount_paid))}</strong><small>Change {money(Number(detail.change_amount))}</small></div></div>
                      <div className="detail-items"><div className="detail-item-row detail-item-head"><span>Item</span><span>Qty</span><span>Unit price</span><span>Subtotal</span></div>{detail.items.map(item => <div className="detail-item-row" key={item.sale_item_id}><div><strong>{item.name}</strong><small>Barcode: {item.barcode}</small></div><span>{item.quantity}</span><span>{money(Number(item.unit_price))}</span><strong>{money(Number(item.subtotal))}</strong></div>)}</div>
                      <div className="detail-total"><span>Sale total</span><strong>{money(Number(detail.total_amount))}</strong></div>
                    </>}
                  </div>}
                </div>;
              })}
            </div>
          </section> : <section className="catalog-panel panel returns-panel">
            <div className="panel-heading"><div><h2>Find a receipt</h2><p>Search a completed receipt to return selected items and restore stock</p></div><RotateCcw size={20} className="dashboard-success" /></div>
            <form className="return-search" onSubmit={event => void searchReturnReceipt(event)}>
              <div className="search-box"><Receipt size={18} /><input value={returnReceiptId} onChange={event => setReturnReceiptId(event.target.value)} inputMode="numeric" placeholder="Enter receipt number..." /></div>
              <button className="small-button" disabled={returnLoading}>{returnLoading ? 'Searching...' : 'Search receipt'}</button>
            </form>
            {returnSale && <div className="return-receipt">
              <div className="return-receipt-header"><div><strong>Receipt #{returnSale.sale_id}</strong><span>{new Date(returnSale.created_at).toLocaleString('en-LK')} · {returnSale.cashier}</span></div><span className="payment-badge">{returnSale.payment_method === 'bank_transfer' ? 'Transfer' : returnSale.payment_method}</span></div>
              <div className="return-items">{returnSale.items.map(item => {
                const unavailable = item.returnable_quantity <= 0;
                return <div className={`return-item ${unavailable ? 'unavailable' : ''}`} key={item.sale_item_id}>
                  <div><strong>{item.name}</strong><span>{item.barcode} · {money(Number(item.unit_price))} each</span></div>
                  <span>{item.returnable_quantity} available</span>
                  <input type="number" min="0" max={item.returnable_quantity} step="0.001" value={returnQuantities[item.sale_item_id] ?? ''} disabled={unavailable} onChange={event => setReturnQuantities(current => ({ ...current, [item.sale_item_id]: event.target.value }))} aria-label={`Return quantity for ${item.name}`} placeholder="0" />
                  {!unavailable && <button type="button" className="text-button return-all-button" onClick={() => setReturnQuantities(current => ({ ...current, [item.sale_item_id]: String(item.returnable_quantity) }))}>All</button>}
                </div>;
              })}</div>
              <label className="return-reason">Refund reason<textarea value={returnReason} onChange={event => setReturnReason(event.target.value)} placeholder="Why is the customer returning these items?" maxLength={500} rows={3} required /></label>
              <div className="return-total"><span>Refund total</span><strong>{money(selectedReturnTotal)}</strong></div>
              <div className="return-actions"><span>Items will be added back to inventory and refunded using the original payment method.</span><button className="complete-button" onClick={() => void submitReturn()} disabled={returnSubmitting || selectedReturnTotal <= 0}>{returnSubmitting ? 'Processing...' : 'Record return & print bill'}</button></div>
            </div>}
            {!returnLoading && !returnSale && <div className="empty-state">Search by receipt number to begin a return.</div>}
          </section>}
        </main>

        {view === 'checkout' && <aside className="checkout-panel">
          <div className="checkout-heading"><div><p className="eyebrow">CURRENT SALE</p><h2>Order summary</h2></div><span className="item-pill">{itemCount} items</span></div>
          <div className="cart-list">
            {!cart.length && <div className="cart-empty"><ShoppingCart size={30} /><p>Your cart is empty</p><span>Add products from the catalog to begin.</span></div>}
            {cart.map(item => <div className="cart-item" key={item.product_id}><div className="cart-item-info"><strong>{item.name}</strong><span>{money(Number(item.selling_price))} each</span></div><div className="quantity-controls"><button onClick={() => updateQuantity(item.product_id, -1)} aria-label={`Decrease ${item.name}`}><Minus size={13} /></button><span>{item.cartQuantity}</span><button onClick={() => updateQuantity(item.product_id, 1)} aria-label={`Increase ${item.name}`}><Plus size={13} /></button></div><strong className="line-total">{money(Number(item.selling_price) * item.cartQuantity)}</strong><button className="remove-button" onClick={() => setCart(current => current.filter(cartItem => cartItem.product_id !== item.product_id))} aria-label={`Remove ${item.name}`}><Trash2 size={15} /></button></div>)}
          </div>
          <div className="checkout-bottom">
            <div className="totals"><div><span>Subtotal</span><strong>{money(total)}</strong></div><div><span>Tax</span><strong>{money(0)}</strong></div><div className="grand-total"><span>Total</span><strong>{money(total)}</strong></div></div>
            <div className="payment-section"><p className="section-label">Payment method</p><div className="payment-options">{(['cash', 'card', 'bank_transfer'] as PaymentMethod[]).map(method => <button className={paymentMethod === method ? 'selected' : ''} key={method} onClick={() => { setPaymentMethod(method); setPaymentReference(''); }}>{method === 'cash' ? <Banknote size={17} /> : method === 'card' ? <CreditCard size={17} /> : <WalletCards size={17} />}<span>{method === 'bank_transfer' ? 'Transfer' : method[0].toUpperCase() + method.slice(1)}</span></button>)}</div><label className="amount-label">{paymentMethod === 'cash' ? 'Amount received' : 'Amount paid'}<input type="text" inputMode="decimal" value={amountPaid} onChange={event => setAmountPaid(event.target.value)} placeholder="0.00" /></label>{paymentMethod !== 'cash' && <label className="amount-label">Payment reference<input value={paymentReference} onChange={event => setPaymentReference(event.target.value)} placeholder="Receipt or transfer reference" /></label>}{(parseAmount(amountPaid) ?? 0) >= total && total > 0 && <div className="change-row"><span>Change</span><strong>{money(change)}</strong></div>}</div>
            <button className="complete-button" onClick={completeSale} disabled={checkingOut || !cart.length || (parseAmount(amountPaid) ?? 0) < total}>{checkingOut ? 'Processing...' : `Complete sale · ${money(total)}`}</button>
            <div className="cashier-note"><UserRound size={14} /> Sale will be recorded under {user.fullName}</div>
          </div>
        </aside>}
      </div>
      {productFormOpen && <div className="settings-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setProductFormOpen(false); }}>
        <section className="settings-dialog product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
          <div className="settings-dialog-header"><div><p className="eyebrow">CATALOG MANAGEMENT</p><h2 id="product-dialog-title">Add product</h2><p>Create a product and initialize its stock level.</p></div><button className="settings-close" onClick={() => setProductFormOpen(false)} aria-label="Close add product"><X size={18} /></button></div>
          <form className="product-form" onSubmit={event => void saveProduct(event)}>
            <label>Product name<input required minLength={2} maxLength={200} value={productForm.name} onChange={event => setProductForm({ ...productForm, name: event.target.value })} /></label>
            <label>Barcode<input required minLength={3} maxLength={100} value={productForm.barcode} onChange={event => setProductForm({ ...productForm, barcode: event.target.value })} /></label>
            <label>Category<select required value={productForm.category_id} onChange={event => setProductForm({ ...productForm, category_id: event.target.value })}><option value="">Select category</option>{categories.map(item => <option key={item.category_id} value={item.category_id}>{item.name}</option>)}</select></label>
            <div className="form-grid"><label>Cost price<input required type="text" inputMode="decimal" value={productForm.cost_price} onChange={event => setProductForm({ ...productForm, cost_price: event.target.value })} /></label><label>Selling price<input required type="text" inputMode="decimal" value={productForm.selling_price} onChange={event => setProductForm({ ...productForm, selling_price: event.target.value })} /></label><label>Initial quantity<input required type="text" inputMode="decimal" value={productForm.initial_quantity} onChange={event => setProductForm({ ...productForm, initial_quantity: event.target.value })} /></label><label>Reorder level<input required type="text" inputMode="decimal" value={productForm.reorder_level} onChange={event => setProductForm({ ...productForm, reorder_level: event.target.value })} /></label></div>
            <div className="product-dialog-actions"><button type="button" className="text-button" onClick={downloadCsvTemplate}>Download CSV template</button><button type="button" className="text-button" onClick={() => setProductFormOpen(false)}>Cancel</button><button className="small-button" disabled={productSaving}>{productSaving ? 'Saving...' : 'Add product'}</button></div>
          </form>
        </section>
      </div>}
      {csvPortalOpen && <div className="settings-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) { setCsvPortalOpen(false); setCsvFile(null); } }}>
        <section className="settings-dialog product-dialog" role="dialog" aria-modal="true" aria-labelledby="csv-dialog-title">
          <div className="settings-dialog-header"><div><p className="eyebrow">CATALOG MANAGEMENT</p><h2 id="csv-dialog-title">Upload catalog CSV</h2><p>New barcodes are added and existing barcodes are updated without removing previous products.</p></div><button className="settings-close" onClick={() => { setCsvPortalOpen(false); setCsvFile(null); }} aria-label="Close CSV upload"><X size={18} /></button></div>
          <div className="csv-upload-portal">
            <label className="csv-file-picker">Choose CSV file<input type="file" accept=".csv,text/csv" onChange={event => setCsvFile(event.target.files?.[0] ?? null)} disabled={csvImporting} /></label>
            <p className="csv-file-name">{csvFile ? csvFile.name : 'No file selected'}</p>
            <p className="csv-help">Required columns: name, barcode, category, cost_price, selling_price.</p>
          </div>
          <div className="product-dialog-actions"><button type="button" className="text-button" onClick={downloadCsvTemplate}>Download CSV template</button><button type="button" className="text-button" onClick={() => { setCsvPortalOpen(false); setCsvFile(null); }}>Cancel</button><button type="button" className="small-button" disabled={!csvFile || csvImporting} onClick={() => void importProductsFromCsv()}>{csvImporting ? 'Uploading...' : 'Upload catalog'}</button></div>
        </section>
      </div>}
      {settingsOpen && <div className="settings-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
        <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className="settings-dialog-header"><div><p className="eyebrow">CONFIGURATION</p><h2 id="settings-title">Shop settings</h2><p>Update the details shown on receipts and across the POS.</p></div><button className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={18} /></button></div>
          {settingsLoading && <div className="settings-loading">Loading settings...</div>}
          {!settingsLoading && shopSettings && <form className="settings-form" onSubmit={event => void saveSettings(event)}>
            <div className="settings-section"><h3>Business details</h3><div className="settings-grid">
              <label>Shop name<input value={shopSettings.name} onChange={event => setShopSettings({ ...shopSettings, name: event.target.value })} required /></label>
              <label>Phone<input value={shopSettings.phone} onChange={event => setShopSettings({ ...shopSettings, phone: event.target.value })} /></label>
              <label>Email<input type="email" value={shopSettings.email} onChange={event => setShopSettings({ ...shopSettings, email: event.target.value })} /></label>
              <label>Tax ID<input value={shopSettings.tax_id} onChange={event => setShopSettings({ ...shopSettings, tax_id: event.target.value })} /></label>
              <label className="settings-wide">Address<textarea value={shopSettings.address} onChange={event => setShopSettings({ ...shopSettings, address: event.target.value })} rows={2} /></label>
            </div></div>
            <div className="settings-section"><h3>POS preferences</h3><div className="settings-grid">
              <label>Currency code<input value={shopSettings.currency} onChange={event => setShopSettings({ ...shopSettings, currency: event.target.value.toUpperCase() })} maxLength={10} required /></label>
              <label>Default reorder level<input type="number" min="0" step="0.001" value={shopSettings.default_reorder_level} onChange={event => setShopSettings({ ...shopSettings, default_reorder_level: Number(event.target.value) })} required /></label>
              <label className="settings-wide">Receipt footer<textarea value={shopSettings.receipt_footer} onChange={event => setShopSettings({ ...shopSettings, receipt_footer: event.target.value })} rows={2} /></label>
            </div></div>
            {canManageProducts() && <div className="settings-section"><h3>Supplier records</h3><div className="settings-grid">
              <label>Supplier name<input value={supplierForm.name} onChange={event => setSupplierForm({ ...supplierForm, name: event.target.value })} /></label>
              <label>Contact name<input value={supplierForm.contact_name} onChange={event => setSupplierForm({ ...supplierForm, contact_name: event.target.value })} /></label>
              <label>Email<input type="email" value={supplierForm.email} onChange={event => setSupplierForm({ ...supplierForm, email: event.target.value })} /></label>
              <label>Phone<input value={supplierForm.phone} onChange={event => setSupplierForm({ ...supplierForm, phone: event.target.value })} /></label>
              <div className="settings-wide supplier-records">{suppliers.length ? suppliers.map(supplier => <div className="supplier-record" key={supplier.supplier_id}><strong>{supplier.name}</strong><span>{supplier.contact_name || supplier.phone || supplier.email || 'No contact details'}</span></div>) : <span className="settings-hint">No suppliers added yet.</span>}</div>
              <div className="settings-wide settings-actions"><button type="button" className="small-button" onClick={() => void saveSupplier()}>Add supplier</button></div>
            </div></div>}
            <div className="settings-actions"><button type="button" className="text-button" onClick={() => setSettingsOpen(false)}>Cancel</button><button type="submit" className="small-button" disabled={settingsSaving}>{settingsSaving ? 'Saving...' : 'Save changes'}</button></div>
          </form>}
        </section>
      </div>}
    </div>
  );
}

export default App;
