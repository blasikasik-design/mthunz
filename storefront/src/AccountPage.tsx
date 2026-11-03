import { useEffect, useState, type FormEvent } from "react"
import { apiUrl } from "./api"
import projectLogo from "./brand"

type AccountUser = {
  id: number | string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  token: string
}

type Order = {
  id: number | string
  created_at?: string
  status?: string
  total_amount?: number
  total?: number
  items?: Array<{ name?: string; product_name?: string; quantity?: number; qty?: number }>
}

function readAccountUser(): AccountUser | null {
  try {
    return JSON.parse(localStorage.getItem("mthunziAuthUser") || "null")
  } catch {
    return null
  }
}

export default function AccountPage() {
  const [user, setUser] = useState(readAccountUser)
  const [orders, setOrders] = useState<Order[]>([])
  const [view, setView] = useState<"profile" | "orders">("profile")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user?.id || !user.token) {
      localStorage.setItem("mthunziAuthRedirect", "account.html")
      window.location.replace("/login.html")
      return
    }
    const controller = new AbortController()
    const headers = { Authorization: `Bearer ${user.token}` }
    Promise.all([
      fetch(apiUrl(`/api/user/${encodeURIComponent(user.id)}`), { headers, signal: controller.signal }),
      fetch(apiUrl(`/api/user/${encodeURIComponent(user.id)}/orders`), { headers, signal: controller.signal }),
    ])
      .then(async ([profileResponse, ordersResponse]) => {
        const profileBody = await profileResponse.json().catch(() => ({}))
        const ordersBody = await ordersResponse.json().catch(() => ({}))
        if (profileResponse.status === 401 || ordersResponse.status === 401) {
          localStorage.removeItem("mthunziAuthUser")
          window.location.replace("/login.html")
          return
        }
        if (!profileResponse.ok) throw new Error(profileBody.error || "Unable to load your profile.")
        const nextUser = { ...user, ...profileBody.data, token: user.token } as AccountUser
        setUser(nextUser)
        localStorage.setItem("mthunziAuthUser", JSON.stringify(nextUser))
        if (ordersResponse.ok && Array.isArray(ordersBody.data)) setOrders(ordersBody.data)
      })
      .catch((cause) => {
        if (cause.name !== "AbortError") setError(cause.message || "Unable to load your account.")
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    const values = new FormData(event.currentTarget)
    const payload = {
      name: String(values.get("name") || "").trim(),
      email: String(values.get("email") || "").trim(),
      phone: String(values.get("phone") || "").trim(),
    }
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch(apiUrl(`/api/user/${encodeURIComponent(user.id)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(payload),
      })
      const body = await response.json().catch(() => ({}))
      if (response.status === 401) {
        localStorage.removeItem("mthunziAuthUser")
        window.location.replace("/login.html")
        return
      }
      if (!response.ok || !body.data) throw new Error(body.error || "Unable to update your profile.")
      const nextUser = { ...user, ...body.data, token: user.token }
      setUser(nextUser)
      localStorage.setItem("mthunziAuthUser", JSON.stringify(nextUser))
      setMessage("Profile saved.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update your profile.")
    } finally {
      setBusy(false)
    }
  }

  function signOut() {
    localStorage.removeItem("mthunziAuthUser")
    window.location.assign("/index.html")
  }

  const inputClass = "mt-2 block w-full border border-[#d6d0c6] bg-white px-4 py-3 text-sm outline-none focus:border-[#a5482e] focus:ring-2 focus:ring-[#a5482e]/15"

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-5 py-8 text-[#26231f] sm:px-10 lg:px-[7vw]">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-[#d6d0c6] pb-5">
        <a className="inline-flex items-center gap-3 font-serif text-xl" href="/index.html"><img className="size-10 rounded-full bg-white object-contain p-0.5" src={projectLogo} alt="" />Mthunzi Creations</a>
        <div className="flex items-center gap-5 text-sm">
          <a className="text-[#6b655c] underline underline-offset-4" href="/shop.html">Shop</a>
          <button className="text-[#a5482e] underline underline-offset-4" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <section className="mx-auto max-w-6xl py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#a5482e]">Customer space</p>
        <h1 className="mt-3 font-serif text-5xl">Hello, {user?.name?.split(" ")[0] || "there"}.</h1>
        <p className="mt-3 text-sm text-[#6b655c]">Manage your details and keep an eye on your orders.</p>

        <div className="mt-9 flex gap-6 border-b border-[#d6d0c6]" role="tablist" aria-label="Account sections">
          <button className={`border-b-2 px-1 pb-3 text-sm ${view === "profile" ? "border-[#a5482e] font-semibold" : "border-transparent text-[#6b655c]"}`} onClick={() => setView("profile")} role="tab" aria-selected={view === "profile"}>Profile</button>
          <button className={`border-b-2 px-1 pb-3 text-sm ${view === "orders" ? "border-[#a5482e] font-semibold" : "border-transparent text-[#6b655c]"}`} onClick={() => setView("orders")} role="tab" aria-selected={view === "orders"}>Orders <span className="ml-1 text-xs">{orders.length}</span></button>
        </div>

        {loading ? <p className="py-10 text-sm text-[#6b655c]">Loading your account…</p> : null}
        {error && <p className="mt-5 text-sm text-red-700" role="alert">{error}</p>}
        {view === "profile" && !loading && user && (
          <form className="mt-7 max-w-2xl" onSubmit={saveProfile}>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-[.12em]">Full name<input className={inputClass} name="name" defaultValue={user.name} required /></label>
              <label className="text-xs font-semibold uppercase tracking-[.12em]">Email<input className={inputClass} name="email" type="email" defaultValue={user.email} required /></label>
              <label className="text-xs font-semibold uppercase tracking-[.12em]">Phone<input className={inputClass} name="phone" type="tel" defaultValue={user.phone || ""} /></label>
            </div>
            {message && <p className="mt-5 text-sm text-emerald-800" role="status">{message}</p>}
            <button className="mt-7 bg-[#a5482e] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#853721] disabled:opacity-60" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
          </form>
        )}
        {view === "orders" && !loading && (
          <div className="mt-7 divide-y divide-[#d6d0c6] border-y border-[#d6d0c6]">
            {orders.length ? orders.map((order) => (
              <article className="grid gap-3 py-5 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={order.id}>
                <div><p className="text-xs uppercase tracking-[.12em] text-[#817a70]">Order #{order.id}</p><p className="mt-1 font-serif text-xl">{(order.items || []).map((item) => `${item.name || item.product_name || "Artwork"} × ${item.quantity || item.qty || 1}`).join(", ") || "Order items"}</p></div>
                <span className="w-fit border border-[#d6d0c6] px-3 py-1 text-xs uppercase tracking-wider">{order.status || "Pending"}</span>
                <strong className="text-sm">MK {Number(order.total_amount || order.total || 0).toLocaleString()}</strong>
              </article>
            )) : <p className="py-8 text-sm text-[#6b655c]">No orders yet. Your order history will appear here.</p>}
          </div>
        )}
      </section>
    </main>
  )
}