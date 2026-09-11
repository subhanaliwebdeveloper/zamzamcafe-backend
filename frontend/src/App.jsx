import React, { useEffect, useState } from "react";
import { getProducts, createOrder, getOrdersByPhone, createProduct, updateProduct, deleteProduct, getOrders, updateOrderStatus, deleteOrder } from "./api";
import { getSession, login, logout, register } from "./auth";

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
  useEffect(() => { const h = () => { const v = location.hash.replace("#",""); if (["home","menu","cart","checkout","account","login","register","admin-login","admin","orders"].includes(v)) setPage(v || "home"); }; window.addEventListener("hashchange", h); h(); return () => window.removeEventListener("hashchange", h); }, []);

  useEffect(() => {
    getProducts().then(setProducts).catch(() => setProducts(fallbackProducts)).finally(() => setLoading(false));
  }, []);

  useEffect(() => localStorage.setItem("zzc_cart", JSON.stringify(cart)), [cart]);

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
    setPage(p);
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  function orderNow(product) { if (!session) { localStorage.setItem("zzc_pending_order", JSON.stringify(product)); go("login"); return; } setCart([{...product, qty:1}]); go("checkout"); }

  function onLogout() {
    logout(); setSession(null); go("home");
  }

  return <div>
    <Header session={session} cartCount={cartCount} onNav={go} onLogout={onLogout}/>
    {notice && <div className="toast">{notice}</div>}

    {page === "home" && <Home products={available} addToCart={addToCart} orderNow={orderNow} loading={loading} onShop={() => go("menu")}/>}
    {page === "menu" && <Menu products={available} addToCart={addToCart} orderNow={orderNow} />}
    {page === "cart" && <Cart cart={cart} updateQty={updateQty} subtotal={subtotal} deliveryFee={deliveryFee} total={total} onCheckout={() => session ? go("checkout") : go("login")}/>}
    {page === "orders" && session && <Orders session={session}/>}
    {page === "checkout" && <Checkout session={session} cart={cart} subtotal={subtotal} deliveryFee={deliveryFee} total={total} clearCart={() => setCart([])} onDone={() => go("home")}/>}
    {page === "login" && <AuthPage mode="login" role="CUSTOMER" onAuth={u => {setSession(u); const p=readPendingOrder(); if(p){localStorage.removeItem("zzc_pending_order"); setCart([{...p,qty:1}]); go("checkout")} else go(u.role === "ADMIN" ? "admin" : "home")}}/>}
    {page === "admin-login" && <AuthPage mode="login" role="ADMIN" onAuth={u => {setSession(u); go("admin")}}/>}
    {page === "register" && <AuthPage mode="register" role="CUSTOMER" onAuth={u => {setSession(u); const p=readPendingOrder(); if(p){localStorage.removeItem("zzc_pending_order"); setCart([{...p,qty:1}]); go("checkout")} else go("home")}}/>}
    {page === "account" && <Account session={session} onLogout={onLogout}/>}
    {page === "admin" && session?.role === "ADMIN" && <AdminPage products={products} setProducts={setProducts}/>}
    {page === "admin" && session?.role !== "ADMIN" && <AccessDenied onLogin={() => go("login")}/>}

    <footer className="site-footer"><div className="wrap footer-inner"><div className="footer-brand"><strong>Zam Zam Cafe</strong><p>Fresh pizza and easy meals in Nia Lahore.</p><span>© {new Date().getFullYear()} Zam Zam Cafe</span><small className="creator-credit">Created by Rana Subhan</small></div><div className="footer-contact"><span className="footer-label">VISIT US</span><address>Nia Lahore, near Lahore College<br/>Jhang Road</address></div><div className="footer-hours"><span className="footer-label">OPEN HOURS</span><p>Monday - Sunday<br/><b>10:00 - 01:00</b></p><button className="footer-order" onClick={() => window.scrollTo({top:0,behavior:"smooth"})}>Back to top ↑</button></div></div></footer>
  </div>;
}

function Header({session, cartCount, onNav, onLogout}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = page => { setMenuOpen(false); onNav(page); };
  return <header className="header"><div className="nav wrap">
    <button className="logo" onClick={() => navigate("home")}>ZAM ZAM <span>CAFE</span></button>
    <button className="mobile-menu" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(open => !open)}><span></span><span></span><span></span></button>
    <nav className={menuOpen ? "nav-links open" : "nav-links"}><button onClick={() => navigate("home")}>Home</button><button onClick={() => navigate("menu")}>Menu</button><button onClick={() => navigate("cart")}>Cart ({cartCount})</button>
      {session ? <>
        {session.role !== "ADMIN" && <button onClick={() => navigate("orders")}>My Orders</button>}
        <button onClick={() => navigate(session.role === "ADMIN" ? "admin" : "account")}>{session.role === "ADMIN" ? "Admin Dashboard" : `Hi, ${session.name}`}</button>
        <button onClick={() => { setMenuOpen(false); onLogout(); }}>Logout</button>
      </> : <><button onClick={() => navigate("login")}>👤 User</button><button onClick={() => { setMenuOpen(false); location.hash="admin-login" }}>🔐 Admin</button><button className="nav-cta" onClick={() => navigate("register")}>Register</button></>}
    </nav>
  </div></header>;
}

function Home({products, addToCart, orderNow, loading, onShop}) {
  const featured = loading ? [] : [...products.filter(p => p.category === "Pizza"), ...products.filter(p => p.category !== "Pizza")].slice(0, 3);
  const showcase = featured[0] || products[2];
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
          <div className="pizza-shadow"></div><div className="pizza-disc"><img loading="eager" fetchPriority="high" src={showcase?.imageUrl || "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1000&q=85"} alt="Signature Zam Zam pizza"/><span className="pizza-crust"></span></div>
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

function Checkout({session, cart, subtotal, deliveryFee, total, clearCart, onDone}) {
  const [form,setForm]=useState({name:session?.name||"",phone:session?.phone||"",address:session?.address||"",notes:"",paymentMethod:"COD"});
  const [busy,setBusy]=useState(false), [error,setError]=useState("");
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await createOrder({...form, customerName: form.name, subtotal, deliveryFee, total, items:cart.map(i=>({productId:i.id, productName:i.name, quantity:i.qty, unitPrice:i.price}))});
      clearCart(); alert("Order placed successfully!"); onDone();
    } catch(err) { setError("Could not place order. Make sure the Java backend is running."); }
    finally { setBusy(false); }
  }
  return <main className="section wrap"><span className="eyebrow">CHECKOUT</span><h1>Complete your order</h1><form className="checkout" onSubmit={submit}><div className="form-card"><label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Phone<input required type="tel" inputMode="numeric" pattern="[0-9]+" maxLength="15" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value.replace(/\D/g,"")})}/></label><label>Delivery address<textarea required value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><label>Notes (optional)<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><label>Payment<select value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})}><option value="COD">Cash on Delivery</option><option value="PAY_AT_CAFE">Pay at Cafe</option></select></label>{error&&<p className="error">{error}</p>}<button className="primary full" disabled={busy}>{busy?"Placing order...":"Place Order — "+money(total)}</button></div></form></main>;
}

function AuthPage({mode,onAuth,role="CUSTOMER"}) {
  const isLogin=mode==="login"; const isAdmin=role==="ADMIN";
  const [form,setForm]=useState({name:"",email:"",password:"",phone:"",address:""}); const [error,setError]=useState("");
  function submit(e){e.preventDefault();setError("");try{const u=isLogin?login(form.email,form.password):register(form.name,form.email,form.password,form.phone,form.address);if(isAdmin&&u.role!=="ADMIN")throw new Error("This account is not an admin account.");onAuth(u)}catch(err){setError(err.message)}}
  return <main className="section narrow"><div className="auth-card">
    <div className="role-switch"><button type="button" className={!isAdmin?"role-btn active":"role-btn"} onClick={()=>location.hash=isLogin?"login":"register"}>👤 User</button><button type="button" className={isAdmin?"role-btn active":"role-btn"} onClick={()=>location.hash="admin-login"}>🔐 Admin</button></div>
    <span className="eyebrow">{isAdmin?"ADMIN AREA":isLogin?"WELCOME BACK":"JOIN ZAM ZAM"}</span><h1>{isAdmin?"Admin Login":isLogin?"Login":"Create account"}</h1><p>{isAdmin?"Login to manage products and customer orders.":isLogin?"Sign in to continue your order.":"Create an account once. Your phone and address will be saved for faster checkout."}</p>
    <form onSubmit={submit}>{!isLogin&&<>
      <label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label>Phone number<input required type="tel" inputMode="numeric" pattern="[0-9]+" maxLength="15" placeholder="03XXXXXXXXX" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value.replace(/\D/g,"")})}/></label>
      <label>Address<textarea required value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
    </>}<label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label>Password<input type="password" required minLength="6" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>{error&&<p className="error">{error}</p>}<button className="primary full">{isAdmin?"Login as Admin":isLogin?"Login":"Register"}</button></form>
    {!isAdmin && (isLogin?<p className="switch">Don't have an account? <button type="button" onClick={()=>location.hash="register"}>Register</button></p>:<p className="switch">Already have an account? <button type="button" onClick={()=>location.hash="login"}>Login</button></p>)}
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
  return <main className="section wrap"><span className="eyebrow">MY ORDERS</span><h1>Track your orders</h1>{loading?<p className="muted">Loading orders...</p>:!orders.length?<div className="empty-box"><h2>No orders yet</h2><p>Your order status will appear here after checkout.</p></div>:<div className="orders-list">{orders.map(o=>{const current=steps.indexOf(o.status); const cancelled=o.status==="CANCELLED"; return <article className="order-card customer-order" key={o.id}><div className="order-main"><div className="order-heading"><b>Order #{o.id}</b><span className={cancelled?"status-badge cancelled":"status-badge"}>{labels[o.status]||o.status}</span></div><p className="order-items">{o.items?.map(i=>`${i.productName} × ${i.quantity}`).join(", ")}</p><p className="order-address">Deliver to: {o.address}</p><div className={cancelled?"order-tracker is-cancelled":"order-tracker"}>{cancelled?<div className="cancelled-message">This order was cancelled by the cafe.</div>:steps.map((step,index)=><div className={index<=current?"tracker-step active":"tracker-step"} key={step}><span>{index<current||o.status==="COMPLETED"?"✓":index+1}</span><small>{labels[step]}</small></div>)}</div></div><div className="order-total"><strong>{money(o.total)}</strong><small>Placed with Cash / Cafe payment</small></div></article>})}</div>}</main>;
}

function AccessDenied({onLogin}) {
  return <main className="section narrow"><div className="empty-box"><h2>Admin access required</h2><p>Please login with an admin account.</p><button className="primary" onClick={onLogin}>Go to Login</button></div></main>;
}

function AdminPage({products,setProducts}) {
  return <main className="section wrap"><span className="eyebrow">ADMIN AREA</span><h1>Dashboard</h1><div className="admin-tabs"><button>Products</button><button onClick={()=>document.getElementById("orders").scrollIntoView({behavior:"smooth"})}>Orders</button></div><AdminProducts products={products} setProducts={setProducts}/><div id="orders"><AdminOrders/></div></main>;
}

function AdminProducts({products,setProducts}) {
  const blank={name:"",description:"",price:"",category:"",imageUrl:"",available:true}; const [form,setForm]=useState(blank); const [editing,setEditing]=useState(null); const [msg,setMsg]=useState(""); const [saving,setSaving]=useState(false);
  async function fileToDataUrl(file){
    if(!file)return "";
    if(!file.type.startsWith("image/")) throw new Error("Please select an image file.");
    if(file.size>6*1024*1024) throw new Error("Image must be 6MB or smaller.");
    return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const max=1200;const scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",0.82));};img.onerror=()=>reject(new Error("Could not read image."));img.src=reader.result};reader.onerror=()=>reject(new Error("Could not read image."));reader.readAsDataURL(file)})
  }
  async function chooseImage(file){try{const imageUrl=await fileToDataUrl(file);setForm(f=>({...f,imageUrl}));setMsg("")}catch(e){setMsg(e.message)}}
  async function save(e){e.preventDefault();setSaving(true);setMsg("");try{const payload={...form,price:Number(form.price)};const saved=editing?await updateProduct(editing,payload):await createProduct(payload);setProducts(p=>editing?p.map(x=>x.id===editing?saved:x):[...p,saved]);setForm(blank);setEditing(null);setMsg("Product saved successfully.")}catch(e){setMsg(e.message||"Could not save product. Make sure the Java backend is running.")}finally{setSaving(false)}}
  async function remove(id){if(!confirm("Delete this product?"))return;try{await deleteProduct(id);setProducts(p=>p.filter(x=>x.id!==id));setMsg("Product deleted.")}catch(e){setMsg(e.message||"Could not delete product.")}}
  function edit(p){setEditing(p.id);setForm({name:p.name,description:p.description||"",price:p.price,category:p.category||"",imageUrl:p.imageUrl||"",available:p.available!==false});setMsg("");window.scrollTo({top:0,behavior:"smooth"})}
  return <section className="admin-panel"><div className="admin-form"><div className="admin-form-head"><div><span className="eyebrow">PRODUCT MANAGER</span><h2>{editing?"Edit product":"Add a new product"}</h2></div><span className="admin-count">{products.length} items</span></div><form onSubmit={save}><div className="two"><label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Price (Rs.)<input required type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label></div><label>Category<input placeholder="Burgers, Pizza, Drinks..." value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>Product image<div className="image-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();chooseImage(e.dataTransfer.files?.[0])}}>{form.imageUrl?<img src={form.imageUrl} alt="Preview"/>:<div className="drop-copy"><span className="upload-icon">📷</span><strong>Drag & drop an image here</strong><span>or choose an image from your computer</span><label className="upload-btn secondary">Choose Image<input hidden type="file" accept="image/*" onChange={e=>chooseImage(e.target.files?.[0])}/></label><small>JPG, PNG, WEBP • max 6MB</small></div>}</div>{form.imageUrl&&<div className="image-actions"><label className="upload-btn secondary">Change Image<input hidden type="file" accept="image/*" onChange={e=>chooseImage(e.target.files?.[0])}/></label><button type="button" className="secondary" onClick={()=>setForm(f=>({...f,imageUrl:""}))}>Remove</button></div>}</label><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label className="check"><input type="checkbox" checked={form.available} onChange={e=>setForm({...form,available:e.target.checked})}/> Available for customers</label>{msg&&<p className={msg.toLowerCase().includes("success")?"success":"error"}>{msg}</p>}<button className="primary">{saving?"Saving...":editing?"Update product":"Add product"}</button>{editing&&<button type="button" className="secondary" onClick={()=>{setEditing(null);setForm(blank);setMsg("")}}>Cancel</button>}</form></div><div className="admin-products"><div className="admin-form-head"><div><span className="eyebrow">YOUR CATALOG</span><h2>Products</h2></div></div>{products.map(p=><div className="admin-product" key={p.id}><img src={p.imageUrl||"https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=300&q=80"}/><div><b>{p.name}</b><small>{p.category||"Uncategorized"} • {money(p.price)}</small></div><button type="button" onClick={()=>edit(p)}>Edit</button><button type="button" className="danger" onClick={()=>remove(p.id)}>Delete</button></div>)}{!products.length&&<p className="muted">No products yet.</p>}</div></section>;
}

function AdminOrders() {
  const [orders,setOrders]=useState([]); const [err,setErr]=useState("");
  useEffect(()=>{getOrders().then(setOrders).catch(()=>setErr("Start the Java backend to load orders."))},[]);
  async function status(id,s){try{const o=await updateOrderStatus(id,s);setOrders(x=>x.map(a=>a.id===id?o:a))}catch{setErr("Could not update order.")}}
  async function remove(id){if(!confirm("Delete this order?"))return;try{await deleteOrder(id);setOrders(x=>x.filter(a=>a.id!==id))}catch{setErr("Could not delete order.")}}
  return <section className="admin-orders"><h2>Customer Orders</h2>{err&&<p className="error">{err}</p>}{!orders.length&&!err&&<p className="muted">No orders yet.</p>}{orders.map(o=><div className="order-card" key={o.id}><div><b>Order #{o.id}</b><p>{o.customerName || o.name || "Customer"} • {o.phone}</p><p>{o.address}</p><small>{o.items?.map(i=>`${i.productName} × ${i.quantity}`).join(", ")}</small></div><div><strong>{money(o.total)}</strong><select value={o.status} onChange={e=>status(o.id,e.target.value)}><option>NEW</option><option>CONFIRMED</option><option>PREPARING</option><option>OUT_FOR_DELIVERY</option><option>COMPLETED</option><option>CANCELLED</option></select><button className="danger" onClick={()=>remove(o.id)}>Delete</button></div></div>)}</section>;
}