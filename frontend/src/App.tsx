import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from './services/api';
import {
  Banknote,
  Barcode,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
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
  category: string | null;
  category_id: number | null;
  quantity: string;
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
type User = { userId: number; branchId: number; fullName: string; email: string; role: 'admin' | 'manager' | 'cashier' };
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
type View = 'checkout' | 'inventory' | 'sales';
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

const parseAmount = (value: string) => {
  const normalized = value.trim();
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [salesPaymentMethod, setSalesPaymentMethod] = useState<'all' | PaymentMethod>('all');
  const [salesLoading, setSalesLoading] = useState(false);
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
    })));
    setCategories(categoryResponse.data.data.map(item => ({
      ...item,
      category_id: Number(item.category_id),
    })));
  }

  async function openSettings() {
    setSettingsOpen(true);
    setSettingsLoading(true);
    try {
      const response = await api.get<{ data: ShopSettings }>('/settings');
      setShopSettings({
        ...response.data.data,
        branch_id: Number(response.data.data.branch_id),
        default_reorder_level: Number(response.data.data.default_reorder_level),
      });
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
      setInventory(response.data.data);
    } catch {
      setNotice({ type: 'error', text: 'Could not load inventory.' });
    } finally {
      setInventoryLoading(false);
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

  function printReceipt(saleId: number, items: CartItem[], paid: number, method: PaymentMethod) {
    const receiptWindow = window.open('', '_blank', 'width=420,height=700');
    if (!receiptWindow) {
      setNotice({ type: 'error', text: 'Allow pop-ups to print the receipt.' });
      return;
    }
    const lines = items.map(item => `<tr><td>${item.name}</td><td>${item.cartQuantity} x ${money(Number(item.selling_price))}</td><td>${money(Number(item.selling_price) * item.cartQuantity)}</td></tr>`).join('');
    receiptWindow.document.write(`<html><head><title>Receipt #${saleId}</title><style>body{font-family:Arial,sans-serif;width:320px;margin:20px auto;color:#111}h1{text-align:center;font-size:20px}p{text-align:center;font-size:12px}table{width:100%;font-size:11px;border-collapse:collapse}td{padding:5px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right}.total{font-weight:bold;font-size:14px}</style></head><body><h1>${shopSettings?.name ?? 'Supermarket POS'}</h1><p>Receipt #${saleId}<br>${new Date().toLocaleString('en-LK')}<br>Cashier: ${user?.fullName ?? 'Cashier'}</p><table>${lines}</table><p class="total">Total: ${money(total)}<br>Paid: ${money(paid)}<br>Method: ${method}<br>Change: ${money(Math.max(0, paid - total))}</p><p>${shopSettings?.receipt_footer ?? 'Thank you for shopping with us!'}</p></body></html>`);
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
      printReceipt(response.data.data.sale_id, completedItems, parsedAmountPaid, paymentMethod);
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
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Inventory update failed.' });
    }
  }

  if (!user) return <div className="login-page"><form className="login-card" onSubmit={event => void (signupMode ? signup(event) : login(event))}><div className="brand"><div className="brand-mark"><ShoppingCart size={20} /></div><span>Market<span className="brand-accent">Flow</span></span></div><h1>{signupMode ? 'Create your POS account' : 'Sign in to POS'}</h1>{signupMode ? <><label>Full name<input value={signupName} onChange={event => setSignupName(event.target.value)} required /></label><label>Email<input type="email" value={signupEmail} onChange={event => setSignupEmail(event.target.value)} required /></label><label>Password<input type="password" value={signupPassword} onChange={event => setSignupPassword(event.target.value)} minLength={8} required /></label><label>Confirm password<input type="password" value={signupConfirmPassword} onChange={event => setSignupConfirmPassword(event.target.value)} minLength={8} required /></label></> : <><label>Email<input type="email" value={loginEmail} onChange={event => setLoginEmail(event.target.value)} required /></label><label>Password<input type="password" value={loginPassword} onChange={event => setLoginPassword(event.target.value)} required /></label></>}{notice && <div className="notice error">{notice.text}</div>}<button className="complete-button" disabled={loginLoading}>{loginLoading ? (signupMode ? 'Creating account...' : 'Signing in...') : (signupMode ? 'Create account' : 'Sign in')}</button><button type="button" className="text-button login-switch" onClick={() => { setSignupMode(!signupMode); setNotice(null); }}>{signupMode ? 'Already have an account? Sign in' : 'First time here? Create an account'}</button>{!signupMode && <small>Demo cashier: cashier@supermarket.local / password</small>}<small>New accounts are created as cashier accounts.</small></form></div>;

  return (
    <div className="pos-app">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><ShoppingCart size={20} /></div><span>Market<span className="brand-accent">Flow</span></span></div>
        <div className="store-status"><span className="status-dot" /> {shopSettings?.name ?? 'Main Branch'} <span className="status-divider" /> Register 01</div>
        <div className="user-menu"><button className="settings-trigger" onClick={() => void openSettings()} aria-label="Open shop settings"><Settings size={17} /></button><div className="avatar">{user.fullName.slice(0, 2).toUpperCase()}</div><span>{user.fullName}</span><button className="text-button" onClick={() => { localStorage.clear(); setUser(null); }}>Sign out</button></div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <nav>
            <button className={`nav-item ${view === 'checkout' ? 'active' : ''}`} onClick={() => setView('checkout')}><LayoutDashboard size={18} /> Checkout</button>
            <button className={`nav-item ${view === 'inventory' ? 'active' : ''}`} onClick={() => setView('inventory')}><Package size={18} /> Inventory</button>
            <button className={`nav-item ${view === 'sales' ? 'active' : ''}`} onClick={() => setView('sales')}><Receipt size={18} /> Sales history</button>
          </nav>
          <div className="sidebar-footer">v1.0.0 <span>●</span> System online</div>
        </aside>

        <main className="workspace">
          <div className="page-heading"><div><p className="eyebrow">{view === 'checkout' ? 'POINT OF SALE' : view === 'inventory' ? 'STOCK CONTROL' : 'REPORTING'}</p><h1>{view === 'checkout' ? 'New transaction' : view === 'inventory' ? 'Inventory' : 'Sales history'}</h1></div><div className="date-label">{new Date().toLocaleDateString('en-LK', { weekday: 'long', month: 'short', day: 'numeric' })}</div></div>
          {notice && <div className={`notice ${notice.type}`}><span>{notice.type === 'success' ? <CheckCircle2 size={18} /> : '!'}</span>{notice.text}</div>}

          {view === 'checkout' ? <section className="catalog-panel panel">
            <div className="panel-heading"><div><h2>Product catalog</h2><p>Select an item to add it to the current sale</p></div><span className="product-count">{filteredProducts.length} products</span></div>
            <div className="catalog-controls">
              <div className="search-box"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or scan barcode..." /><Barcode size={18} className="muted-icon" /></div>
              <select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(item => <option key={item.category_id} value={item.category_id}>{item.name}</option>)}</select>
            </div>
            <div className="product-grid">
              {loading && <div className="empty-state">Loading catalog...</div>}
              {!loading && !filteredProducts.length && <div className="empty-state">No products match your search.</div>}
              {filteredProducts.map(product => {
                const outOfStock = Number(product.quantity) <= 0;
                return <button className="product-card" key={product.product_id} onClick={() => addToCart(product)} disabled={outOfStock}>
                  <div className="product-icon"><Package size={23} /></div><div className="product-info"><span className="product-category">{product.category ?? 'General'}</span><strong>{product.name}</strong><span className="stock">{outOfStock ? 'Out of stock' : `${product.quantity} in stock`}</span></div><span className="product-price">{money(Number(product.selling_price))}</span>
                </button>;
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
          </section> : <section className="catalog-panel panel sales-panel">
            <div className="panel-heading"><div><h2>Completed transactions</h2><p>Review cash payments and daily sales activity</p></div><button className="icon-button" onClick={() => void refreshSales()} aria-label="Refresh sales history"><RefreshCw size={16} /></button></div>
            <div className="catalog-controls">
              <div className="search-box"><Search size={18} /><input value={salesSearch} onChange={event => setSalesSearch(event.target.value)} placeholder="Search sale number or cashier..." /></div>
              <select value={salesPaymentMethod} onChange={event => setSalesPaymentMethod(event.target.value as typeof salesPaymentMethod)}><option value="all">All payments</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Transfer</option></select>
            </div>
            <div className="sales-list">
              {salesLoading && <div className="empty-state">Loading sales history...</div>}
              {!salesLoading && !sales.length && <div className="empty-state">No completed sales found.</div>}
              {sales.map(sale => <div className="sale-row" key={sale.sale_id}>
                <div><strong>Sale #{sale.sale_id}</strong><span>{new Date(sale.created_at).toLocaleString('en-LK')} · {sale.cashier}</span></div>
                <div><strong>{money(Number(sale.total_amount))}</strong><span>{sale.item_count} item{sale.item_count === 1 ? '' : 's'}</span></div>
                <div><span className="payment-badge">{sale.payment_method === 'bank_transfer' ? 'Transfer' : sale.payment_method[0].toUpperCase() + sale.payment_method.slice(1)}</span><span className="sale-status">{sale.status}</span></div>
                <div className="sale-paid"><strong>Paid {money(Number(sale.amount_paid))}</strong><span>Change {money(Number(sale.change_amount))}</span></div>
              </div>)}
            </div>
          </section>}
        </main>

        <aside className="checkout-panel">
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
        </aside>
      </div>
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
            <div className="settings-actions"><button type="button" className="text-button" onClick={() => setSettingsOpen(false)}>Cancel</button><button type="submit" className="small-button" disabled={settingsSaving}>{settingsSaving ? 'Saving...' : 'Save changes'}</button></div>
          </form>}
        </section>
      </div>}
    </div>
  );
}

export default App;
