import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react"
import { apiUrl } from "./api"
import { defaultAboutPage, type AboutPageContent } from "./aboutContent"
import projectLogo from "./brand"

type AdminSession = { name?: string; email?: string; token?: string }
type Product = { id: number | string; name: string; category?: string; price?: number; image?: string; image_url?: string; description?: string; dimensions?: string; stock?: number; badge?: string }
type Order = { id: number | string; name?: string; email?: string; total_amount?: number; status?: string; payment_status?: string; created_at?: string; items?: Array<{ name?: string; product_id?: number | string; price?: number; qty?: number; quantity?: number }> }
type Customer = { id: number | string; name?: string; email?: string; phone?: string; created_at?: string }
type Message = { id: number | string; name?: string; email?: string; subject?: string; body?: string; created_at?: string; is_read?: boolean }
type Category = { id: string; name: string }
type Settings = { storeName?: string; storeEmail?: string; storePhone?: string; storeAddress?: string; aboutPage?: AboutPageContent; [key: string]: unknown }
type AboutImageField = "heroImage" | "profileImage" | "profileDetailImage" | "visionImage"
type View = "overview" | "orders" | "products" | "customers" | "messages" | "categories" | "settings"

const aboutTextFields: Array<keyof Omit<AboutPageContent, "facts" | "practiceItems">> = [
  "heroEyebrow", "heroTitle", "heroTitleAccent", "heroText", "heroImage", "heroImageAlt", "heroImageCaption", "heroPrimaryLabel", "heroSecondaryLabel",
  "statementLocation", "statementQuote", "profileEyebrow", "profileTitle", "profileTitleAccent", "profileLead", "profileStory", "profileImage", "profileDetailImage", "profileImageAlt", "profileDetailImageAlt", "profileCaption", "profileButtonLabel",
  "visionEyebrow", "visionTitle", "visionText", "visionOwner", "visionImage", "visionImageAlt", "practiceEyebrow", "practiceTitle", "practiceText", "ctaEyebrow", "ctaTitle", "ctaText", "ctaButtonLabel",
]

function readAdminSession(): AdminSession | null {
  try { return JSON.parse(sessionStorage.getItem("mthunziAdminAuth") || "null") }
  catch { return null }
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    customers: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5" /></>,
    edit: <><path d="m14 4 6 6L8 22H2v-6L14 4Z" /><path d="m12 6 6 6" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    orders: <><path d="M6 3h12l2 5H4l2-5Z" /><path d="M5 8v13h14V8M9 12h6" /></>,
    products: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.5 7.5 4 7.5-4M12 21v-9.5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.5a7 7 0 0 0 0-3l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2.6-1.5L13.5 2h-4L9 5a7 7 0 0 0-2.6 1.5L4 5.5 2 9l2 1.5a7 7 0 0 0 0 3L2 15l2 3.5 2.4-1A7 7 0 0 0 9 19l.5 3h4l.5-3a7 7 0 0 0 2.6-1.5l2.4 1L21 15l-2-1.5Z" /></>,
    tag: <><path d="M20 13 13 20 4 11V4h7l9 9Z" /><circle cx="8.5" cy="8.5" r="1" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.grid}</svg>
}

export default function AdminPage() {
  const [admin, setAdmin] = useState(readAdminSession)
  const [view, setView] = useState<View>("overview")
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<Settings>({})
  const [aboutImages, setAboutImages] = useState<Partial<Record<AboutImageField, string>>>({})
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [search, setSearch] = useState("")
  const [mobileMenu, setMobileMenu] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(admin?.token ? { Authorization: `Bearer ${admin.token}` } : {}),
        ...init.headers,
      },
    })
    const body = await response.json().catch(() => ({}))
    if (response.status === 401) {
      sessionStorage.removeItem("mthunziAdminAuth")
      window.location.replace("/admin-login.html")
      throw new Error("Your admin session has expired. Please sign in again.")
    }
    if (!response.ok) throw new Error(body.error || "The request could not be completed.")
    return body.data as T
  }

  async function loadData() {
    setLoading(true)
    setError("")
    const results = await Promise.allSettled([
      request<Product[]>("/api/products"),
      request<Order[]>("/api/admin/orders"),
      request<Customer[]>("/api/admin/customers"),
      request<Message[]>("/api/admin/messages"),
      request<Settings>("/api/site-settings"),
      request<Category[]>("/api/categories"),
    ])
    const [productData, orderData, customerData, messageData, settingsData, categoryData] = results
    if (productData.status === "fulfilled") setProducts(Array.isArray(productData.value) ? productData.value : [])
    if (orderData.status === "fulfilled") setOrders(Array.isArray(orderData.value) ? orderData.value : [])
    if (customerData.status === "fulfilled") setCustomers(Array.isArray(customerData.value) ? customerData.value : [])
    if (messageData.status === "fulfilled") setMessages(Array.isArray(messageData.value) ? messageData.value : [])
    if (settingsData.status === "fulfilled") setSettings(settingsData.value || {})
    if (categoryData.status === "fulfilled") setCategories(Array.isArray(categoryData.value) ? categoryData.value : [])
    const failure = results.find((result) => result.status === "rejected")
    if (failure?.status === "rejected") setError(failure.reason instanceof Error ? failure.reason.message : "Some store data could not be loaded.")
    setLoading(false)
  }

  useEffect(() => {
    if (!admin?.token) {
      window.location.replace("/admin-login.html")
      return
    }
    void loadData()
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(""), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  function readAboutImage(event: ChangeEvent<HTMLInputElement>, field: AboutImageField) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.")
      event.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = () => setAboutImages((current) => ({ ...current, [field]: String(reader.result || "") }))
    reader.onerror = () => setError("Unable to read that image. Please try another file.")
    reader.readAsDataURL(file)
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const stock = Math.max(0, Number(values.get("stock") || 0))
    const productId = editingProduct?.id
    setBusy(true)
    setError("")
    try {
      await request(productId && Number(productId) > 0 ? `/api/admin/products/${encodeURIComponent(String(productId))}` : "/api/admin/products", {
        method: productId && Number(productId) > 0 ? "PATCH" : "POST",
        body: JSON.stringify({
          name: String(values.get("name") || "").trim(),
          category: String(values.get("category") || "Others").trim(),
          description: String(values.get("description") || "").trim(),
          price: Number(values.get("price") || 0),
          image_url: String(values.get("image") || "").trim(),
          dimensions: String(values.get("dimensions") || "").trim(),
          stock,
          in_stock: stock > 0,
          badge: String(values.get("badge") || "").trim(),
        }),
      })
      setEditingProduct(null)
      setNotice(productId && Number(productId) > 0 ? "Product updated." : "Product added.")
      form.reset()
      await loadData()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save product.")
    } finally {
      setBusy(false)
    }
  }

  async function deleteRecord(type: "products" | "customers" | "messages", id: number | string) {
    if (!window.confirm("Delete this record? This cannot be undone.")) return
    setBusy(true)
    setError("")
    try {
      await request(`/api/admin/${type}/${encodeURIComponent(String(id))}`, { method: "DELETE" })
      setNotice("Record deleted.")
      await loadData()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete record.")
    } finally {
      setBusy(false)
    }
  }

  async function updateOrder(id: number | string, status: string) {
    setBusy(true)
    setError("")
    try {
      await request(`/api/admin/orders/${encodeURIComponent(String(id))}`, { method: "PATCH", body: JSON.stringify({ status }) })
      setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order))
      setNotice(`Order #${id} status updated.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update order.")
    } finally {
      setBusy(false)
    }
  }

  async function openMessage(message: Message) {
    setSelectedMessage(message)
    if (message.is_read) return
    try {
      await request<Message>(`/api/admin/messages/${encodeURIComponent(String(message.id))}/read`, { method: "PATCH" })
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, is_read: true } : item))
      setSelectedMessage({ ...message, is_read: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to mark the message as read.")
    }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setError("")
    try {
      setCategories(await request<Category[]>("/api/admin/categories", { method: "POST", body: JSON.stringify({ name: String(values.get("name") || "").trim() }) }))
      form.reset()
      setNotice("Category added.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add category.")
    } finally {
      setBusy(false)
    }
  }

  async function deleteCategory(id: string) {
    if (!window.confirm("Delete this category?")) return
    setBusy(true)
    setError("")
    try {
      setCategories(await request<Category[]>(`/api/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE" }))
      setNotice("Category deleted.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete category.")
    } finally {
      setBusy(false)
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setBusy(true)
    setError("")
    try {
      setSettings(await request<Settings>("/api/admin/site-settings", {
        method: "PUT",
        body: JSON.stringify({ ...settings, storeName: values.get("storeName"), storeEmail: values.get("storeEmail"), storePhone: values.get("storePhone"), storeAddress: values.get("storeAddress") }),
      }))
      setNotice("Store settings saved.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save settings.")
    } finally {
      setBusy(false)
    }
  }

  async function saveAboutPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setBusy(true)
    setError("")
    try {
      const aboutValues = Object.fromEntries(aboutTextFields.map((field) => [field, String(values.get(field) ?? "")])) as Pick<AboutPageContent, typeof aboutTextFields[number]>
      const nextAboutPage: AboutPageContent = {
        ...aboutPage,
        ...aboutValues,
        facts: aboutPage.facts.map((_, index) => ({
          title: String(values.get(`factTitle${index}`) || "").trim(),
          detail: String(values.get(`factDetail${index}`) || "").trim(),
        })),
        practiceItems: aboutPage.practiceItems.map((_, index) => String(values.get(`practiceItem${index}`) || "").trim()).filter(Boolean),
      }
      setSettings(await request<Settings>("/api/admin/site-settings", {
        method: "PUT",
        body: JSON.stringify({ ...settings, aboutPage: nextAboutPage }),
      }))
      setAboutImages({})
      setNotice("About page saved.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the About page.")
    } finally {
      setBusy(false)
    }
  }

  async function updateCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setError("")
    try {
      const result = await request<{ email: string }>("/api/admin/credentials", {
        method: "PUT",
        body: JSON.stringify({ email: values.get("email"), currentPassword: values.get("currentPassword"), newPassword: values.get("newPassword") }),
      })
      setNotice("Administrator credentials updated. Sign in again with the new details.")
      sessionStorage.removeItem("mthunziAdminAuth")
      form.reset()
      window.setTimeout(() => window.location.assign("/admin-login.html"), 1200)
      setAdmin((current) => current ? { ...current, email: result.email } : current)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update credentials.")
    } finally {
      setBusy(false)
    }
  }

  function signOut() {
    sessionStorage.removeItem("mthunziAdminAuth")
    window.location.assign("/admin-login.html")
  }

  const navigation: Array<{ id: View; label: string; icon: string }> = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "orders", label: "Orders", icon: "orders" },
    { id: "products", label: "Products", icon: "products" },
    { id: "customers", label: "Customers", icon: "customers" },
    { id: "messages", label: "Messages", icon: "mail" },
    { id: "categories", label: "Categories", icon: "tag" },
    { id: "settings", label: "Settings", icon: "settings" },
  ]
  const adminName = admin?.name || admin?.email || "Administrator"
  const aboutPage = settings.aboutPage || defaultAboutPage
    const unreadMessageCount = messages.filter((message) => !message.is_read).length
  const initials = adminName.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A"
  const fieldClass = "admin-field"
  const matchedProducts = products.filter((product) => `${product.name} ${product.category || ""}`.toLowerCase().includes(search.toLowerCase()))
  const matchedOrders = orders.filter((order) => `${order.id} ${order.name || ""} ${order.email || ""}`.toLowerCase().includes(search.toLowerCase()))
  const matchedCustomers = customers.filter((customer) => `${customer.name || ""} ${customer.email || ""} ${customer.phone || ""}`.toLowerCase().includes(search.toLowerCase()))
  const pendingOrders = orders.filter((order) => order.status?.toLowerCase() === "pending").length
  const paidRevenue = orders.reduce((sum, order) => order.payment_status?.toLowerCase() === "paid" ? sum + Number(order.total_amount || 0) : sum, 0)
  const lowStock = products.filter((product) => Number(product.stock || 0) <= 3)
  const salesMap = new Map<string, { quantity: number; revenue: number }>()
  orders.forEach((order) => order.items?.forEach((item) => {
    const productId = String(item.product_id || item.name || "")
    const sale = salesMap.get(productId) || { quantity: 0, revenue: 0 }
    const quantity = Number(item.qty || item.quantity || 1)
    sale.quantity += quantity
    sale.revenue += quantity * Number(item.price || 0)
    salesMap.set(productId, sale)
  }))
  const bestSellers = products.map((product) => {
    const sales = salesMap.get(String(product.id)) || salesMap.get(product.name) || { quantity: 0, revenue: 0 }
    return { ...product, ...sales }
  }).sort((a, b) => b.quantity - a.quantity).slice(0, 4)
  const salesWeeks = Array.from({ length: 8 }, (_, index) => {
    const weeksAgo = 7 - index
    const amount = orders.reduce((total, order) => {
      const age = Date.now() - new Date(order.created_at || 0).getTime()
      return age >= weeksAgo * 7 * 86400000 && age < (weeksAgo + 1) * 7 * 86400000 ? total + Number(order.total_amount || 0) : total
    }, 0)
    return { label: weeksAgo ? `-${weeksAgo}w` : "Now", amount }
  })
  const maxWeeklySales = Math.max(1, ...salesWeeks.map((week) => week.amount))
  const activeTitle = navigation.find((item) => item.id === view)?.label || "Overview"
  const openNewProduct = () => setEditingProduct({ id: 0, name: "", category: categories[0]?.name || "", price: 0, stock: 0 })
  const aboutField = (name: string, label: string, value: string, multiline = false) => (
    <label className="about-editor-field">{label}{multiline
      ? <textarea className="admin-field" name={name} rows={3} defaultValue={value} />
      : <input className="admin-field" name={name} defaultValue={value} />}</label>
  )
  const aboutImageField = (field: AboutImageField, label: string) => {
    const image = aboutImages[field] ?? aboutPage[field]
    return <div className="about-image-field"><label className="about-editor-field">{label}<input className="admin-field" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => readAboutImage(event, field)} /></label><input type="hidden" name={field} value={image} readOnly />{image && <div className="about-image-preview"><img src={image} alt={`${label} preview`} /><button className="plain-link danger-link" type="button" onClick={() => setAboutImages((current) => ({ ...current, [field]: "" }))}>Remove image</button></div>}</div>
  }

  return (
    <main className="admin-shell">
      <aside className={`admin-sidebar ${mobileMenu ? "mobile-open" : ""}`}>
        <div className="admin-logo"><img src={projectLogo} alt="Mthunzi Creations" /><small>ADMIN STUDIO</small><button className="admin-menu-close" onClick={() => setMobileMenu(false)} aria-label="Close admin menu">×</button></div>
        <nav aria-label="Workspace navigation"><small>WORKSPACE</small>{navigation.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileMenu(false) }}><Icon name={item.icon} />{item.label}{item.id === "orders" && pendingOrders > 0 && <i>{pendingOrders}</i>}{item.id === "messages" && unreadMessageCount > 0 && <i>{unreadMessageCount}</i>}</button>)}</nav>
        <div className="admin-sidebar-bottom"><button onClick={() => window.location.assign("/index.html")}><Icon name="arrow" />View storefront</button><div><span>{initials}</span><p><b>{adminName}</b><small>Administrator</small></p></div></div>
      </aside>
      {mobileMenu && <button className="admin-menu-backdrop" onClick={() => setMobileMenu(false)} aria-label="Close admin menu" />}
      <section className="admin-main">
        <header className="admin-topbar"><div className="admin-title-area"><button className="admin-menu-trigger" onClick={() => setMobileMenu(true)} aria-label="Open admin menu"><Icon name="menu" size={21} /></button><div><small>STUDIO ADMINISTRATION</small><h1>{activeTitle}</h1></div></div><div className="admin-top-actions"><label><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records..." aria-label="Search records" /></label><button className="notification-button" aria-label="View enquiries" onClick={() => setView("messages")}><Icon name="bell" />{messages.length > 0 && <i />}</button><span className="admin-avatar" aria-label={adminName}>{initials}</span></div></header>
          <header className="admin-topbar"><div className="admin-title-area"><button className="admin-menu-trigger" onClick={() => setMobileMenu(true)} aria-label="Open admin menu"><Icon name="menu" size={21} /></button><div><small>STUDIO ADMINISTRATION</small><h1>{activeTitle}</h1></div></div><div className="admin-top-actions"><label><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records..." aria-label="Search records" /></label><button className="notification-button" aria-label={unreadMessageCount ? `${unreadMessageCount} unread enquiries` : "View enquiries"} onClick={() => setView("messages")}><Icon name="bell" />{unreadMessageCount > 0 && <i />}</button><span className="admin-avatar" aria-label={adminName}>{initials}</span></div></header>
        {error && <p className="admin-alert" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
        {loading && <div className="admin-content"><p>Loading store data…</p></div>}

        {!loading && view === "overview" && <div className="admin-content">
          <div className="admin-welcome"><div><span className="live-dot">LIVE STORE</span><h2>Good morning, {adminName.split(/[\s@]+/)[0]}.</h2><p>Here is what is happening in your studio today.</p></div><button className="admin-primary" onClick={openNewProduct}>+ Add new product</button></div>
          <div className="metric-grid">
            <article className="metric-card"><div className="metric-icon"><Icon name="orders" /></div><span>Total orders</span><strong>{orders.length.toLocaleString()}</strong><p><b>{pendingOrders}</b> pending fulfilment</p></article>
            <article className="metric-card"><div className="metric-icon"><Icon name="chart" /></div><span>Paid revenue</span><strong>MK {paidRevenue.toLocaleString()}</strong><p>Confirmed payments</p></article>
            <article className="metric-card"><div className="metric-icon"><Icon name="customers" /></div><span>Customers</span><strong>{customers.length.toLocaleString()}</strong><p>Registered accounts</p></article>
            <article className="metric-card"><div className="metric-icon alert"><Icon name="products" /></div><span>Products</span><strong>{products.length.toLocaleString()}</strong><p className="alert"><b>{lowStock.length}</b> low stock</p></article>
          </div>
          <div className="admin-grid-main">
            <article className="admin-card sales-card"><div className="card-heading"><div><small>PERFORMANCE</small><h3>Sales overview</h3></div><div className="chart-legend"><span><i />Last 8 weeks</span><b>MK {salesWeeks.reduce((sum, week) => sum + week.amount, 0).toLocaleString()}</b></div></div><div className="bar-chart">{salesWeeks.map((week, index) => <div className="bar-slot" key={week.label}><div className="bar-value" style={{ height: `${Math.max(8, week.amount / maxWeeklySales * 100)}%` }}><span>MK {week.amount.toLocaleString()}</span></div><small>{week.label}</small>{index === 3 && <i />}</div>)}</div><div className="chart-months"><span>8 WEEKS AGO</span><span>THIS WEEK</span></div></article>
            <article className="admin-card best-sellers"><div className="card-heading"><div><small>FROM ORDER HISTORY</small><h3>Best selling</h3></div><button onClick={() => setView("products")}>View all</button></div>{bestSellers.map((product, index) => <div className="seller-row" key={product.id}><b>0{index + 1}</b><img src={product.image || product.image_url || ""} alt="" /><div><strong>{product.name}</strong><small>{product.category || "Artwork"}</small></div><span>{product.quantity} sold<small>MK {product.revenue.toLocaleString()}</small></span></div>)}{bestSellers.length === 0 && <p className="admin-empty-copy">Sales will appear here as orders come in.</p>}</article>
          </div>
          <div className="admin-grid-bottom">
            <article className="admin-card recent-orders"><div className="card-heading"><div><small>LIVE ACTIVITY</small><h3>Recent orders</h3></div><button onClick={() => setView("orders")}>View all orders</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.slice(0, 4).map((order) => <tr key={order.id}><td><b>#{order.id}</b></td><td><div><b>{order.name || "Customer"}</b><small>{order.email || ""}</small></div></td><td>MK {Number(order.total_amount || 0).toLocaleString()}</td><td><span className={`status-pill ${String(order.status || "pending").toLowerCase()}`}>{order.status || "Pending"}</span></td></tr>)}</tbody></table></div>{orders.length === 0 && <p className="admin-empty-copy">No orders have been placed yet.</p>}</article>
            <article className="admin-card low-stock"><div className="card-heading"><div><small>INVENTORY</small><h3>Low in stock</h3></div><span>{lowStock.length} items</span></div>{lowStock.slice(0, 5).map((product) => <div className="stock-row" key={product.id}><img src={product.image || product.image_url || ""} alt="" /><div><b>{product.name}</b><small>{product.category || "Artwork"}</small></div><span className={Number(product.stock || 0) <= 1 ? "critical" : ""}>{Number(product.stock || 0)} left</span><button onClick={() => { setEditingProduct(product); setView("products") }}>Restock</button></div>)}{lowStock.length === 0 && <p className="admin-empty-copy">No products need restocking.</p>}</article>
          </div>
        </div>}

        {!loading && view === "orders" && <div className="admin-content"><div className="admin-page-tools"><div><h2>All orders</h2><p>Track payments, fulfilment, and live customer orders.</p></div></div><div className="admin-card table-card"><div className="table-filter"><span>{matchedOrders.length} orders</span><label><Icon name="search" size={16} /><input aria-label="Search orders" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders" /></label></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Placed</th></tr></thead><tbody>{matchedOrders.map((order) => <tr key={order.id}><td><b>#{order.id}</b></td><td><div><b>{order.name || "Customer"}</b><small>{order.email || ""}</small></div></td><td>{order.items?.map((item) => `${item.name || "Artwork"} × ${item.qty || item.quantity || 1}`).join(", ") || "—"}</td><td>MK {Number(order.total_amount || 0).toLocaleString()}</td><td>{order.payment_status || "—"}</td><td><select className="admin-status-select" value={order.status || "Pending"} disabled={busy} onChange={(event) => void updateOrder(order.id, event.target.value)}>{["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map((status) => <option key={status}>{status}</option>)}</select></td><td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>{matchedOrders.length === 0 && <p className="admin-empty-copy">No matching orders.</p>}</div></div>}

        {!loading && view === "products" && <div className="admin-content"><div className="admin-page-tools"><div><h2>Product catalogue</h2><p>Edit inventory, pricing, product details, and availability.</p></div><button className="admin-primary" onClick={openNewProduct}>+ Add product</button></div><div className="admin-card table-card"><div className="table-filter"><span>{matchedProducts.length} products</span><label><Icon name="search" size={16} /><input aria-label="Search products" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" /></label></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{matchedProducts.map((product) => <tr key={product.id}><td><div className="table-product"><img src={product.image || product.image_url || ""} alt="" /><div><b>{product.name}</b><small>SKU-MC-{String(product.id).padStart(3, "0")}</small></div></div></td><td>{product.category || "Artwork"}</td><td>MK {Number(product.price || 0).toLocaleString()}</td><td><span className={`stock-pill ${Number(product.stock || 0) <= 3 ? "warning" : ""}`}>{Number(product.stock || 0)} in stock</span></td><td><div className="row-actions"><button onClick={() => setEditingProduct(product)} aria-label={`Edit ${product.name}`}><Icon name="edit" size={16} /></button><button className="danger" onClick={() => void deleteRecord("products", product.id)} aria-label={`Delete ${product.name}`}><Icon name="trash" size={16} /></button></div></td></tr>)}</tbody></table></div>{matchedProducts.length === 0 && <p className="admin-empty-copy">No matching products.</p>}</div></div>}

        {!loading && view === "customers" && <div className="admin-content"><div className="admin-page-tools"><div><h2>Customer directory</h2><p>Customer contact information and registration dates.</p></div></div><div className="admin-card table-card"><div className="admin-table-wrap"><table className="admin-table customer-table"><thead><tr><th>Customer</th><th>Phone</th><th>Joined</th><th></th></tr></thead><tbody>{matchedCustomers.map((customer) => <tr key={customer.id}><td><div className="customer-name"><span>{(customer.name || "C").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div><b>{customer.name || "Customer"}</b><small>{customer.email || ""}</small></div></div></td><td>{customer.phone || "—"}</td><td>{customer.created_at ? new Date(customer.created_at).toLocaleDateString() : "—"}</td><td><button className="plain-link danger-link" onClick={() => void deleteRecord("customers", customer.id)}>Remove</button></td></tr>)}</tbody></table></div>{matchedCustomers.length === 0 && <p className="admin-empty-copy">No matching customers.</p>}</div></div>}

        {!loading && view === "messages" && <div className="admin-content"><div className="admin-page-tools"><div><h2>Customer enquiries</h2><p>{unreadMessageCount} unread · {messages.length} total</p></div></div><div className="admin-card table-card message-list">{messages.map((item) => <article className={`admin-message-row ${item.is_read ? "read" : "unread"}`} key={item.id}><div className="admin-message-summary"><div className="admin-message-sender"><span className="message-status" aria-label={item.is_read ? "Read" : "Unread"} /><div><p>{item.name} · <a href={`mailto:${item.email}`}>{item.email}</a> · {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</p><h3>{item.subject}</h3></div></div><div className="message-actions"><button className="admin-secondary" onClick={() => void openMessage(item)}>Open message</button><button className="plain-link danger-link" disabled={busy} onClick={() => void deleteRecord("messages", item.id)}>Delete</button></div></div></article>)}{messages.length === 0 && <p className="admin-empty-copy">No enquiries yet.</p>}</div></div>}

        {!loading && view === "categories" && <div className="admin-content"><div className="admin-page-tools"><div><h2>Product categories</h2><p>Organise the catalogue and manage how collectors browse.</p></div></div><div className="category-admin-grid"><form className="admin-card add-category" onSubmit={saveCategory}><small>NEW CATEGORY</small><h3>Add a category</h3><label>Category name<input className={fieldClass} name="name" placeholder="e.g. Sculpture" required /></label><button className="admin-primary" disabled={busy}>{busy ? "Adding…" : "Add category"}</button></form><div className="admin-card category-list"><div className="card-heading"><div><small>CATALOGUE</small><h3>Current categories</h3></div><span>{categories.length} total</span></div>{categories.map((category) => <div className="category-admin-row" key={category.id}><span><Icon name="tag" size={17} /></span><div><b>{category.name}</b><small>{products.filter((product) => product.category === category.name).length} products</small></div><button disabled={busy} onClick={() => void deleteCategory(category.id)} aria-label={`Delete ${category.name}`}><Icon name="trash" size={16} /></button></div>)}</div></div></div>}

        {!loading && view === "settings" && <div className="admin-content">
          <div className="admin-page-tools"><div><h2>Store settings</h2><p>Manage public contact information, administrator access, and About-page content.</p></div></div>
          <div className="admin-settings-grid">
            <form className="admin-card settings-form" onSubmit={saveSettings}><div className="card-heading"><div><small>STORE PROFILE</small><h3>Contact details</h3></div></div><label>Store name<input className={fieldClass} name="storeName" defaultValue={String(settings.storeName || "Mthunzi Creations")} /></label><label>Email<input className={fieldClass} name="storeEmail" type="email" defaultValue={String(settings.storeEmail || "")} /></label><label>Phone<input className={fieldClass} name="storePhone" defaultValue={String(settings.storePhone || "")} /></label><label>Address<input className={fieldClass} name="storeAddress" defaultValue={String(settings.storeAddress || "")} /></label><button className="admin-primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button></form>
            <form className="admin-card settings-form" onSubmit={updateCredentials}><div className="card-heading"><div><small>ACCESS</small><h3>Administrator credentials</h3></div></div><label>New email<input className={fieldClass} name="email" type="email" defaultValue={admin?.email || ""} required /></label><label>Current password<input className={fieldClass} name="currentPassword" type="password" autoComplete="current-password" required /></label><label>New password <small>(leave blank to keep current)</small><input className={fieldClass} name="newPassword" type="password" autoComplete="new-password" /></label><button className="admin-primary" disabled={busy}>{busy ? "Saving…" : "Update credentials"}</button></form>
          </div>
          <form className="admin-card settings-form about-settings" onSubmit={saveAboutPage}>
            <div className="card-heading"><div><small>STOREFRONT CONTENT</small><h3>About page</h3></div><span>Changes appear on the public About page</span></div>
            <fieldset className="about-editor-section"><legend>Opening & artwork</legend><div className="about-editor-grid">
              {aboutField("heroEyebrow", "Intro label", aboutPage.heroEyebrow)}
              {aboutField("heroTitle", "Main heading", aboutPage.heroTitle)}
              {aboutField("heroTitleAccent", "Highlighted heading", aboutPage.heroTitleAccent)}
              {aboutField("heroText", "Introduction", aboutPage.heroText, true)}
              {aboutImageField("heroImage", "Opening image")}
              {aboutField("heroImageAlt", "Opening image description", aboutPage.heroImageAlt)}
              {aboutField("heroImageCaption", "Image caption", aboutPage.heroImageCaption)}
              {aboutField("heroPrimaryLabel", "Shop button label", aboutPage.heroPrimaryLabel)}
              {aboutField("heroSecondaryLabel", "Contact button label", aboutPage.heroSecondaryLabel)}
            </div></fieldset>
            <fieldset className="about-editor-section"><legend>Founder & studio story</legend><div className="about-editor-grid">
              {aboutField("statementLocation", "Location label", aboutPage.statementLocation)}
              {aboutField("statementQuote", "Studio statement", aboutPage.statementQuote, true)}
              {aboutField("profileEyebrow", "Story label", aboutPage.profileEyebrow)}
              {aboutField("profileTitle", "Story heading", aboutPage.profileTitle)}
              {aboutField("profileTitleAccent", "Highlighted heading", aboutPage.profileTitleAccent)}
              {aboutField("profileLead", "Story introduction", aboutPage.profileLead, true)}
              {aboutField("profileStory", "Story paragraphs (separate paragraphs with a blank line)", aboutPage.profileStory, true)}
              {aboutImageField("profileImage", "Studio image")}
              {aboutImageField("profileDetailImage", "Artwork detail image")}
              {aboutField("profileImageAlt", "Studio image description", aboutPage.profileImageAlt)}
              {aboutField("profileDetailImageAlt", "Detail image description", aboutPage.profileDetailImageAlt)}
              {aboutField("profileCaption", "Image caption", aboutPage.profileCaption)}
              {aboutField("profileButtonLabel", "Contact button label", aboutPage.profileButtonLabel)}
            </div></fieldset>
            <fieldset className="about-editor-section"><legend>Studio facts</legend><div className="about-editor-grid about-facts-editor">
              {aboutPage.facts.map((fact, index) => <div className="about-fact-editor" key={index}><small>FACT {String(index + 1).padStart(2, "0")}</small>{aboutField(`factTitle${index}`, "Title", fact.title)}{aboutField(`factDetail${index}`, "Detail", fact.detail)}</div>)}
            </div></fieldset>
            <fieldset className="about-editor-section"><legend>Owner & studio vision</legend><div className="about-editor-grid">
              {aboutField("visionEyebrow", "Section label", aboutPage.visionEyebrow)}
              {aboutField("visionTitle", "Vision heading", aboutPage.visionTitle)}
              {aboutField("visionText", "Vision statement", aboutPage.visionText, true)}
              {aboutField("visionOwner", "Attribution", aboutPage.visionOwner)}
              {aboutImageField("visionImage", "Vision image")}
              {aboutField("visionImageAlt", "Vision image description", aboutPage.visionImageAlt)}
            </div></fieldset>
            <fieldset className="about-editor-section"><legend>Practice & contact callout</legend><div className="about-editor-grid">
              {aboutField("practiceEyebrow", "Practice label", aboutPage.practiceEyebrow)}
              {aboutField("practiceTitle", "Practice heading", aboutPage.practiceTitle)}
              {aboutField("practiceText", "Practice introduction", aboutPage.practiceText, true)}
              {aboutPage.practiceItems.map((item, index) => aboutField(`practiceItem${index}`, `Service ${String(index + 1).padStart(2, "0")}`, item))}
              {aboutField("ctaEyebrow", "Callout label", aboutPage.ctaEyebrow)}
              {aboutField("ctaTitle", "Callout heading", aboutPage.ctaTitle)}
              {aboutField("ctaText", "Callout text", aboutPage.ctaText, true)}
              {aboutField("ctaButtonLabel", "Callout button label", aboutPage.ctaButtonLabel)}
            </div></fieldset>
            <button className="admin-primary" disabled={busy}>{busy ? "Saving…" : "Save About page"}</button>
          </form>
        </div>}
      </section>

      {selectedMessage && <div className="admin-modal-backdrop" onMouseDown={() => setSelectedMessage(null)}><section className="admin-modal admin-message-modal" role="dialog" aria-modal="true" aria-labelledby="message-modal-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><small>{selectedMessage.is_read ? "READ ENQUIRY" : "NEW ENQUIRY"}</small><h2 id="message-modal-title">{selectedMessage.subject}</h2></div><button onClick={() => setSelectedMessage(null)} aria-label="Close message">×</button></div><div className="message-detail"><p className="message-detail-meta">From <b>{selectedMessage.name}</b> · <a href={`mailto:${selectedMessage.email}`}>{selectedMessage.email}</a></p><p className="message-detail-date">{selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleString() : ""}</p><div className="message-detail-body">{selectedMessage.body}</div><button className="admin-secondary" onClick={() => setSelectedMessage(null)}>Close</button></div></section></div>}
      {editingProduct && <div className="admin-modal-backdrop" onMouseDown={() => setEditingProduct(null)}><div className="admin-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><small>CATALOGUE</small><h2>{Number(editingProduct.id) ? "Edit product" : "Add new product"}</h2></div><button onClick={() => setEditingProduct(null)} aria-label="Close product form">×</button></div><form onSubmit={saveProduct}><label>Product name<input className={fieldClass} name="name" defaultValue={editingProduct.name} required /></label><div className="form-row"><label>Category<select className={fieldClass} name="category" defaultValue={editingProduct.category}>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label><label>Price (MK)<input className={fieldClass} name="price" type="number" min="0" defaultValue={editingProduct.price || ""} required /></label></div><div className="form-row"><label>Stock quantity<input className={fieldClass} name="stock" type="number" min="0" defaultValue={editingProduct.stock ?? 0} required /></label><label>Dimensions<input className={fieldClass} name="dimensions" defaultValue={editingProduct.dimensions || ""} /></label></div><label>Image URL<input className={fieldClass} name="image" type="url" defaultValue={editingProduct.image || editingProduct.image_url || ""} /></label><label>Description<textarea className={fieldClass} name="description" rows={3} defaultValue={editingProduct.description || ""} /></label><div className="modal-actions"><button type="button" onClick={() => setEditingProduct(null)}>Cancel</button><button className="admin-primary" disabled={busy}>{busy ? "Saving…" : Number(editingProduct.id) ? "Save changes" : "Add product"}</button></div></form></div></div>}
    </main>
  )
}