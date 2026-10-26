import { useEffect, useMemo, useState } from 'react';
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
  ShoppingCart,
  Trash2,
  UserRound,
  WalletCards,
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
};
type View = 'checkout' | 'inventory' | 'sales';

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
    // The initial request synchronizes the client with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCatalog()
      .catch(() => setNotice({ type: 'error', text: 'Could not connect to the POS server.' }))
      .finally(() => setLoading(false));
  }, []);

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
      setNotice({ type: 'error', text: 'Enter a valid cash amount.' });
      return;
    }
    if (parsedAmountPaid < total) {
      setNotice({ type: 'error', text: 'Cash received must cover the sale total.' });
      return;
    }
    if (paymentMethod !== 'cash') {
      setNotice({ type: 'error', text: 'Card and bank transfer payments are coming soon. Select Cash.' });
      return;
    }
    setCheckingOut(true);
    setNotice(null);
    try {
      const response = await api.post<{ data: { sale_id: number; change: number } }>('/sales', {
        items: cart.map(item => ({ product_id: Number(item.product_id), quantity: item.cartQuantity })),
        payment_method: paymentMethod,
        amount_paid: parsedAmountPaid,
      });
      setNotice({
        type: 'success',
        text: `Sale #${response.data.data.sale_id} completed. Change: ${money(response.data.data.change)}`,
      });
      setCart([]);
      setAmountPaid('');
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

  return (
    <div className="pos-app">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><ShoppingCart size={20} /></div><span>Market<span className="brand-accent">Flow</span></span></div>
        <div className="store-status"><span className="status-dot" /> Main Branch <span className="status-divider" /> Register 01</div>
        <div className="user-menu"><div className="avatar">DC</div><span>Demo Cashier</span></div>
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
            <div className="payment-section"><p className="section-label">Payment method</p><div className="payment-options">{(['cash', 'card', 'bank_transfer'] as PaymentMethod[]).map(method => <button className={paymentMethod === method ? 'selected' : ''} key={method} onClick={() => setPaymentMethod(method)} disabled={method !== 'cash'}>{method === 'cash' ? <Banknote size={17} /> : method === 'card' ? <CreditCard size={17} /> : <WalletCards size={17} />}<span>{method === 'bank_transfer' ? 'Transfer' : method[0].toUpperCase() + method.slice(1)}</span></button>)}</div><label className="amount-label">Amount received<input type="text" inputMode="decimal" value={amountPaid} onChange={event => setAmountPaid(event.target.value)} placeholder="0.00" /></label>{(parseAmount(amountPaid) ?? 0) >= total && total > 0 && <div className="change-row"><span>Change</span><strong>{money(change)}</strong></div>}</div>
            <button className="complete-button" onClick={completeSale} disabled={checkingOut || !cart.length || (parseAmount(amountPaid) ?? 0) < total}>{checkingOut ? 'Processing...' : `Complete cash sale · ${money(total)}`}</button>
            <div className="cashier-note"><UserRound size={14} /> Sale will be recorded under Demo Cashier</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
