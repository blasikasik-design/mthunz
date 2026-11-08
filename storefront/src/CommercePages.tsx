import { useEffect, useState } from "react"
import { apiUrl } from "./api"
import projectLogo from "./brand"

type StoredUser = {
  id?: number | string
  token?: string
}

type CartItem = {
  id: number
  name: string
  img: string
  price: number
  qty: number
}

type Product = {
  id: number
  name: string
  category: string
  price: number
  dimensions: string
  image: string
  description: string
  stock: number
}

type ApiProduct = Partial<Product> & {
  id?: number | string
  image_url?: string
  img?: string
  dims?: string
  in_stock?: boolean
}

function readUser(): StoredUser | null {
  try {
    localStorage.removeItem("mthunziAuthUser")
    return JSON.parse(sessionStorage.getItem("mthunziAuthUser") || "null")
  } catch {
    return null
  }
}

function cartKey(user = readUser()) {
  return user?.id ? `mthunziCart:${user.id}` : "mthunziCart:guest"
}

function readCart(): CartItem[] {
  try {
    const user = readUser()
    const key = cartKey(user)
    const savedCart = localStorage.getItem(key)
    const legacyGuestCart = key === "mthunziCart:guest" ? localStorage.getItem("mthunziCart") : null
    if (key !== "mthunziCart:guest") localStorage.removeItem("mthunziCart")
    if (!savedCart && legacyGuestCart) {
      localStorage.setItem(key, legacyGuestCart)
      localStorage.removeItem("mthunziCart")
    }
    const saved = JSON.parse(savedCart || legacyGuestCart || "[]")
    if (!Array.isArray(saved)) return []
    return saved.map((item) => ({
      id: Number(item.id),
      name: String(item.name || "Artwork"),
      img: String(item.img || item.image || ""),
      price: Number(item.price || 0),
      qty: Math.max(1, Number(item.qty || item.quantity || 1)),
    })).filter((item) => item.id > 0)
  } catch {
    return []
  }
}

function writeCart(cart: CartItem[]) {
  localStorage.setItem(cartKey(), JSON.stringify(cart))
  localStorage.removeItem("mthunziCart")
}

function formatPrice(value: number) {
  return `MK ${Number(value || 0).toLocaleString()}`
}

function requireCustomerAuth() {
  const user = readUser()
  if (user?.token) return true
  localStorage.setItem("mthunziAuthRedirect", `${window.location.pathname}${window.location.search}`)
  window.location.assign("/login.html")
  return false
}

export function ProductDetailPage() {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [cart, setCart] = useState(readCart)

  useEffect(() => {
    const controller = new AbortController()
    fetch(apiUrl("/api/products"), { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || "Unable to load this artwork.")
        return (Array.isArray(body.data) ? body.data : []) as ApiProduct[]
      })
      .then((rows) => {
        const id = Number(new URLSearchParams(window.location.search).get("id"))
        const row = rows.find((item) => Number(item.id) === id)
        if (!row) throw new Error("This artwork could not be found.")
        setProduct({
          id,
          name: String(row.name || "Untitled artwork"),
          category: String(row.category || "Artwork"),
          price: Number(row.price || 0),
          dimensions: String(row.dimensions || row.dims || "Not specified"),
          image: String(row.image || row.image_url || row.img || ""),
          description: String(row.description || ""),
          stock: row.in_stock === false ? 0 : Math.max(0, Number(row.stock || 0)),
        })
      })
      .catch((error) => {
        if (error.name !== "AbortError") setMessage(error.message || "Unable to load this artwork.")
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  function addToCart(checkout = false) {
    if (!product || !requireCustomerAuth()) return
    const existing = cart.find((item) => item.id === product.id)
    const next = existing
      ? cart.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      : [...cart, { id: product.id, name: product.name, img: product.image, price: product.price, qty: 1 }]
    setCart(next)
    writeCart(next)
    if (checkout) window.location.assign("/payment.html")
    else setMessage(`${product.name} added to your bag.`)
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-5 py-10 text-[#26231f] sm:px-10 lg:px-[7vw]">
      <a className="inline-flex items-center gap-3 text-sm text-[#6b655c] hover:text-[#2d6cbb]" href="/shop.html"><img className="inline-brand-logo" src={projectLogo} alt="Mthunzi Creations" /><span className="underline underline-offset-4">Back to shop</span></a>
      {loading ? <p className="mx-auto mt-24 max-w-5xl text-sm text-[#6b655c]">Loading artwork…</p> : null}
      {!loading && !product ? <p className="mx-auto mt-24 max-w-5xl text-sm text-red-700" role="alert">{message}</p> : null}
      {product && (
        <section className="mx-auto mt-9 grid max-w-6xl gap-10 md:grid-cols-[1.05fr_.95fr] md:gap-16">
          <div className="aspect-[4/5] overflow-hidden bg-[#e6dfd2]">
            {product.image && <img className="h-full w-full object-cover" src={product.image} alt={product.name} />}
          </div>
          <div className="flex flex-col justify-center py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#2d6cbb]">{product.category}</p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.04] sm:text-6xl">{product.name}</h1>
            <p className="mt-5 text-2xl">{formatPrice(product.price)}</p>
            <p className="mt-8 max-w-xl whitespace-pre-line text-sm leading-7 text-[#625c53]">{product.description || "An original work from the Mthunzi Creations studio."}</p>
            <dl className="mt-8 grid grid-cols-2 border-y border-[#d6d0c6] py-5 text-sm">
              <div><dt className="text-xs uppercase tracking-[.12em] text-[#817a70]">Dimensions</dt><dd className="mt-2">{product.dimensions}</dd></div>
              <div><dt className="text-xs uppercase tracking-[.12em] text-[#817a70]">Availability</dt><dd className="mt-2">{product.stock > 0 ? `${product.stock} available` : "Out of stock"}</dd></div>
            </dl>
            {message && <p className="mt-5 text-sm text-blue-800" role="status">{message}</p>}
            <div className="mt-7 flex flex-wrap gap-3">
              <button className="bg-[#2d6cbb] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1f528e] disabled:cursor-not-allowed disabled:opacity-50" disabled={product.stock < 1} onClick={() => addToCart()}>
                Add to bag
              </button>
              <button className="border border-[#26231f] px-6 py-4 text-sm font-semibold transition hover:bg-[#26231f] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={product.stock < 1} onClick={() => addToCart(true)}>
                Buy now
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

type PaymentData = {
  orderId?: number | string
  totalAmount?: number
  paid?: boolean
  status?: string
}

export function PaymentPage() {
  const [cart, setCart] = useState(readCart)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [paidOrder, setPaidOrder] = useState<{ id: string; total: number } | null>(null)
  const user = readUser()
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  useEffect(() => {
    if (!user?.token) {
      localStorage.setItem("mthunziAuthRedirect", "payment.html")
      window.location.replace("/login.html")
      return
    }

    const reference = new URLSearchParams(window.location.search).get("tx_ref")
    if (!reference) return
    const controller = new AbortController()
    setBusy(true)
    fetch(apiUrl(`/api/payments/paychangu/verify?tx_ref=${encodeURIComponent(reference)}`), {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok && response.status !== 202) throw new Error(body.error || "Unable to verify payment.")
        const payment = body.data as PaymentData | undefined
        if (!payment?.paid) throw new Error("Payment is not confirmed yet. Your order has not been marked paid.")
        window.history.replaceState(null, "", window.location.pathname)
        setPaidOrder({ id: `ORD-${String(payment.orderId).padStart(4, "0")}`, total: Number(payment.totalAmount || 0) })
      })
      .catch((error) => {
        if (error.name !== "AbortError") setMessage(error.message || "Unable to verify payment.")
      })
      .finally(() => setBusy(false))
    return () => controller.abort()
  }, [])

  async function beginCheckout() {
    if (!cart.length) {
      setMessage("Your bag is empty. Add an artwork before checkout.")
      return
    }
    if (!user?.token) return
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch(apiUrl("/api/payments/paychangu/initiate"), {
        method: "POST",
        signal: AbortSignal.timeout(90000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ items: cart.map((item) => ({ product_id: item.id, quantity: item.qty })) }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.data?.checkoutUrl) throw new Error(body.error || "Unable to start PayChangu checkout.")
      window.location.assign(body.data.checkoutUrl)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to place your order.")
      setBusy(false)
    }
  }

  function downloadReceipt() {
    if (!paidOrder) return
    const rows = [
      "Mthunzi Creations Order Summary",
      `Order ID: ${paidOrder.id}`,
      "Payment Method: PayChangu",
      `Total Paid: ${formatPrice(paidOrder.total)}`,
      "",
      ...cart.map((item) => `${item.name} x ${item.qty} - ${formatPrice(item.price * item.qty)}`),
      "",
      "Thank you for your order!",
    ]
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/plain" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `Mthunzi-order-${paidOrder.id}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  function finishOrder() {
    localStorage.removeItem(cartKey(user))
    localStorage.removeItem("mthunziCart")
    if (!user?.id) localStorage.removeItem("mthunziCart:guest")
    setCart([])
    window.location.assign("/shop.html")
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-5 py-10 text-[#26231f] sm:px-10">
      <div className="mx-auto max-w-5xl">
        <a className="inline-flex items-center gap-3 text-sm text-[#6b655c] hover:text-[#2d6cbb]" href="/shop.html"><img className="inline-brand-logo" src={projectLogo} alt="Mthunzi Creations" /><span className="underline underline-offset-4">Continue shopping</span></a>
        <div className="mt-8 grid gap-10 md:grid-cols-[1fr_350px]">
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#2d6cbb]">Checkout</p>
            <h1 className="mt-3 font-serif text-5xl">Your order</h1>
            <div className="mt-8 divide-y divide-[#d6d0c6] border-y border-[#d6d0c6]">
              {cart.length ? cart.map((item) => (
                <article className="flex gap-4 py-5" key={item.id}>
                  <img className="size-20 bg-[#e6dfd2] object-cover" src={item.img} alt="" />
                  <div className="flex-1"><h2 className="font-serif text-xl">{item.name}</h2><p className="mt-1 text-xs text-[#817a70]">Quantity: {item.qty}</p></div>
                  <strong className="text-sm">{formatPrice(item.price * item.qty)}</strong>
                </article>
              )) : <p className="py-8 text-sm text-[#6b655c]">Your bag is empty.</p>}
            </div>
            {message && <p className="mt-5 text-sm text-red-700" role="alert">{message}</p>}
          </section>
          <aside className="h-fit border border-[#d6d0c6] bg-white p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#2d6cbb]">Payment summary</p>
            <div className="mt-6 flex justify-between border-b border-[#e5dfd5] pb-5 text-sm"><span>Subtotal</span><strong>{formatPrice(total)}</strong></div>
            <div className="mt-5 flex justify-between text-lg"><span>Total</span><strong>{formatPrice(total)}</strong></div>
            <p className="mt-5 text-xs leading-5 text-[#6b655c]">Secure checkout through PayChangu. Your order is confirmed only after payment verification.</p>
            {paidOrder ? (
              <div className="mt-7 space-y-3">
                <p className="text-sm font-semibold text-blue-800">Payment confirmed · {paidOrder.id}</p>
                <button className="w-full border border-[#26231f] px-4 py-3 text-sm font-semibold" onClick={downloadReceipt}>Download order details</button>
                <button className="w-full bg-[#2d6cbb] px-4 py-3 text-sm font-semibold text-white" onClick={finishOrder}>Done</button>
              </div>
            ) : (
              <button className="mt-7 flex w-full items-center justify-between bg-[#2d6cbb] px-4 py-4 text-sm font-semibold text-white transition hover:bg-[#1f528e] disabled:cursor-wait disabled:opacity-60" disabled={busy || cart.length === 0} onClick={beginCheckout}>
                {busy ? "Processing…" : "Continue to PayChangu"}<span aria-hidden="true">→</span>
              </button>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}