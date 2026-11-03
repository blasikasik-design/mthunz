import { useEffect, useState, type FormEvent } from "react"
import { apiUrl } from "./api"
import projectLogo from "./brand"

type AdminSession = { name?: string; email?: string; token?: string }
type AdminProduct = {
  id: number | string
  name: string
  category?: string
  price?: number
  image?: string
  image_url?: string
  description?: string
  dimensions?: string
  stock?: number
  badge?: string
}
type AdminOrder = {
  id: number | string
  user_id?: number | string
  name?: string
  email?: string
  total_amount?: number
  status?: string
  payment_status?: string
  created_at?: string
  items?: Array<{ name?: string; qty?: number; quantity?: number }>
}
type AdminCustomer = { id: number | string; name?: string; email?: string; phone?: string; created_at?: string }
type AdminMessage = { id: number | string; name?: string; email?: string; subject?: string; body?: string; created_at?: string }
type AdminCategory = { id: string; name: string }
type StoreSettings = { storeName?: string; storeEmail?: string; storePhone?: string; storeAddress?: string; [key: string]: unknown }
type AdminView = "overview" | "products" | "orders" | "customers" | "messages" | "categories" | "settings"

function readAdminSession(): AdminSession | null {
  try {
    return JSON.parse(sessionStorage.getItem("mthunziAdminAuth") || "null")
  } catch {
    return null
  }
}

export default function AdminPage() {
  const [admin, setAdmin] = useState(readAdminSession)
  const [view, setView] = useState<AdminView>("overview")
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [settings, setSettings] = useState<StoreSettings>({})
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
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
      request<AdminProduct[]>("/api/products"),
      request<AdminOrder[]>("/api/admin/orders"),
      request<AdminCustomer[]>("/api/admin/customers"),
      request<AdminMessage[]>("/api/admin/messages"),
      request<StoreSettings>("/api/site-settings"),
      request<AdminCategory[]>("/api/categories"),
    ])
    const [productResult, orderResult, customerResult, messageResult, settingsResult, categoryResult] = results
    if (productResult.status === "fulfilled") setProducts(Array.isArray(productResult.value) ? productResult.value : [])
    if (orderResult.status === "fulfilled") setOrders(Array.isArray(orderResult.value) ? orderResult.value : [])
    if (customerResult.status === "fulfilled") setCustomers(Array.isArray(customerResult.value) ? customerResult.value : [])
    if (messageResult.status === "fulfilled") setMessages(Array.isArray(messageResult.value) ? messageResult.value : [])
    if (settingsResult.status === "fulfilled") setSettings(settingsResult.value || {})
    if (categoryResult.status === "fulfilled") setCategories(Array.isArray(categoryResult.value) ? categoryResult.value : [])
    const failed = results.find((result) => result.status === "rejected")
    if (failed?.status === "rejected") setError(failed.reason instanceof Error ? failed.reason.message : "Some store data could not be loaded.")
    setLoading(false)
  }

  useEffect(() => {
    if (!admin?.token) {
      window.location.replace("/admin-login.html")
      return
    }
    void loadData()
  }, [])

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const stock = Math.max(0, Number(values.get("stock") || 0))
    setBusy(true)
    setNotice("")
    setError("")
    try {
      await request(editingProduct ? `/api/admin/products/${encodeURIComponent(String(editingProduct.id))}` : "/api/admin/products", {
        method: editingProduct ? "PATCH" : "POST",
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
      form.reset()
      setNotice(editingProduct ? "Product updated." : "Product added.")
      setEditingProduct(null)
      await loadData()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save product.")
    } finally {
      setBusy(false)
    }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setError("")
    try {
      const next = await request<AdminCategory[]>("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: String(values.get("name") || "").trim() }),
      })
      setCategories(next)
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
      const next = await request<AdminCategory[]>(`/api/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE" })
      setCategories(next)
      setNotice("Category deleted.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete category.")
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
        body: JSON.stringify({
          email: String(values.get("email") || "").trim(),
          currentPassword: String(values.get("currentPassword") || ""),
          newPassword: String(values.get("newPassword") || ""),
        }),
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
      await request(`/api/admin/orders/${encodeURIComponent(String(id))}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
      setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order))
      setNotice(`Order #${id} updated.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update order.")
      await loadData()
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
      const next = await request<StoreSettings>("/api/admin/site-settings", {
        method: "PUT",
        body: JSON.stringify({
          ...settings,
          storeName: String(values.get("storeName") || "").trim(),
          storeEmail: String(values.get("storeEmail") || "").trim(),
          storePhone: String(values.get("storePhone") || "").trim(),
          storeAddress: String(values.get("storeAddress") || "").trim(),
        }),
      })
      setSettings(next)
      setNotice("Store settings saved.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save settings.")
    } finally {
      setBusy(false)
    }
  }

  function signOut() {
    sessionStorage.removeItem("mthunziAdminAuth")
    window.location.assign("/admin-login.html")
  }

  const tabs: Array<{ id: AdminView; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "products", label: "Products" },
    { id: "orders", label: "Orders" },
    { id: "customers", label: "Customers" },
    { id: "messages", label: "Messages" },
    { id: "categories", label: "Categories" },
    { id: "settings", label: "Settings" },
  ]
  const fieldClass = "mt-2 block w-full border border-[#d6d0c6] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#a5482e]"
  const smallButtonClass = "border border-[#d6d0c6] px-3 py-2 text-xs font-semibold hover:border-[#a5482e] hover:text-[#a5482e] disabled:opacity-50"

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#26231f]">
      <header className="border-b border-[#d6d0c6] bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-5">
          <div className="flex items-center gap-3"><img className="size-11 rounded-full bg-white object-contain p-0.5" src={projectLogo} alt="" /><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a5482e]">Mthunzi Creations</p><h1 className="mt-1 font-serif text-2xl">Store operations</h1></div></div>
          <div className="flex items-center gap-4 text-sm"><span className="hidden text-[#6b655c] sm:inline">{admin?.email}</span><button className="text-[#a5482e] underline underline-offset-4" onClick={signOut}>Sign out</button></div>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8">
        <nav className="flex gap-2 overflow-x-auto border-b border-[#d6d0c6]" aria-label="Admin sections">
          {tabs.map((tab) => <button key={tab.id} className={`shrink-0 border-b-2 px-3 py-3 text-sm ${view === tab.id ? "border-[#a5482e] font-semibold" : "border-transparent text-[#6b655c]"}`} onClick={() => setView(tab.id)}>{tab.label}</button>)}
        </nav>
        {error && <p className="mt-5 border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
        {notice && <p className="mt-5 border-l-2 border-emerald-700 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{notice}</p>}
        {loading ? <p className="py-12 text-sm text-[#6b655c]">Loading store data…</p> : null}

        {!loading && view === "overview" && (
          <section className="py-8">
            <div className="grid gap-px border border-[#d6d0c6] bg-[#d6d0c6] sm:grid-cols-2 xl:grid-cols-4">
              {[["Products", products.length], ["Orders", orders.length], ["Customers", customers.length], ["Messages", messages.length]].map(([label, count]) => <div className="bg-[#f7f5ef] p-5" key={label}><p className="text-xs uppercase tracking-[.14em] text-[#817a70]">{label}</p><p className="mt-3 font-serif text-4xl">{count}</p></div>)}
            </div>
            <div className="mt-10 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a5482e]">Latest activity</p><h2 className="mt-2 font-serif text-3xl">Recent orders</h2></div><button className={smallButtonClass} onClick={() => setView("orders")}>View all orders</button></div>
            <div className="mt-5 divide-y divide-[#d6d0c6] border-y border-[#d6d0c6]">{orders.slice(0, 5).map((order) => <div className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={order.id}><div><strong className="text-sm">Order #{order.id}</strong><p className="mt-1 text-xs text-[#817a70]">{order.name || order.email || "Customer"}</p></div><span className="text-xs uppercase tracking-wider">{order.status || "Pending"}</span><strong className="text-sm">MK {Number(order.total_amount || 0).toLocaleString()}</strong></div>)}{orders.length === 0 && <p className="py-6 text-sm text-[#6b655c]">No orders yet.</p>}</div>
          </section>
        )}

        {!loading && view === "products" && (
          <section className="py-8">
            <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a5482e]">Catalogue</p><h2 className="mt-2 font-serif text-3xl">Products <span className="text-lg text-[#817a70]">{products.length}</span></h2>
                <div className="mt-5 divide-y divide-[#d6d0c6] border-y border-[#d6d0c6]">{products.map((product) => <article className="grid gap-3 py-4 sm:grid-cols-[56px_1fr_auto_auto_auto] sm:items-center" key={product.id}><img className="size-14 bg-[#e6dfd2] object-cover" src={product.image || product.image_url || ""} alt="" /><div><strong className="font-serif text-lg">{product.name}</strong><p className="mt-1 text-xs text-[#817a70]">{product.category || "Artwork"} · {Number(product.stock || 0)} in stock</p></div><strong className="text-sm">MK {Number(product.price || 0).toLocaleString()}</strong><button className={smallButtonClass} onClick={() => setEditingProduct(product)}>Edit</button><button className={smallButtonClass} disabled={busy} onClick={() => void deleteRecord("products", product.id)}>Delete</button></article>)}{products.length === 0 && <p className="py-6 text-sm text-[#6b655c]">No products found.</p>}</div>
              </div>
              <form key={editingProduct?.id || "new"} className="h-fit border border-[#d6d0c6] bg-white p-5" onSubmit={createProduct}><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a5482e]">Catalogue</p><h3 className="mt-2 font-serif text-2xl">{editingProduct ? "Edit product" : "Add product"}</h3>
                <label className="mt-5 block text-xs font-semibold">Name<input className={fieldClass} name="name" defaultValue={editingProduct?.name || ""} required /></label>
                <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Category<input className={fieldClass} name="category" defaultValue={editingProduct?.category || "Paintings"} required /></label><label className="text-xs font-semibold">Price (MK)<input className={fieldClass} name="price" type="number" min="0" defaultValue={editingProduct?.price || ""} required /></label></div>
                <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Stock<input className={fieldClass} name="stock" type="number" min="0" defaultValue={editingProduct?.stock ?? 1} /></label><label className="text-xs font-semibold">Dimensions<input className={fieldClass} name="dimensions" defaultValue={editingProduct?.dimensions || ""} /></label></div>
                <label className="mt-4 block text-xs font-semibold">Image URL<input className={fieldClass} name="image" type="url" defaultValue={editingProduct?.image || editingProduct?.image_url || ""} /></label>
                <label className="mt-4 block text-xs font-semibold">Badge<input className={fieldClass} name="badge" placeholder="Optional" defaultValue={editingProduct?.badge || ""} /></label>
                <label className="mt-4 block text-xs font-semibold">Description<textarea className={fieldClass} name="description" rows={3} defaultValue={editingProduct?.description || ""} /></label>
                <button className="mt-5 w-full bg-[#a5482e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#853721] disabled:opacity-60" disabled={busy}>{busy ? "Saving…" : editingProduct ? "Save changes" : "Add product"}</button>
                {editingProduct && <button className="mt-3 w-full px-4 py-2 text-sm text-[#6b655c] underline underline-offset-4" type="button" onClick={() => setEditingProduct(null)}>Cancel editing</button>}
              </form>
            </div>
          </section>
        )}

        {!loading && view === "orders" && (
          <section className="py-8"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a5482e]">Fulfilment</p><h2 className="mt-2 font-serif text-3xl">Orders</h2>
            <div className="mt-5 divide-y divide-[#d6d0c6] border-y border-[#d6d0c6]">{orders.map((order) => <article className="grid gap-4 py-5 md:grid-cols-[1fr_auto_auto] md:items-center" key={order.id}><div><strong className="font-serif text-xl">Order #{order.id}</strong><p className="mt-1 text-xs text-[#817a70]">{order.name || "Customer"} · {order.email || ""} · {order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}</p><p className="mt-2 text-sm">{(order.items || []).map((item) => `${item.name || "Item"} × ${item.qty || item.quantity || 1}`).join(", ")}</p></div><strong className="text-sm">MK {Number(order.total_amount || 0).toLocaleString()}</strong><label className="text-xs font-semibold uppercase tracking-wider">Status<select className={`${fieldClass} mt-1 min-w-36`} value={order.status || "Pending"} disabled={busy} onChange={(event) => void updateOrder(order.id, event.target.value)}>{["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map((status) => <option key={status}>{status}</option>)}</select></label></article>)}{orders.length === 0 && <p className="py-6 text-sm text-[#6b655c]">No orders found.</p>}</div>
          </section>
        )}

        {!loading && view === "customers" && (
          <section className="py-8"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a5482e]">Accounts</p><h2 className="mt-2 font-serif text-3xl">Customers</h2><div className="mt-5 divide-y divide-[#d6d0c6] border-y border-[#d6d0c6]">{customers.map((customer) => <article className="flex flex-wrap items-center justify-between gap-4 py-4" key={customer.id}><div><strong>{customer.name || "Customer"}</strong><p className="mt-1 text-xs text-[#817a70]">{customer.email} {customer.phone ? `· ${customer.phone}` : ""}</p></div><button className={smallButtonClass} disabled={busy} onClick={() => void deleteRecord("customers", customer.id)}>Remove account</button></article>)}{customers.length === 0 && <p className="py-6 text-sm text-[#6b655c]">No customers found.</p>}</div></section>
        )}

        {!loading && view === "messages" && (
          <section className="py-8"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a5482e]">Inbox</p><h2 className="mt-2 font-serif text-3xl">Enquiries</h2><div className="mt-5 divide-y divide-[#d6d0c6] border-y border-[#d6d0c6]">{messages.map((item) => <article className="flex flex-wrap justify-between gap-5 py-5" key={item.id}><div className="max-w-3xl"><p className="text-xs text-[#817a70]">{item.name} · <a className="underline" href={`mailto:${item.email}`}>{item.email}</a> · {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</p><h3 className="mt-2 font-serif text-xl">{item.subject}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#625c53]">{item.body}</p></div><button className={`${smallButtonClass} h-fit`} disabled={busy} onClick={() => void deleteRecord("messages", item.id)}>Delete</button></article>)}{messages.length === 0 && <p className="py-6 text-sm text-[#6b655c]">No messages found.</p>}</div></section>
        )}

        {!loading && view === "categories" && (
          <section className="grid gap-10 py-8 md:grid-cols-[minmax(0,1fr)_320px]">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a5482e]">Catalogue structure</p><h2 className="mt-2 font-serif text-3xl">Categories</h2><div className="mt-5 divide-y divide-[#d6d0c6] border-y border-[#d6d0c6]">{categories.map((category) => <div className="flex items-center justify-between gap-4 py-4" key={category.id}><div><strong>{category.name}</strong><p className="mt-1 text-xs text-[#817a70]">{category.id}</p></div><button className={smallButtonClass} disabled={busy} onClick={() => void deleteCategory(category.id)}>Delete</button></div>)}{categories.length === 0 && <p className="py-6 text-sm text-[#6b655c]">No categories found.</p>}</div></div>
            <form className="h-fit border border-[#d6d0c6] bg-white p-5" onSubmit={createCategory}><h3 className="font-serif text-2xl">Add category</h3><label className="mt-5 block text-xs font-semibold">Category name<input className={fieldClass} name="name" required /></label><button className="mt-5 w-full bg-[#292d27] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={busy}>{busy ? "Saving…" : "Add category"}</button></form>
          </section>
        )}

        {!loading && view === "settings" && (
          <section className="grid gap-12 py-8 lg:grid-cols-2"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a5482e]">Store profile</p><h2 className="mt-2 font-serif text-3xl">Contact settings</h2><form className="mt-6 max-w-2xl" onSubmit={saveSettings}><div className="grid gap-5 sm:grid-cols-2"><label className="text-xs font-semibold">Store name<input className={fieldClass} name="storeName" defaultValue={String(settings.storeName || "Mthunzi Creations")} /></label><label className="text-xs font-semibold">Email<input className={fieldClass} name="storeEmail" type="email" defaultValue={String(settings.storeEmail || "")} /></label><label className="text-xs font-semibold">Phone<input className={fieldClass} name="storePhone" defaultValue={String(settings.storePhone || "")} /></label><label className="text-xs font-semibold">Address<input className={fieldClass} name="storeAddress" defaultValue={String(settings.storeAddress || "")} /></label></div><button className="mt-6 bg-[#292d27] px-5 py-3 text-sm font-semibold text-white hover:bg-[#41473c] disabled:opacity-60">Save settings</button></form></div><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a5482e]">Access</p><h2 className="mt-2 font-serif text-3xl">Administrator credentials</h2><form className="mt-6 max-w-2xl" onSubmit={updateCredentials}><label className="block text-xs font-semibold">New email<input className={fieldClass} name="email" type="email" defaultValue={admin?.email || ""} required /></label><label className="mt-4 block text-xs font-semibold">Current password<input className={fieldClass} name="currentPassword" type="password" autoComplete="current-password" required /></label><label className="mt-4 block text-xs font-semibold">New password <span className="font-normal text-[#817a70]">(leave blank to keep current)</span><input className={fieldClass} name="newPassword" type="password" autoComplete="new-password" /></label><button className="mt-6 bg-[#292d27] px-5 py-3 text-sm font-semibold text-white hover:bg-[#41473c] disabled:opacity-60" disabled={busy}>{busy ? "Saving…" : "Update credentials"}</button></form></div></section>
        )}
      </div>
    </main>
  )
}