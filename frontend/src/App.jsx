import React, { useEffect, useState } from "react";
import { getProducts, createOrder, getOrdersByPhone, createProduct, updateProduct, deleteProduct, getOrders, updateOrderStatus, deleteOrder, uploadImage, getDeliveryFee } from "./api";
import { getSession, login, logout, register } from "./auth";
import { getSocket, playNotificationSound } from "./socket";

const fallbackProducts = [
  { id: 1, name: "Chicken Burger", description: "Juicy chicken burger with fresh salad.", price: 650, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80", available: true },
  { id: 2, name: "Zinger Burger", description: "Crispy zinger chicken burger.", price: 750, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433a?auto=format&fit=crop&w=900&q=80", available: true },
  { id: 3, name: "Chicken Pizza", description: "Cheesy chicken pizza.", price: 1400, category: "Pizza", imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80", available: true },
  { id: 4, name: "Fries", description: "Crispy golden fries.", price: 300, category: "Sides", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80", available: true },
  { id: 5, name: "Chicken Roll", description: "Fresh chicken roll.", price: 450, category: "Rolls", imageUrl: "https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=900&q=80", available: true },
  { id: 6, name: "Cold Drink", description: "Chilled soft drink.", price: 150, category: "Drinks", imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80", available: true }
];

function money(n) { return `Rs. ${Number(n || 0).toLocaleString()}`; }

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("zzc_cart") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    localStorage.removeItem("zzc_cart");
    return [];
  }
}

function readPendingOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem("zzc_pending_order") || "null");
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    localStorage.removeItem("zzc_pending_order");
    return null;
  }
}

export default function App() {
  const [page, setPage] = useState("home");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(readCart);
  const [session, setSession] = useState(getSession());
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [adminNotice, setAdminNotice] = useState(null);
  const [unreadOrdersCount, setUnreadOrdersCount] = useState(0);

  useEffect(() => {
    const h = () => {
      const v = location.hash.replace("#", "");
      if (["home", "menu", "cart", "checkout", "account", "login", "register", "admin-login", "admin", "orders"].includes(v)) {
        setPage(v || "home");
        if (v === "admin") {
          setUnreadOrdersCount(0);
        }
      }
    };
    window.addEventListener("hashchange", h);
    h();
    return () => window.removeEventListener("hashchange", h);
  }, []);

  useEffect(() => {
    getProducts().then(setProducts).catch(() => setProducts(fallbackProducts)).finally(() => setLoading(false));
  }, []);

  useEffect(() => localStorage.setItem("zzc_cart", JSON.stringify(cart)), [cart]);

  // Real-time notifications via Socket.io
  useEffect(() => {
    const socket = getSocket();

    const handleNewProduct = async (newProduct) => {
      setNotice(`New item added: ${newProduct?.name || "New product"} 🎉`);

      // MongoDB is the single source of truth.
      // Refetching prevents the same product from being inserted twice
      // when both the POST response and Socket.io event arrive.
      try {
        const latestProducts = await getProducts();
        setProducts(Array.isArray(latestProducts) ? latestProducts : []);
      } catch (error) {
        console.error("Failed to refresh products after realtime update:", error);
      }

      setTimeout(() => setNotice(""), 4500);
    };

    const handleNewOrder = (order) => {
      const cur = getSession();
      if (cur?.role === "ADMIN") {
        setAdminNotice({
          name: order.customerName,
          total: order.total,
          id: order.id || order.orderId
        });
        playNotificationSound();
        setUnreadOrdersCount((c) => c + 1);
        setTimeout(() => setAdminNotice(null), 6000);
      }
    };

    socket.on("new_product", handleNewProduct);
    socket.on("new_order", handleNewOrder);

    return () => {
      socket.off("new_product", handleNewProduct);
      socket.off("new_order", handleNewOrder);
    };
  }, []);

  const available = products.filter(p => p.available !== false);
  const cartCount = cart.reduce((a, i) => a + i.qty, 0);
  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  function addToCart(product) {
    setCart(c => {
      const found = c.find(i => i.id === product.id);
      return found ? c.map(i => i.id === product.id ? {...i, qty: i.qty + 1} : i) : [...c, {...product, qty: 1}];
    });
    setNotice(`${product.name} added to cart`);
    setTimeout(() => setNotice(""), 1800);
  }

  function updateQty(id, qty) {
    setCart(c => qty <= 0 ? c.filter(i => i.id !== id) : c.map(i => i.id === id ? {...i, qty} : i));
  }

  function go(p) {
    if (p === "admin") {
      setUnreadOrdersCount(0);
    }
    location.hash = p;
    setPage(p);
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  function orderNow(product) {
    if (!session) {
      localStorage.setItem("zzc_pending_order", JSON.stringify(product));
      go("login");
      return;
    }
    setCart([{...product, qty: 1}]);
    go("checkout");
  }

  function onLogout() {
    logout();
    setSession(null);
    setUnreadOrdersCount(0);
    go("home");
  }

  return <div>
    <Header
      session={session}
      cartCount={cartCount}
      unreadOrdersCount={unreadOrdersCount}
      onNav={go}
      onLogout={onLogout}
      onClearUnread={() => setUnreadOrdersCount(0)}
    />

    {/* Real-time Customer Toast (e.g. New product added) */}
    {notice && (
      <div className="realtime-toast product-toast">
        <span className="realtime-toast-icon">✨</span>
        <div className="realtime-toast-body">
          <span className="realtime-toast-title">Live Update</span>
          <span className="realtime-toast-msg">{notice}</span>
        </div>
      </div>
    )}

    {/* Real-time Admin Order Notification Banner/Toast */}
    {adminNotice && session?.role === "ADMIN" && (
      <div className="realtime-toast admin-toast">
        <span className="realtime-toast-icon">🔔</span>
        <div className="realtime-toast-body">
          <span className="realtime-toast-title">New Order Received!</span>
          <span className="realtime-toast-msg">
            New order from <strong>{adminNotice.name}</strong> — <strong>{money(adminNotice.total)}</strong>
          </span>
        </div>
      </div>
    )}

    {page === "home" && <Home products={available} addToCart={addToCart} orderNow={orderNow} loading={loading} onShop={() => go("menu")}/>}
    {page === "menu" && <Menu products={available} addToCart={addToCart} orderNow={orderNow} />}
    {page === "cart" && <Cart cart={cart} updateQty={updateQty} subtotal={subtotal} deliveryFee={deliveryFee} total={total} onCheckout={() => session ? go("checkout") : go("login")}/>}
    {page === "orders" && session && <Orders session={session}/>}
    {page === "checkout" && <Checkout session={session} cart={cart} subtotal={subtotal} clearCart={() => setCart([])} onDone={() => go("home")}/>}
    {page === "login" && <AuthPage key="customer-login" mode="login" role="CUSTOMER" onNav={go} onAuth={u => {setSession(u); const p=readPendingOrder(); if(p){localStorage.removeItem("zzc_pending_order"); setCart([{...p,qty:1}]); go("checkout")} else go(u.role === "ADMIN" ? "admin" : "home")}}/>}
    {page === "admin-login" && <AuthPage key="admin-login" mode="login" role="ADMIN" onNav={go} onAuth={u => {setSession(u); go("admin")}}/>}
    {page === "register" && <AuthPage key="customer-register" mode="register" role="CUSTOMER" onNav={go} onAuth={u => {setSession(u); const p=readPendingOrder(); if(p){localStorage.removeItem("zzc_pending_order"); setCart([{...p,qty:1}]); go("checkout")} else go("home")}}/>}
    {page === "account" && <Account session={session} onLogout={onLogout}/>}
    {page === "admin" && session?.role === "ADMIN" && <AdminPage products={products} setProducts={setProducts} unreadOrdersCount={unreadOrdersCount} onClearUnread={() => setUnreadOrdersCount(0)}/>}
    {page === "admin" && session?.role !== "ADMIN" && <AccessDenied onLogin={() => go("login")} onAdminLogin={() => go("admin-login")}/>}

    <footer className="site-footer">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <strong>Zam Zam Cafe</strong>
          <p>Fresh pizza and easy meals in Nia Lahore.</p>
          <span>© {new Date().getFullYear()} Zam Zam Cafe</span>
          <small className="creator-credit">Created by Rana Subhan</small>
        </div>
        <div className="footer-contact">
          <span className="footer-label">VISIT US</span>
          <address>Nia Lahore, near Lahore College<br/>Jhang Road</address>
        </div>
        <div className="footer-hours">
          <span className="footer-label">OPEN HOURS</span>
          <p>Monday - Sunday<br/><b>10:00 - 01:00</b></p>
          <div className="footer-portal-links">
            <button
              type="button"
              className="footer-portal-btn"
              onClick={() => go(session?.role === "ADMIN" ? "admin" : "admin-login")}
            >
              🔐 {session?.role === "ADMIN" ? "Admin Dashboard" : "Admin Portal"}
            </button>
          </div>
          <button className="footer-order" onClick={() => window.scrollTo({top:0,behavior:"smooth"})}>Back to top ↑</button>
        </div>
      </div>
    </footer>
  </div>;
}

function Header({session, cartCount, unreadOrdersCount, onNav, onLogout, onClearUnread}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = page => {
    setMenuOpen(false);
    if (page === "admin" && onClearUnread) {
      onClearUnread();
    }
    onNav(page);
  };
  return <header className="header"><div className="nav wrap">
    <button className="logo" onClick={() => navigate("home")}>ZAM ZAM <span>CAFE</span></button>
    <button className="mobile-menu" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(open => !open)}><span></span><span></span><span></span></button>
    <nav className={menuOpen ? "nav-links open" : "nav-links"}><button onClick={() => navigate("home")}>Home</button><button onClick={() => navigate("menu")}>Menu</button><button onClick={() => navigate("cart")}>Cart ({cartCount})</button>
      {session ? <>
        {session.role !== "ADMIN" && <button onClick={() => navigate("orders")}>My Orders</button>}
        <button onClick={() => navigate(session.role === "ADMIN" ? "admin" : "account")}>
          {session.role === "ADMIN" ? (
            <>
              Admin Dashboard
              {unreadOrdersCount > 0 && <span className="unread-badge">{unreadOrdersCount}</span>}
            </>
          ) : `Hi, ${session.name}`}
        </button>
        {session.role !== "ADMIN" && <button onClick={() => navigate("admin-login")}>🔐 Admin</button>}
        <button onClick={() => { setMenuOpen(false); onLogout(); }}>Logout</button>
      </> : <><button onClick={() => navigate("login")}>👤 User</button><button onClick={() => navigate("admin-login")}>🔐 Admin</button><button className="nav-cta" onClick={() => navigate("register")}>Register</button></>}
    </nav>
  </div></header>;
}

function Home({products, addToCart, orderNow, loading, onShop}) {
  const featured = loading ? [] : [...products.filter(p => p.category === "Pizza"), ...products.filter(p => p.category !== "Pizza")].slice(0, 3);
  const showcaseImage = "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1000&q=85";
  return <main className="premium-home">
    <section className="pizza-hero">
      <div className="hero-grain"></div><div className="hero-glow glow-one"></div><div className="hero-glow glow-two"></div>
      <div className="wrap pizza-hero-inner">
        <div className="pizza-hero-copy">
          <span className="hero-kicker"><i></i> NIA LAHORE / NEAR LAHORE COLLEGE</span>
          <h1>Hot pizza.<br/><em>Close to home.</em></h1>
          <p>Fresh dough, a proper hot oven, and the toppings you actually came for. Made to order on Jhang Road.</p>
          <div className="hero-actions"><button className="primary hero-primary" onClick={onShop}>Build your order <span>↗</span></button><button className="hero-link dark-link" onClick={() => document.getElementById("featured-pizzas")?.scrollIntoView({behavior:"smooth"})}>Explore the menu <span>↓</span></button></div>
          <div className="hero-proof"><span><b>Fresh</b> every order</span><span><b>Hot</b> from the oven</span><span><b>Local</b> to Nia Lahore</span></div>
        </div>
        <div className="pizza-stage" aria-label="Signature pizza showcase">
          <div className="orbit orbit-one"></div><div className="orbit orbit-two"></div>
          <div className="pizza-shadow"></div><div className="pizza-disc"><img loading="eager" fetchPriority="high" src={showcaseImage} alt="Signature Zam Zam pizza"/><span className="pizza-crust"></span></div>
          <span className="ingredient ingredient-one">🍅</span><span className="ingredient ingredient-two">🌿</span><span className="ingredient ingredient-three">🫒</span>
          <div className="stage-note note-top"><span>01</span><div><b>Our popular pick</b><small>Good for sharing</small></div></div><div className="stage-note note-bottom"><span>★</span><div><b>Made when ordered</b><small>Fresh and hot</small></div></div>
        </div>
      </div>
      <div className="hero-scroll">Scroll to discover <span></span></div>
    </section>

    <section className="section featured-section wrap" id="featured-pizzas" aria-labelledby="featured-heading"><div className="section-head premium-head"><div><span className="eyebrow accent-eyebrow">PEOPLE ORDER THESE A LOT</span><h2 id="featured-heading">Start with<br/><em>something good.</em></h2></div><button className="text-btn" onClick={onShop}>See the full menu <span>↗</span></button></div>
      <div className="featured-grid">{featured.map((p, index) => <div className={`featured-card card-${index + 1}`} key={p.id}><ProductCard product={p} addToCart={addToCart} orderNow={orderNow}/><span className="card-index">0{index + 1}</span></div>)}{!loading && !featured.length && <div className="featured-fallback"><span>🍕</span><h3>Your next favorite is waiting.</h3><button className="primary" onClick={onShop}>Open the menu</button></div>}</div>
    </section>

    <section className="marquee-strip"><div><span>HAND STRETCHED</span><b>✦</b><span>FIRE BAKED</span><b>✦</b><span>LOCALLY LOVED</span><b>✦</b><span>HAND STRETCHED</span><b>✦</b><span>FIRE BAKED</span></div></section>

    <section className="section about-section wrap" id="about" aria-labelledby="about-heading"><div className="about-image"><img loading="lazy" src="https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1000&q=85" alt="Fresh pizza being served at Zam Zam Cafe"/><span className="about-badge"><b>07</b><small>years of<br/>good pizza</small></span></div><div className="about-copy"><span className="eyebrow accent-eyebrow">A LITTLE ABOUT US</span><h2 id="about-heading">A small cafe<br/><em>with a busy oven.</em></h2><p>Zam Zam Cafe began with a simple plan: serve filling, fresh food to the people around Nia Lahore. We still make the dough, prep the toppings, and check every order before it leaves the kitchen.</p><p>Come by for a quick bite after college, bring the family, or order in when nobody feels like cooking.</p><button className="text-btn" onClick={onShop}>Choose your dinner <span>↗</span></button></div></section>

    <section className="section philosophy-section wrap" id="why-us" aria-labelledby="why-heading"><div className="philosophy-intro"><span className="eyebrow accent-eyebrow">WHY PEOPLE COME BACK</span><h2 id="why-heading">Simple food,<br/><em>done properly.</em></h2><p>We do not try to make a hundred things. We focus on the food that comes out of our kitchen every day.</p></div><div className="philosophy-list"><div><span>01</span><div><h3>Fresh dough each day</h3><p>We prepare our dough and toppings here, then make your order when you place it.</p></div></div><div><span>02</span><div><h3>Properly hot oven</h3><p>The crust gets a crisp edge, a soft middle, and enough heat to bring everything together.</p></div></div><div><span>03</span><div><h3>A local place to eat</h3><p>Near Lahore College on Jhang Road, made for students, families, and nearby homes.</p></div></div></div></section>

    <section className="review-offer-section"><div className="wrap review-offer-grid"><div className="review-panel"><span className="eyebrow">WHAT A CUSTOMER SAID</span><blockquote>“The pizza arrived hot, the crust was just right, and the whole family found something they liked.”</blockquote><div className="reviewer"><span className="review-avatar">AR</span><div><b>Areeba R.</b><small>Regular customer</small></div><span className="stars">★★★★★</span></div></div><div className="offer-panel"><span className="offer-stamp">TODAY</span><span className="eyebrow">A GOOD DEAL FOR TWO</span><h2>Two pizzas.<br/><em>One easy order.</em></h2><p>Choose any two pizzas and we will add loaded fries to the order.</p><button className="primary" onClick={onShop}>Choose your pizzas <span>↗</span></button></div></div></section>

    <section className="order-cta"><div className="wrap order-cta-inner"><div><span className="eyebrow">HUNGRY?</span><h2>Pick a pizza<br/><em>and relax.</em></h2></div><button className="primary hero-primary" onClick={onShop}>Open the menu <span>↗</span></button></div></section>
  </main>;
}

function Menu({products, addToCart, orderNow}) {
  const [cat, setCat] = useState("All");
  const cats = ["All", ...new Set(products.map(p => p.category).filter(Boolean))];
  const shown = cat === "All" ? products : products.filter(p => p.category === cat);
  return <main className="section wrap"><span className="eyebrow">ZAM ZAM MENU</span><h1>Choose your food</h1><div className="chips">{cats.map(c => <button className={cat===c?"chip active":"chip"} onClick={() => setCat(c)} key={c}>{c}</button>)}</div><div className="grid">{shown.map(p => <ProductCard key={p.id} product={p} addToCart={addToCart} orderNow={orderNow}/>)}</div></main>;
}

function ProductCard({product, addToCart, orderNow}) {
  return <article className="product">
    <div className="product-media"><img loading="lazy" src={product.imageUrl || "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80"} alt={product.name}/><span className="product-tag">{product.category || "Fresh pick"}</span></div>
    <div className="product-body"><h3>{product.name}</h3><p>{product.description}</p><div className="product-bottom"><div className="product-meta"><strong>{money(product.price)}</strong><span>Made fresh</span></div><div className="product-actions"><button onClick={() => addToCart(product)}>Add +</button><button className="primary" onClick={() => orderNow(product)}>Order Now</button></div></div></div>
  </article>;
}

function Cart({cart, updateQty, subtotal, deliveryFee, total, onCheckout}) {
  return <main className="section wrap"><span className="eyebrow">YOUR CART</span><h1>Order summary</h1>{!cart.length ? <div className="empty-box"><h2>Your cart is empty</h2><p>Add something delicious from the menu.</p></div> : <div className="cart-layout"><div className="cart-list">{cart.map(i => <div className="cart-item" key={i.id}><img src={i.imageUrl}/><div><h3>{i.name}</h3><p>{money(i.price)}</p><div className="qty"><button onClick={() => updateQty(i.id,i.qty-1)}>−</button><b>{i.qty}</b><button onClick={() => updateQty(i.id,i.qty+1)}>+</button></div></div><strong>{money(i.price*i.qty)}</strong></div>)}</div><Summary subtotal={subtotal} deliveryFee={deliveryFee} total={total} onCheckout={onCheckout}/></div>}</main>;
}

function Summary({subtotal,deliveryFee,total,onCheckout}) {
  return <aside className="summary"><h2>Summary</h2><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Delivery</span><b>{deliveryFee ? money(deliveryFee) : "FREE"}</b></div><hr/><div className="grand"><span>Total</span><b>{money(total)}</b></div><button className="primary full" onClick={onCheckout}>Continue to Checkout</button></aside>;
}

function Checkout({session, cart, subtotal, clearCart, onDone}) {
  const [form, setForm] = useState({
    name: session?.name || "",
    phone: session?.phone || "",
    address: session?.address || "",
    notes: "",
    paymentMethod: "COD"
  });

  const [coords, setCoords] = useState(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [manualDistance, setManualDistance] = useState("");
  const [geoState, setGeoState] = useState("idle"); // 'requesting' | 'detected' | 'denied'
  const [statusMsg, setStatusMsg] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Function to request Geolocation
  function requestLocation() {
    if (!navigator.geolocation) {
      setGeoState("denied");
      setStatusMsg("Geolocation is not supported by your browser. Please enter distance manually.");
      return;
    }

    setGeoState("requesting");
    setStatusMsg("Calculating distance from Zamzam Cafe...");
    setCalculating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setGeoState("detected");
        try {
          const res = await getDeliveryFee({ lat, lng });
          setDistanceKm(res.distanceKm);
          setDeliveryFee(res.deliveryFee);
          setStatusMsg(`GPS Location verified (${res.distanceKm} km away)`);
        } catch (err) {
          setStatusMsg("Failed to calculate distance automatically. Please enter your distance manually.");
          setGeoState("denied");
        } finally {
          setCalculating(false);
        }
      },
      (err) => {
        setGeoState("denied");
        setCalculating(false);
        setStatusMsg("Location access denied or unavailable. Please enter your distance manually below.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  // Request location on initial checkout page mount
  useEffect(() => {
    requestLocation();
  }, []);

  // Handle manual distance input fallback
  async function handleManualDistanceChange(val) {
    setManualDistance(val);
    const parsed = parseFloat(val);
    if (val !== "" && !isNaN(parsed) && parsed >= 0) {
      setCalculating(true);
      try {
        const res = await getDeliveryFee({ manualDistance: parsed });
        setDistanceKm(res.distanceKm);
        setDeliveryFee(res.deliveryFee);
        setStatusMsg(`Manual distance: ${res.distanceKm} km`);
      } catch {
        const extra = Math.max(0, parsed - 3);
        const fee = Math.ceil(extra) * 100;
        setDistanceKm(parsed);
        setDeliveryFee(fee);
      } finally {
        setCalculating(false);
      }
    } else {
      setDistanceKm(0);
      setDeliveryFee(0);
    }
  }

  const calculatedTotal = subtotal + deliveryFee;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await createOrder({
        ...form,
        customerName: form.name,
        subtotal,
        deliveryFee,
        total: calculatedTotal,
        distanceKm,
        lat: coords?.lat,
        lng: coords?.lng,
        manualDistance: manualDistance ? parseFloat(manualDistance) : undefined,
        items: cart.map(i => ({
          productId: i.id,
          productName: i.name,
          quantity: i.qty,
          unitPrice: i.price
        }))
      });

      clearCart();
      alert("Order placed successfully!");
      onDone();
    } catch (err) {
      setError(err.message || "Could not place order. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section wrap">
      <span className="eyebrow">CHECKOUT</span>
      <h1>Complete your order</h1>
      <form className="checkout" onSubmit={submit}>
        <div className="form-card">
          <label>Name<input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}/></label>
          <label>Phone<input required type="tel" inputMode="numeric" pattern="[0-9]+" maxLength="15" value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g, "")})}/></label>
          <label>Delivery address<textarea required value={form.address} onChange={e => setForm({...form, address: e.target.value})}/></label>

          {/* Distance & Delivery Fee Calculation Card */}
          <div className="location-card">
            <div className="location-card-head">
              <h3>📍 Delivery Distance & Fee</h3>
              <span className="location-rule-badge">First 3 km FREE • Rs. 100/km beyond 3 km</span>
            </div>

            {geoState === "requesting" && (
              <div className="location-permission-prompt">
                <p>📍 <strong>Detecting your location...</strong> Calculating distance from Zamzam Cafe (Nia Lahore).</p>
              </div>
            )}

            {geoState === "denied" && (
              <div className="location-permission-prompt">
                <p>⚠️ <strong>Location permission not granted or unavailable.</strong> Please enter your estimated distance in km below:</p>
                <div className="manual-distance-row">
                  <label style={{ margin: 0, fontWeight: 700, fontSize: "13px" }}>
                    Distance (km):
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="e.g. 4.5"
                      value={manualDistance}
                      onChange={e => handleManualDistanceChange(e.target.value)}
                      required
                    />
                  </label>
                  <button type="button" className="secondary btn-small" onClick={requestLocation} style={{ margin: 0 }}>
                    📍 Try GPS Again
                  </button>
                </div>
              </div>
            )}

            {geoState === "detected" && (
              <div className="location-status-box">
                <div className="location-status-text">
                  <strong>✅ {statusMsg}</strong>
                  <small>Calculated securely via GPS coordinates</small>
                </div>
                <div className="location-btn-row">
                  <button
                    type="button"
                    className="secondary btn-small"
                    onClick={() => {
                      setGeoState("denied");
                      setCoords(null);
                    }}
                    style={{ margin: 0 }}
                  >
                    ✏️ Enter Distance Manually
                  </button>
                </div>
              </div>
            )}

            {/* Live Fee Breakdown */}
            <div className="location-status-box" style={{ background: "#fffdf9" }}>
              <div className="location-status-text">
                <strong>Calculated Distance: {distanceKm > 0 ? `${distanceKm} km` : "0 km"}</strong>
                <span className="distance-info-tag">
                  {distanceKm <= 3
                    ? "✓ Within 3 km free delivery radius"
                    : `+${(distanceKm - 3).toFixed(1)} km over free limit (${Math.ceil(distanceKm - 3)} km billed)`}
                </span>
              </div>
              <div>
                {deliveryFee === 0 ? (
                  <span className="fee-pill free">FREE Delivery</span>
                ) : (
                  <span className="fee-pill charged">{money(deliveryFee)} Delivery Fee</span>
                )}
              </div>
            </div>
          </div>

          <label>Notes (optional)<textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}/></label>
          <label>Payment<select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}><option value="COD">Cash on Delivery</option><option value="PAY_AT_CAFE">Pay at Cafe</option></select></label>

          {/* Checkout Order Summary */}
          <div className="summary" style={{ margin: "18px 0", border: "1px solid #eadbc8", padding: "18px", borderRadius: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0" }}>
              <span>Items Subtotal</span>
              <b>{money(subtotal)}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0" }}>
              <span>Delivery Fee ({distanceKm} km)</span>
              <b>{deliveryFee > 0 ? money(deliveryFee) : "FREE"}</b>
            </div>
            <hr style={{ border: 0, borderTop: "1px solid #eee", margin: "10px 0" }} />
            <div className="grand" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Total to Pay</span>
              <b>{money(calculatedTotal)}</b>
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          <button className="primary full" disabled={busy || calculating}>
            {busy ? "Placing order..." : calculating ? "Calculating delivery fee..." : `Place Order — ${money(calculatedTotal)}`}
          </button>
        </div>
      </form>
    </main>
  );
}

function AuthPage({mode, onAuth, role="CUSTOMER", onNav}) {
  const isLogin = mode === "login";
  const isAdmin = role === "ADMIN";
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigateTo = (p) => {
    setError("");
    if (onNav) {
      onNav(p);
    } else {
      location.hash = p;
    }
  };

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const emailToUse = form.email.trim();
      const passwordToUse = form.password;
      const u = isLogin
        ? await login(emailToUse, passwordToUse)
        : await register(form.name.trim(), emailToUse, passwordToUse, form.phone.trim(), form.address.trim());
      if (isAdmin && u.role !== "ADMIN") throw new Error("This account does not have Admin privileges.");
      onAuth(u);
    } catch (err) {
      if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
        setError("Could not connect to server. Please try again in a moment.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return <main className="section narrow"><div className="auth-card">
    <div className="role-switch">
      <button
        type="button"
        className={!isAdmin ? "role-btn active" : "role-btn"}
        onClick={() => navigateTo(isLogin ? "login" : "register")}
      >
        👤 User
      </button>
      <button
        type="button"
        className={isAdmin ? "role-btn active" : "role-btn"}
        onClick={() => navigateTo("admin-login")}
      >
        🔐 Admin
      </button>
    </div>
    <span className="eyebrow">{isAdmin ? "ADMIN AREA" : isLogin ? "WELCOME BACK" : "JOIN ZAM ZAM"}</span>
    <h1>{isAdmin ? "Admin Login" : isLogin ? "Login" : "Create account"}</h1>
    <p>
      {isAdmin
        ? "Login with your administrator account to manage products and orders."
        : isLogin
        ? "Sign in to continue your order."
        : "Create an account once. Your phone and address will be saved for faster checkout."}
    </p>

    <form onSubmit={submit}>{!isLogin&&<>
      <label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label>Phone number<input required type="tel" inputMode="numeric" pattern="[0-9]+" maxLength="15" placeholder="03XXXXXXXXX" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value.replace(/\D/g,"")})}/></label>
      <label>Address<textarea required value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
    </>}<label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label>
      Password
      <div className="password-input-wrap">
        <input
          type={showPassword ? "text" : "password"}
          required
          minLength="6"
          value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
          placeholder="••••••••"
        />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowPassword(prev => !prev)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </label>{error&&<p className="error">{error}</p>}<button className="primary full" disabled={loading}>{loading?"Please wait...":isAdmin?"Login as Admin":isLogin?"Login":"Register"}</button></form>
    {isAdmin ? (
      <p className="switch" style={{ marginTop: "18px" }}>Looking for customer account? <button type="button" onClick={()=>navigateTo("login")}>Customer Login 👤</button></p>
    ) : (
      <>
        {isLogin ? (
          <p className="switch">Don't have an account? <button type="button" onClick={()=>navigateTo("register")}>Register</button></p>
        ) : (
          <p className="switch">Already have an account? <button type="button" onClick={()=>navigateTo("login")}>Login</button></p>
        )}
        <p className="switch" style={{ marginTop: "10px", fontSize: "13px" }}>Are you cafe staff? <button type="button" onClick={()=>navigateTo("admin-login")}>Admin Login 🔐</button></p>
      </>
    )}
  </div></main>;
}

function Account({session,onLogout}) {
  return <main className="section narrow"><div className="account-card"><span className="eyebrow">MY ACCOUNT</span><h1>Hello, {session.name} 👋</h1><p><strong>Email:</strong> {session.email}</p><p><strong>Account type:</strong> Customer</p><p><strong>Phone:</strong> {session.phone || "Not saved"}</p><p><strong>Address:</strong> {session.address || "Not saved"}</p><p className="saved-note">✓ Your saved phone and address are automatically used at checkout.</p><button className="primary" onClick={onLogout}>Logout</button></div></main>;
}

function Orders({session}) {
  const [orders,setOrders]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{let alive=true; const load=()=>getOrdersByPhone(session.phone).then(x=>{if(alive)setOrders(x)}).catch(()=>{}).finally(()=>{if(alive)setLoading(false)}); load(); const t=setInterval(load,5000); return()=>{alive=false;clearInterval(t)}},[session.phone]);
  const labels={NEW:"Order Placed",CONFIRMED:"Confirmed",PREPARING:"Preparing",OUT_FOR_DELIVERY:"On Delivery",COMPLETED:"Delivered",CANCELLED:"Cancelled"};
  const steps=["NEW","CONFIRMED","PREPARING","OUT_FOR_DELIVERY","COMPLETED"];
  return <main className="section wrap"><span className="eyebrow">MY ORDERS</span><h1>Track your orders</h1>{loading?<p className="muted">Loading orders...</p>:!orders.length?<div className="empty-box"><h2>No orders yet</h2><p>Your order status will appear here after checkout.</p></div>:<div className="orders-list">{orders.map(o=>{const current=steps.indexOf(o.status); const cancelled=o.status==="CANCELLED"; return <article className="order-card customer-order" key={o.id}><div className="order-main"><div className="order-heading"><b>Order #{o.id}</b><span className={cancelled?"status-badge cancelled":"status-badge"}>{labels[o.status]||o.status}</span></div><p className="order-items">{o.items?.map(i=>`${i.productName} × ${i.quantity}`).join(", ")}</p><p className="order-address">Deliver to: {o.address} {o.distanceKm ? `(${o.distanceKm} km)` : ""}</p><div className={cancelled?"order-tracker is-cancelled":"order-tracker"}>{cancelled?<div className="cancelled-message">This order was cancelled by the cafe.</div>:steps.map((step,index)=><div className={index<=current?"tracker-step active":"tracker-step"} key={step}><span>{index<current||o.status==="COMPLETED"?"✓":index+1}</span><small>{labels[step]}</small></div>)}</div></div><div className="order-total"><strong>{money(o.total)}</strong><small>{o.deliveryFee ? `Includes ${money(o.deliveryFee)} delivery` : "Free Delivery"}</small></div></article>})}</div>}</main>;
}

function AccessDenied({onLogin, onAdminLogin}) {
  return (
    <main className="section narrow">
      <div className="empty-box" style={{ maxWidth: "480px", margin: "auto", padding: "35px 24px" }}>
        <span style={{ fontSize: "42px", display: "block", marginBottom: "12px" }}>🔒</span>
        <h2>Admin access required</h2>
        <p style={{ color: "#6b7280", margin: "10px 0 22px", fontSize: "14px" }}>
          Please login with an administrator account to view and manage the dashboard.
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="primary" onClick={onAdminLogin} style={{ margin: 0 }}>
            Login as Admin 🔐
          </button>
          <button className="secondary" onClick={onLogin} style={{ margin: 0 }}>
            Customer Login 👤
          </button>
        </div>
      </div>
    </main>
  );
}

function AdminPage({products, setProducts, unreadOrdersCount, onClearUnread}) {
  return (
    <main className="section wrap">
      <span className="eyebrow">ADMIN AREA</span>
      <h1>Dashboard</h1>
      <div className="admin-tabs">
        <button onClick={() => window.scrollTo({top: 0, behavior: "smooth"})}>Products</button>
        <button
          onClick={() => {
            if (onClearUnread) onClearUnread();
            document.getElementById("orders")?.scrollIntoView({behavior: "smooth"});
          }}
        >
          Orders
          {unreadOrdersCount > 0 && <span className="unread-badge">{unreadOrdersCount}</span>}
        </button>
      </div>
      <AdminProducts products={products} setProducts={setProducts}/>
      <div id="orders">
        <AdminOrders onClearUnread={onClearUnread}/>
      </div>
    </main>
  );
}

function AdminProducts({products,setProducts}) {
  const blank={name:"",description:"",price:"",category:"",imageUrl:"",available:true}; const [form,setForm]=useState(blank); const [editing,setEditing]=useState(null); const [msg,setMsg]=useState(""); const [saving,setSaving]=useState(false); const [uploading,setUploading]=useState(false);

  async function chooseImage(file){
    if(!file) return;
    if(!file.type.startsWith("image/")) { setMsg("Please select an image file."); return; }
    if(file.size > 10*1024*1024) { setMsg("Image must be 10MB or smaller."); return; }
    setUploading(true);
    setMsg("Uploading image to Cloudinary...");
    try{
      const imageUrl = await uploadImage(file);
      setForm(f=>({...f, imageUrl}));
      setMsg("Image uploaded successfully!");
      setTimeout(() => setMsg(""), 3000);
    } catch(e){
      setMsg(e.message || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function save(e){
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try{
      const payload={...form,price:Number(form.price)};
      const saved = editing
        ? await updateProduct(editing, payload)
        : await createProduct(payload);

      // Always reload the complete catalog from MongoDB after save.
      // This keeps frontend state identical to the backend and prevents
      // duplicate products caused by POST + Socket.io updates.
      const latestProducts = await getProducts();
      setProducts(Array.isArray(latestProducts) ? latestProducts : []);
      setForm(blank);
      setEditing(null);
      setMsg("Product saved successfully.");
    } catch(e){
      setMsg(e.message || "Could not save product. Please try again in a moment.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id){if(!confirm("Delete this product?"))return;try{await deleteProduct(id);setProducts(p=>p.filter(x=>x.id!==id));setMsg("Product deleted.")}catch(e){setMsg(e.message||"Could not delete product.")}}
  function edit(p){setEditing(p.id);setForm({name:p.name,description:p.description||"",price:p.price,category:p.category||"",imageUrl:p.imageUrl||"",available:p.available!==false});setMsg("");window.scrollTo({top:0,behavior:"smooth"})}
  return <section className="admin-panel"><div className="admin-form"><div className="admin-form-head"><div><span className="eyebrow">PRODUCT MANAGER</span><h2>{editing?"Edit product":"Add a new product"}</h2></div>
  <span className="admin-count">{products.length} items</span></div><form onSubmit={save}><div className="two">
    <label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label>Price (Rs.)<input required type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
    </label></div><label>Category<input placeholder="Burgers, Pizza, Drinks..." value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/>
    </label><label>Product image<div className="image-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();chooseImage(e.dataTransfer.files?.[0])}}>{form.imageUrl?<img src={form.imageUrl} alt="Preview"/>:<div className="drop-copy"><span className="upload-icon">📷</span><strong>{uploading ? "Uploading to Cloudinary..." : "Drag & drop an image here"}</strong><span>{uploading ? "Please wait..." : "or choose an image from your computer"}</span><label className="upload-btn secondary">{uploading ? "Uploading..." : "Choose Image"}<input hidden disabled={uploading} type="file" accept="image/*" onChange={e=>chooseImage(e.target.files?.[0])}/></label><small>JPG, PNG, WEBP • max 10MB</small></div>}</div>{form.imageUrl&&<div className="image-actions"><label className="upload-btn secondary">{uploading ? "Uploading..." : "Change Image"}<input hidden disabled={uploading} type="file" accept="image/*" onChange={e=>chooseImage(e.target.files?.[0])}/></label><button type="button" className="secondary" onClick={()=>setForm(f=>({...f,imageUrl:""}))}>Remove</button></div>}</label><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label className="check"><input type="checkbox" checked={form.available} onChange={e=>setForm({...form,available:e.target.checked})}/> Available for customers</label>{msg&&<p className={msg.toLowerCase().includes("success")?"success":"error"}>{msg}</p>}<button className="primary" disabled={saving || uploading}>{saving?"Saving...":editing?"Update product":"Add product"}</button>{editing&&<button type="button" className="secondary" onClick={()=>{setEditing(null);setForm(blank);setMsg("")}}>Cancel</button>}</form></div><div className="admin-products"><div className="admin-form-head"><div><span className="eyebrow">YOUR CATALOG</span><h2>Products</h2></div></div>{products.map(p=><div className="admin-product" key={p.id || p._id || `${p.name}-${p.price}`}><img src={p.imageUrl||"https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=300&q=80"}/><div><b>{p.name}</b><small>{p.category||"Uncategorized"} • {money(p.price)}</small></div><button type="button" onClick={()=>edit(p)}>Edit</button><button type="button" className="danger" onClick={()=>remove(p.id)}>Delete</button></div>)}{!products.length&&<p className="muted">No products yet.</p>}</div></section>;
}

function AdminOrders({onClearUnread}) {
  const [orders,setOrders]=useState([]); const [err,setErr]=useState("");

  useEffect(() => {
    getOrders().then(setOrders).catch(() => setErr("Could not load orders. Please try again in a moment."));

    const socket = getSocket();
    const handleRealtimeOrder = (newOrder) => {
      setOrders((prev) => [newOrder, ...prev.filter(o => o.id !== newOrder.id && o._id !== newOrder.id)]);
    };

    socket.on("new_order", handleRealtimeOrder);
    return () => {
      socket.off("new_order", handleRealtimeOrder);
    };
  }, []);

  async function status(id,s){try{const o=await updateOrderStatus(id,s);setOrders(x=>x.map(a=>a.id===id?o:a))}catch{setErr("Could not update order.")}}
  async function remove(id){if(!confirm("Delete this order?"))return;try{await deleteOrder(id);setOrders(x=>x.filter(a=>a.id!==id))}catch{setErr("Could not delete order.")}}

  return (
    <section className="admin-orders">
      <h2>Customer Orders</h2>
      {err && <p className="error">{err}</p>}
      {!orders.length && !err && <p className="muted">No orders yet.</p>}
      {orders.map(o => (
        <div className="order-card" key={o.id || o._id} onClick={onClearUnread}>
          <div>
            <b>Order #{o.id || o._id}</b>
            <p>{o.customerName || o.name || "Customer"} • {o.phone}</p>
            <p>{o.address} {o.distanceKm ? `• Distance: ${o.distanceKm} km` : ""}</p>
            <small>{o.items?.map(i => `${i.productName} × ${i.quantity}`).join(", ")}</small>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#b45309" }}>
              Delivery Fee: {o.deliveryFee > 0 ? money(o.deliveryFee) : "FREE (within 3 km)"}
            </p>
          </div>
          <div>
            <strong>{money(o.total)}</strong>
            <select value={o.status} onChange={e => status(o.id || o._id, e.target.value)}>
              <option>NEW</option>
              <option>CONFIRMED</option>
              <option>PREPARING</option>
              <option>OUT_FOR_DELIVERY</option>
              <option>COMPLETED</option>
              <option>CANCELLED</option>
            </select>
            <button className="danger" onClick={() => remove(o.id || o._id)}>Delete</button>
          </div>
        </div>
      ))}
    </section>
  );
}