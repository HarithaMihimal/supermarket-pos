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
type PaymentMethod = 'cash' | 'card' | 'bank_transfer';

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
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ data: Product[] }>('/products'),
      api.get<{ data: { category_id: number; name: string }[] }>('/products/categories'),
    ])
      .then(([productResponse, categoryResponse]) => {
        setProducts(productResponse.data.data);
        setCategories(categoryResponse.data.data);
      })
      .catch(() => setNotice({ type: 'error', text: 'Could not connect to the POS server.' }))
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();
    return products.filter(product => {
      const matchesSearch = !term
        || product.name.toLowerCase().includes(term)
        || product.barcode.includes(term);
      const matchesCategory = category === 'all' || product.category_id === Number(category);
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
    if (!cart.length || Number(amountPaid) < total) return;
    setCheckingOut(true);
    setNotice(null);
    try {
      const response = await api.post<{ data: { sale_id: number; change: number } }>('/sales', {
        items: cart.map(item => ({ product_id: item.product_id, quantity: item.cartQuantity })),
        payment_method: paymentMethod,
        amount_paid: Number(amountPaid),
      });
      setNotice({
        type: 'success',
        text: `Sale #${response.data.data.sale_id} completed. Change: ${money(response.data.data.change)}`,
      });
      setCart([]);
      setAmountPaid('');
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setNotice({ type: 'error', text: message ?? 'Checkout failed. Please try again.' });
    } finally {
      setCheckingOut(false);
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
            <div className="nav-item active"><LayoutDashboard size={18} /> Checkout</div>
            <div className="nav-item"><Package size={18} /> Inventory</div>
            <div className="nav-item"><Receipt size={18} /> Sales history</div>
          </nav>
          <div className="sidebar-footer">v1.0.0 <span>●</span> System online</div>
        </aside>

        <main className="workspace">
          <div className="page-heading"><div><p className="eyebrow">POINT OF SALE</p><h1>New transaction</h1></div><div className="date-label">{new Date().toLocaleDateString('en-LK', { weekday: 'long', month: 'short', day: 'numeric' })}</div></div>
          {notice && <div className={`notice ${notice.type}`}><span>{notice.type === 'success' ? <CheckCircle2 size={18} /> : '!'}</span>{notice.text}</div>}

          <section className="catalog-panel panel">
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
          </section>
        </main>

        <aside className="checkout-panel">
          <div className="checkout-heading"><div><p className="eyebrow">CURRENT SALE</p><h2>Order summary</h2></div><span className="item-pill">{itemCount} items</span></div>
          <div className="cart-list">
            {!cart.length && <div className="cart-empty"><ShoppingCart size={30} /><p>Your cart is empty</p><span>Add products from the catalog to begin.</span></div>}
            {cart.map(item => <div className="cart-item" key={item.product_id}><div className="cart-item-info"><strong>{item.name}</strong><span>{money(Number(item.selling_price))} each</span></div><div className="quantity-controls"><button onClick={() => updateQuantity(item.product_id, -1)} aria-label={`Decrease ${item.name}`}><Minus size={13} /></button><span>{item.cartQuantity}</span><button onClick={() => updateQuantity(item.product_id, 1)} aria-label={`Increase ${item.name}`}><Plus size={13} /></button></div><strong className="line-total">{money(Number(item.selling_price) * item.cartQuantity)}</strong><button className="remove-button" onClick={() => setCart(current => current.filter(cartItem => cartItem.product_id !== item.product_id))} aria-label={`Remove ${item.name}`}><Trash2 size={15} /></button></div>)}
          </div>
          <div className="checkout-bottom">
            <div className="totals"><div><span>Subtotal</span><strong>{money(total)}</strong></div><div><span>Tax</span><strong>{money(0)}</strong></div><div className="grand-total"><span>Total</span><strong>{money(total)}</strong></div></div>
            <div className="payment-section"><p className="section-label">Payment method</p><div className="payment-options">{(['cash', 'card', 'bank_transfer'] as PaymentMethod[]).map(method => <button className={paymentMethod === method ? 'selected' : ''} key={method} onClick={() => setPaymentMethod(method)}>{method === 'cash' ? <Banknote size={17} /> : method === 'card' ? <CreditCard size={17} /> : <WalletCards size={17} />}<span>{method === 'bank_transfer' ? 'Transfer' : method[0].toUpperCase() + method.slice(1)}</span></button>)}</div><label className="amount-label">Amount received<input type="number" min={0} step="0.01" value={amountPaid} onChange={event => setAmountPaid(event.target.value)} placeholder="0.00" /></label>{Number(amountPaid) >= total && total > 0 && <div className="change-row"><span>Change</span><strong>{money(change)}</strong></div>}</div>
            <button className="complete-button" onClick={completeSale} disabled={checkingOut || !cart.length || Number(amountPaid) < total}>{checkingOut ? 'Processing...' : `Complete sale · ${money(total)}`}</button>
            <div className="cashier-note"><UserRound size={14} /> Sale will be recorded under Demo Cashier</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
