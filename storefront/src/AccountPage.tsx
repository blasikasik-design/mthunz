import { useEffect, useRef, useState, type FormEvent } from "react"
import { apiUrl } from "./api"
import projectLogo from "./brand"
import { timeGreeting } from "./timeGreeting"

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
    localStorage.removeItem("mthunziAuthUser")
    return JSON.parse(sessionStorage.getItem("mthunziAuthUser") || "null")
  } catch {
    return null
  }
}

export default function AccountPage() {
  const [user, setUser] = useState(readAccountUser)
  const [orders, setOrders] = useState<Order[]>([])
  const [view, setView] = useState<"profile" | "orders" | "wishlist" | "addresses" | "security" | "notifications">("profile")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const photoInput = useRef<HTMLInputElement>(null)
  const [preferences, setPreferences] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("mthunziAccountPreferences") || "{}")
    } catch {
      return {}
    }
  })

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
          sessionStorage.removeItem("mthunziAuthUser")
          window.location.replace("/login.html")
          return
        }
        if (!profileResponse.ok) throw new Error(profileBody.error || "Unable to load your profile.")
        const nextUser = { ...user, ...profileBody.data, token: user.token } as AccountUser
        setUser(nextUser)
        sessionStorage.setItem("mthunziAuthUser", JSON.stringify(nextUser))
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
    const firstName = String(values.get("firstName") || "").trim()
    const lastName = String(values.get("lastName") || "").trim()
    const payload = {
      name: `${firstName} ${lastName}`.trim(),
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
        sessionStorage.removeItem("mthunziAuthUser")
        window.location.replace("/login.html")
        return
      }
      if (!response.ok || !body.data) throw new Error(body.error || "Unable to update your profile.")
      const nextUser = { ...user, ...body.data, token: user.token }
      setUser(nextUser)
      sessionStorage.setItem("mthunziAuthUser", JSON.stringify(nextUser))
      setMessage("Profile saved.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update your profile.")
    } finally {
      setBusy(false)
    }
  }

  async function uploadAvatar(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file || !user) return
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
      setError("Choose a JPG, PNG, or WebP photo.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("That photo is too large. Maximum size is 5 MB.")
      return
    }
    setAvatarBusy(true)
    setError("")
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ""))
        reader.onerror = () => reject(new Error("Could not read that photo."))
        reader.readAsDataURL(file)
      })
      const response = await fetch(apiUrl(`/api/user/${encodeURIComponent(user.id)}/avatar`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ image }),
      })
      const body = await response.json().catch(() => ({}))
      if (response.status === 401) {
        sessionStorage.removeItem("mthunziAuthUser")
        window.location.replace("/login.html")
        return
      }
      if (!response.ok || !body.data) throw new Error(body.error || "Photo upload failed.")
      const nextUser = { ...user, ...body.data, token: user.token }
      setUser(nextUser)
      sessionStorage.setItem("mthunziAuthUser", JSON.stringify(nextUser))
      setMessage("Profile photo updated.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Photo upload failed.")
    } finally {
      setAvatarBusy(false)
      if (photoInput.current) photoInput.current.value = ""
    }
  }

  async function removeAvatar() {
    if (!user) return
    setAvatarBusy(true)
    setError("")
    try {
      const response = await fetch(apiUrl(`/api/user/${encodeURIComponent(user.id)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ removeAvatar: true }),
      })
      const body = await response.json().catch(() => ({}))
      if (response.status === 401) {
        sessionStorage.removeItem("mthunziAuthUser")
        window.location.replace("/login.html")
        return
      }
      if (!response.ok || !body.data) throw new Error(body.error || "Could not remove your photo.")
      const nextUser = { ...user, ...body.data, token: user.token }
      setUser(nextUser)
      sessionStorage.setItem("mthunziAuthUser", JSON.stringify(nextUser))
      setMessage("Profile photo removed.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove your photo.")
    } finally {
      setAvatarBusy(false)
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!user) return
    const values = new FormData(form)
    const password = String(values.get("password") || "")
    const confirmation = String(values.get("confirmation") || "")
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      setError("Password must be at least 8 characters and include a letter and number.")
      return
    }
    if (password !== confirmation) {
      setError("The passwords do not match.")
      return
    }
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch(apiUrl(`/api/user/${encodeURIComponent(user.id)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ password }),
      })
      const body = await response.json().catch(() => ({}))
      if (response.status === 401) {
        sessionStorage.removeItem("mthunziAuthUser")
        window.location.replace("/login.html")
        return
      }
      if (!response.ok || !body.data) throw new Error(body.error || "Unable to update your password.")
      form.reset()
      setMessage("Password updated.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update your password.")
    } finally {
      setBusy(false)
    }
  }

  function togglePreference(key: string) {
    setPreferences((current) => {
      const next = { ...current, [key]: !current[key] }
      localStorage.setItem("mthunziAccountPreferences", JSON.stringify(next))
      return next
    })
  }

  function signOut() {
    sessionStorage.removeItem("mthunziAuthUser")
    window.location.assign("/index.html")
  }

  const inputClass = "w-full border border-[#cfc7bb] bg-[#fffdf9] px-4 py-3 text-sm outline-none focus:border-[#2d6cbb] focus:ring-2 focus:ring-[#2d6cbb]/10"
  const tabs = ["profile", "orders", "wishlist", "addresses", "security", "notifications"] as const
  const displayName = user?.name?.trim() || "there"
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "M"

  return (
    <main className="min-h-screen bg-[#f5f0e7] pb-20 text-[#1d211f]">
      <header className="flex h-[76px] items-center justify-between border-b border-[#d8d0c3] bg-[#fbf8f2] px-5 sm:px-[4.5vw]">
        <a className="inline-flex items-center" href="/index.html" aria-label="Mthunzi Creations home"><img className="account-brand-logo" src={projectLogo} alt="Mthunzi Creations" /></a>
        <div className="flex items-center gap-5 text-xs"><a className="underline underline-offset-4" href="/shop.html">Shop</a><button className="text-[#1f528e]" onClick={signOut}>Sign out</button></div>
      </header>
      <section className="bg-[#1d4e7f] px-6 pb-24 pt-14 text-white sm:px-[10vw] sm:pt-16">
        <p className="text-[9px] font-semibold tracking-[.2em] text-[#efc38e]">MY ACCOUNT</p>
        <h1 className="mt-4 font-serif text-5xl leading-tight sm:text-7xl">{timeGreeting()}, <em className="text-[#efc38e]">{displayName}.</em></h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/75">Manage your details, saved artwork, and studio preferences.</p>
      </section>
      <section className="relative mx-auto -mt-12 grid w-[min(1180px,92%)] gap-5 md:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="h-fit border border-[#ded7cc] bg-[#fbf8f2]">
          <div className="flex items-center gap-3 border-b border-[#d8d0c3] p-5">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#2d6cbb] font-serif text-sm text-white">{user?.avatar_url ? <img className="h-full w-full object-cover" src={user.avatar_url} alt="" /> : initials}</span>
            <span className="min-w-0"><b className="block truncate text-xs">{user?.name}</b><small className="mt-1 block truncate text-[9px] text-[#817a70]">{user?.email}</small></span>
          </div>
          <nav className="flex overflow-x-auto p-2 md:grid" aria-label="Account sections">
            {tabs.map((item) => <button key={item} className={`flex shrink-0 items-center justify-between border-b-2 px-3 py-3 text-left text-[11px] capitalize md:border-b-0 md:border-l-[3px] ${view === item ? "border-[#2d6cbb] bg-[#f3eee5] font-semibold" : "border-transparent"}`} onClick={() => setView(item)}>{item}<span aria-hidden="true">›</span></button>)}
          </nav>
          <button className="m-4 hidden w-[calc(100%-2rem)] items-center gap-2 border-t border-[#d8d0c3] py-4 text-left text-xs text-[#1f528e] md:flex" onClick={signOut}><span aria-hidden="true">↗</span> Sign out</button>
        </aside>

        <section className="min-h-[560px] border border-[#ded7cc] bg-[#fbf8f2] px-6 py-8 sm:px-10 sm:py-10">
          {loading && <p className="text-sm text-[#777067]">Loading your account…</p>}
          {error && <p className="mb-5 text-sm text-red-700" role="alert">{error}</p>}
          {message && <p className="mb-5 text-sm text-blue-800" role="status">{message}</p>}
          {!loading && view === "profile" && user && <>
            <div className="mb-7 border-b border-[#d8d0c3] pb-6"><p className="text-[9px] font-semibold tracking-[.2em] text-[#2d6cbb]">PERSONAL DETAILS</p><h2 className="mt-2 font-serif text-4xl">Your profile</h2><p className="mt-2 text-xs text-[#756e65]">Keep your details up to date for a more personal experience.</p></div>
            <form className="grid gap-5" onSubmit={saveProfile}>
              <div className="flex items-center gap-4">
                <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[#2d6cbb] font-serif text-xl text-white">{user.avatar_url ? <img className="h-full w-full object-cover" src={user.avatar_url} alt="Profile" /> : initials}</span>
                <div className="flex flex-wrap items-center gap-3"><button className="border-b border-[#1d211f] pb-0.5 text-[11px]" type="button" disabled={avatarBusy} onClick={() => photoInput.current?.click()}>{avatarBusy ? "Updating…" : "Change photo"}</button>{user.avatar_url && <button className="text-[11px] text-[#1f528e]" type="button" disabled={avatarBusy} onClick={() => void removeAvatar()}>Remove</button>}<small className="w-full text-[9px] text-[#8a8379]">JPG or PNG. Maximum 5 MB.</small><input ref={photoInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-[11px] font-semibold">First name<input className={inputClass} name="firstName" defaultValue={user.name.split(/\s+/)[0]} required /></label><label className="grid gap-2 text-[11px] font-semibold">Last name<input className={inputClass} name="lastName" defaultValue={user.name.trim().split(/\s+/).slice(1).join(" ")} required /></label></div>
              <label className="grid gap-2 text-[11px] font-semibold">Email address<input className={inputClass} name="email" type="email" defaultValue={user.email} required /></label>
              <label className="grid gap-2 text-[11px] font-semibold">Phone number<input className={inputClass} name="phone" type="tel" defaultValue={user.phone || ""} placeholder="+265 99 123 4567" /></label>
              <div className="flex justify-end border-t border-[#d8d0c3] pt-5"><button className="bg-[#2d6cbb] px-5 py-3 text-xs font-semibold text-white hover:bg-[#1f528e] disabled:opacity-60" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div>
            </form>
          </>}
          {!loading && view === "orders" && <>
            <div className="mb-7 border-b border-[#d8d0c3] pb-6"><p className="text-[9px] font-semibold tracking-[.2em] text-[#2d6cbb]">ORDER HISTORY</p><h2 className="mt-2 font-serif text-4xl">Your orders</h2><p className="mt-2 text-xs text-[#756e65]">Follow payment and delivery progress for your artwork.</p></div>
            <div className="divide-y divide-[#d8d0c3] border-y border-[#d8d0c3]">{orders.length ? orders.map((order) => <article className="grid gap-3 py-5 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={order.id}><div><p className="text-[9px] uppercase tracking-[.14em] text-[#817a70]">Order #{order.id} · {order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}</p><p className="mt-2 font-serif text-xl">{(order.items || []).map((item) => `${item.name || item.product_name || "Artwork"} × ${item.quantity || item.qty || 1}`).join(", ") || "Order items"}</p></div><span className="w-fit border border-[#d8d0c3] px-3 py-1 text-[9px] uppercase tracking-wider">{order.status || "Pending"}</span><strong className="text-xs">MK {Number(order.total_amount || order.total || 0).toLocaleString()}</strong></article>) : <div className="py-14 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#f5f0e7] text-2xl text-[#2d6cbb]">♡</span><h3 className="mt-4 font-serif text-2xl">No orders yet</h3><p className="mt-2 text-xs text-[#777067]">When you collect a piece, your order and delivery progress will appear here.</p><a className="mt-5 inline-block bg-[#2d6cbb] px-5 py-3 text-xs font-semibold text-white" href="/shop.html">Explore available work</a></div>}</div>
          </>}
          {!loading && view === "wishlist" && <div className="grid min-h-[440px] place-items-center text-center"><div><span className="mx-auto grid size-[70px] place-items-center rounded-full bg-[#f5f0e7] text-3xl text-[#2d6cbb]">♡</span><h2 className="mt-5 font-serif text-4xl">Your wishlist is ready</h2><p className="mx-auto mt-3 max-w-md text-xs leading-6 text-[#777067]">Saved artwork will appear here when wishlist support is available.</p><a className="mt-5 inline-block border-b border-[#1d211f] pb-1 text-xs" href="/shop.html">Discover the collection</a></div></div>}
          {!loading && view === "addresses" && <div className="grid min-h-[440px] place-items-center text-center"><div><p className="text-[9px] font-semibold tracking-[.2em] text-[#2d6cbb]">DELIVERY DETAILS</p><h2 className="mt-3 font-serif text-4xl">Saved addresses</h2><p className="mx-auto mt-3 max-w-md text-xs leading-6 text-[#777067]">Address management isn’t available in your account yet. Add delivery details when you contact the studio about an order.</p><a className="mt-5 inline-block border-b border-[#1d211f] pb-1 text-xs" href="/contact.html">Contact the studio</a></div></div>}
          {!loading && view === "security" && <>
            <div className="mb-7 border-b border-[#d8d0c3] pb-6"><p className="text-[9px] font-semibold tracking-[.2em] text-[#2d6cbb]">SECURITY</p><h2 className="mt-2 font-serif text-4xl">Password & access</h2><p className="mt-2 text-xs text-[#756e65]">Choose a strong, unique password for your account.</p></div>
            <form className="max-w-lg space-y-5" onSubmit={savePassword}><label className="grid gap-2 text-[11px] font-semibold">New password<input className={inputClass} name="password" type="password" autoComplete="new-password" minLength={8} required /></label><label className="grid gap-2 text-[11px] font-semibold">Confirm new password<input className={inputClass} name="confirmation" type="password" autoComplete="new-password" minLength={8} required /></label><button className="bg-[#2d6cbb] px-5 py-3 text-xs font-semibold text-white disabled:opacity-60" disabled={busy}>{busy ? "Updating…" : "Update password"}</button></form>
          </>}
          {!loading && view === "notifications" && <>
            <div className="mb-7 border-b border-[#d8d0c3] pb-6"><p className="text-[9px] font-semibold tracking-[.2em] text-[#2d6cbb]">PREFERENCES</p><h2 className="mt-2 font-serif text-4xl">Studio updates</h2><p className="mt-2 text-xs text-[#756e65]">Choose which updates to receive on this device.</p></div>
            <div className="max-w-2xl">{[["collections", "New collections", "Be first to see original works and small editions."], ["orders", "Order updates", "Payment and delivery status updates."], ["studio", "Studio notes", "Occasional stories from behind the work."], ["commissions", "Commissions", "Openings for personal and commercial projects."]].map(([key, title, text]) => <button className="flex w-full items-center justify-between gap-5 border-b border-[#d8d0c3] py-5 text-left" key={key} type="button" role="switch" aria-checked={Boolean(preferences[key])} onClick={() => togglePreference(key)}><span><b className="block text-xs">{title}</b><small className="mt-1 block text-[10px] text-[#817a70]">{text}</small></span><span className={`relative h-6 w-11 rounded-full transition ${preferences[key] ? "bg-[#1d4e7f]" : "bg-[#cfc7bb]"}`}><span className={`absolute top-1 size-4 rounded-full bg-white transition ${preferences[key] ? "left-6" : "left-1"}`} /></span></button>)}</div>
          </>}
        </section>
      </section>
    </main>
  )
}