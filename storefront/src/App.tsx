import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { apiUrl } from "./api"
import AuthPage from "./AuthPage"
import AccountPage from "./AccountPage"
import AdminLoginPage from "./AdminLoginPage"
import AdminPage from "./AdminPage"
import { PaymentPage, ProductDetailPage } from "./CommercePages"
import projectLogo from "./brand"

type IconName = "arrow" | "bag" | "check" | "chevron" | "close" | "heart" | "instagram" | "location" | "mail" | "menu" | "message" | "palette" | "search" | "sparkle" | "user"

type Product = {
  id: number
  name: string
  category: string
  price: number
  dimensions: string
  image: string
  label?: string
  description: string
  stock: number
}

type ProductRow = {
  id: number | string
  name?: string
  category?: string
  price?: number | string
  dimensions?: string
  dims?: string
  image?: string
  image_url?: string
  label?: string
  badge?: string
  description?: string
  stock?: number | string
  in_stock?: boolean
}

type CartItem = {
  id: number
  name: string
  category: string
  price: number
  img: string
  qty: number
}

type SiteSettings = {
  storeEmail: string
  storePhone: string
  storeAddress: string
}

type Route = "home" | "shop" | "about" | "contact" | "login" | "signup" | "product-detail" | "payment" | "account" | "admin-login" | "admin"

const categoryImages: Record<string, string> = {
  Paintings:
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1000&q=90",
  Drawings:
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1000&q=90",
  "T-Shirts":
    "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1000&q=90",
}

function getCartStorageKey() {
  try {
    const user = JSON.parse(localStorage.getItem("mthunziAuthUser") || "null")
    return user?.id ? `mthunziCart:${user.id}` : "mthunziCart:guest"
  } catch {
    return "mthunziCart:guest"
  }
}

function readSavedCart(): CartItem[] {
  try {
    const cart = JSON.parse(
      localStorage.getItem(getCartStorageKey()) ||
        localStorage.getItem("mthunziCart") ||
        localStorage.getItem("mthunziCart:guest") ||
        "[]",
    )
    if (!Array.isArray(cart)) return []
    return cart
      .map((item) => ({
        id: Number(item.id),
        name: String(item.name || "Artwork"),
        category: String(item.category || "Artwork"),
        price: Number(item.price || 0),
        img: String(item.img || item.image || ""),
        qty: Math.max(1, Number(item.qty || item.quantity || 1)),
      }))
      .filter((item) => Number.isSafeInteger(item.id) && item.id > 0)
  } catch {
    return []
  }
}

function routeFromPath(pathname: string): Route {
  const page = pathname.split("/").pop()?.replace(/\.html$/, "")
  return page === "shop" || page === "about" || page === "contact" || page === "login" || page === "signup" || page === "product-detail" || page === "payment" || page === "account" || page === "admin-login" || page === "admin"
    ? page
    : "home"
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    bag: (
      <>
        <path d="M6 8h12l-1 12H7L6 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r=".5" fill="currentColor" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 17h16" />
      </>
    ),
    message: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4-.9L3 21l1.9-4.9a8.4 8.4 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3.5a8.5 8.5 0 0 1 8.5 8Z" />
        <path d="M8 12h.01M12.5 12h.01M17 12h.01" />
      </>
    ),
    palette: (
      <>
        <path d="M12 3a9 9 0 0 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a2 2 0 0 1 0-4h2.8A6.2 6.2 0 0 0 21 7.8C21 5.1 17 3 12 3Z" />
        <circle cx="7.5" cy="10" r=".7" fill="currentColor" />
        <circle cx="10" cy="6.7" r=".7" fill="currentColor" />
        <circle cx="15" cy="6.7" r=".7" fill="currentColor" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
        <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

type SignedInUser = { name?: string; email?: string }

function readSignedInUser(): SignedInUser | null {
  try {
    return JSON.parse(localStorage.getItem("mthunziAuthUser") || "null")
  } catch {
    return null
  }
}

function App() {
  const route = routeFromPath(window.location.pathname)
  const [signedInUser] = useState(readSignedInUser)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState("")
  const [settings, setSettings] = useState<SiteSettings>({
    storeEmail: "mthunzicreations@gmail.com",
    storePhone: "+265 881799537",
    storeAddress: "Lunzu Trading Centre, Blantyre, Malawi",
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [activeProduct, setActiveProduct] = useState<Product | null>(null)
  const [cart, setCart] = useState<CartItem[]>(readSavedCart)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState(
    () => new URLSearchParams(window.location.search).get("category") || "All",
  )
  const [toast, setToast] = useState("")
  const [contactSending, setContactSending] = useState(false)

  useEffect(() => {
    if (["login", "signup", "product-detail", "payment", "account", "admin-login", "admin"].includes(route)) {
      setProductsLoading(false)
      return
    }
    const controller = new AbortController()
    fetch(apiUrl("/api/products"), { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || "Unable to load artwork.")
        return Array.isArray(body.data) ? body.data : []
      })
      .then((rows: ProductRow[]) => {
        setProducts(
          rows.map((row) => ({
            id: Number(row.id),
            name: String(row.name || "Artwork"),
            category: String(row.category || "Artwork"),
            price: Number(row.price || 0),
            dimensions: String(row.dimensions || row.dims || "N/A"),
            image: String(row.image || row.image_url || ""),
            label: row.badge || undefined,
            description: String(row.description || ""),
            stock: row.in_stock === false ? 0 : Math.max(0, Number(row.stock || 0)),
          })),
        )
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setProductsError(error.message || "Unable to load artwork.")
        }
      })
      .finally(() => setProductsLoading(false))

    fetch(apiUrl("/api/site-settings"), { signal: controller.signal })
      .then((response) => response.json())
      .then((body) => {
        if (body.data) {
          setSettings((current) => ({ ...current, ...body.data }))
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(getCartStorageKey(), JSON.stringify(cart))
    } catch {
      setToast("Your browser could not save the cart on this device.")
    }
  }, [cart])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(""), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    document.body.classList.toggle(
      "no-scroll",
      menuOpen || cartOpen || !!activeProduct,
    )
    return () => document.body.classList.remove("no-scroll")
  }, [menuOpen, cartOpen, activeProduct])

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.category))).map(
      (name) => {
        const categoryProducts = products.filter((product) => product.category === name)
        return {
          name,
          count: `${categoryProducts.length} available works`,
          image:
            categoryProducts[0]?.image ||
            categoryImages[name] ||
            Object.values(categoryImages)[0],
        }
      },
    )
  }, [products])

  const filters = ["All", ...categories.map((category) => category.name)]
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesFilter = filter === "All" || product.category === filter
      const search = query.trim().toLowerCase()
      const matchesQuery =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search)
      return matchesFilter && matchesQuery
    })
  }, [filter, products, query])

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  const addToCart = (product: Product) => {
    if (product.stock < 1) {
      setToast("This artwork is currently unavailable.")
      return
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        )
      }
      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          img: product.image,
          qty: 1,
        },
      ]
    })
    setToast(`${product.name} added to your collection`)
    setActiveProduct(null)
  }

  const updateQuantity = (productId: number, quantity: number) => {
    setCart((current) =>
      quantity < 1
        ? current.filter((item) => item.id !== productId)
        : current.map((item) =>
            item.id === productId ? { ...item, qty: quantity } : item,
          ),
    )
  }

  const checkout = () => {
    if (!cart.length) return
    const handoffCart = cart.map((item) => ({
      id: item.id,
      name: item.name,
      img: item.img,
      price: item.price,
      qty: item.qty,
    }))
    localStorage.setItem("mthunziCart", JSON.stringify(handoffCart))
    window.location.href = "/payment.html"
  }

  const sendContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setContactSending(true)
    try {
      const response = await fetch(apiUrl("/api/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(values.get("name") || ""),
          email: String(values.get("email") || ""),
          subject: String(values.get("subject") || "Studio enquiry"),
          body: String(values.get("message") || ""),
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || "Unable to send your message.")
      form.reset()
      setToast("Your message has been sent to the studio.")
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to send your message.")
    } finally {
      setContactSending(false)
    }
  }

  const submitNewsletter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const email = String(values.get("email") || "")
    try {
      const response = await fetch(apiUrl("/api/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: email,
          email,
          subject: "Studio newsletter request",
          body: "Please contact me with studio updates and new work.",
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || "Unable to submit your request.")
      form.reset()
      setToast("Your studio updates request has been sent.")
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to submit your request.")
    }
  }

  const scrollTo = (id: string) => {
    if (route !== "home") {
      window.location.href = `/index.html#${id}`
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    }
    setMenuOpen(false)
  }

  const navigate = (page: Route, category?: string) => {
    setMenuOpen(false)
    const filename = page === "home" ? "index.html" : `${page}.html`
    const queryString = category ? `?category=${encodeURIComponent(category)}` : ""
    window.location.href = `/${filename}${queryString}`
  }

  if (route === "login" || route === "signup") {
    return <AuthPage mode={route} />
  }
  if (route === "account") return <AccountPage />
  if (route === "admin-login") return <AdminLoginPage />
  if (route === "admin") return <AdminPage />
  if (route === "product-detail") return <ProductDetailPage />
  if (route === "payment") return <PaymentPage />

  return (
    <main>
      <header
        className={`site-header ${route !== "home" ? "inner-header" : ""}`}
      >
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="Mthunzi Creations home"
        >
          <img className="brand-logo" src={projectLogo} alt="Mthunzi Creations" />
        </button>

        <nav className="desktop-nav" aria-label="Main navigation">
          <button
            className={route === "home" ? "active" : ""}
            onClick={() => navigate("home")}
          >
            Home
          </button>
          <button
            className={route === "shop" ? "active" : ""}
            onClick={() => navigate("shop")}
          >
            Shop
          </button>
          <button
            className={route === "about" ? "active" : ""}
            onClick={() => navigate("about")}
          >
            About
          </button>
          <button
            className={route === "contact" ? "active" : ""}
            onClick={() => navigate("contact")}
          >
            Contact
          </button>
        </nav>

        <div className="header-actions">
          <button
            className="text-action account-action"
            onClick={() => (window.location.href = signedInUser ? "/account.html" : "/login.html")}
            aria-label={signedInUser?.name ? `Account for ${signedInUser.name}` : "Sign in"}
          >
            <Icon name="user" size={18} />
            <span className="account-name">{signedInUser?.name?.trim() || "Sign in"}</span>
          </button>
          <button
            className="bag-action"
            onClick={() => setCartOpen(true)}
            aria-label={`Open cart with ${cartCount} items`}
          >
            <Icon name="bag" size={19} />
            <span>Bag</span>
            <b>{cartCount}</b>
          </button>
          <button
            className="menu-action"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" size={23} />
          </button>
        </div>
      </header>

      {route === "home" && (
        <>
          <section className="hero" id="home">
            <div className="hero-art" aria-hidden="true">
              <div className="art-frame">
                <img
                  src="https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1400&q=90"
                  alt=""
                />
              </div>
              <div className="art-note">
                <span>Original work</span>
                <strong>Made in Malawi</strong>
              </div>
            </div>
            <div className="hero-copy">
              <div className="eyebrow">
                <Icon name="location" size={16} />
                Blantyre, Malawi
              </div>
              <h1>
                A breeze of
                <em>creativity.</em>
              </h1>
              <p>
                Original paintings, considered drawings, and wearable art shaped
                by the colour, spirit, and stories of Malawi.
              </p>
              <div className="hero-buttons">
                <button
                  className="primary-button"
                  onClick={() => navigate("shop")}
                >
                  Explore the collection <Icon name="arrow" size={19} />
                </button>
                <button
                  className="underlined-button"
                  onClick={() => navigate("about")}
                >
                  Meet the artist
                </button>
              </div>
              <div className="hero-meta">
                <span>
                  <b>30+</b> original works
                </span>
                <span>
                  <b>100%</b> made in Malawi
                </span>
                <span>
                  <b>Worldwide</b> delivery
                </span>
              </div>
            </div>
            <div className="hero-index">01 / MTHUNZI</div>
          </section>

          <section className="intro-strip" aria-label="Studio values">
            <span>Original art</span>
            <i>•</i>
            <span>Small editions</span>
            <i>•</i>
            <span>Malawian stories</span>
            <i>•</i>
            <span>Made by hand</span>
            <i>•</i>
            <span>Original art</span>
          </section>

          <section className="section categories-section" id="collection">
            <div className="section-heading">
              <div>
                <span className="kicker">The collection</span>
                <h2>
                  Find art that <em>moves you.</em>
                </h2>
              </div>
              <p>
                Each piece begins with a story and ends with a feeling that is
                entirely your own.
              </p>
            </div>

            <div className="category-grid">
              {categories.map((category, index) => (
                <button
                  className="category-card"
                  key={category.name}
                  onClick={() => navigate("shop", category.name)}
                >
                  <img src={category.image} alt="" />
                  <span className="category-number">0{index + 1}</span>
                  <span className="category-overlay">
                    <small>{category.count}</small>
                    <strong>{category.name}</strong>
                    <i>
                      <Icon name="arrow" size={21} />
                    </i>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="section works-section" id="works">
            <div className="works-top">
              <div>
                <span className="kicker">Selected works</span>
                <h2>Made with intention</h2>
              </div>
              <div className="search-box">
                <Icon name="search" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search the collection"
                  aria-label="Search products"
                />
              </div>
            </div>

            <div className="filter-row">
              {filters.map((item) => (
                <button
                  key={item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
              <span>{filteredProducts.length} works</span>
            </div>

            <div className="product-grid">
              {filteredProducts.map((product, index) => (
                <article
                  className={`product-card product-${index + 1}`}
                  key={product.id}
                >
                  <button
                    className="product-image"
                    onClick={() => setActiveProduct(product)}
                    aria-label={`View ${product.name}`}
                  >
                    <img src={product.image} alt={product.name} />
                    {product.label && <span>{product.label}</span>}
                    <i>
                      <Icon name="arrow" size={22} />
                    </i>
                  </button>
                  <div className="product-details">
                    <div>
                      <small>
                        {product.category} · {product.dimensions}
                      </small>
                      <button onClick={() => setActiveProduct(product)}>
                        {product.name}
                      </button>
                    </div>
                    <div className="product-price">
                      <strong>MK {product.price.toLocaleString()}</strong>
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock < 1}
                        aria-label={`Add ${product.name} to cart`}
                      >
                        <Icon name="bag" size={19} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {productsLoading && filteredProducts.length === 0 && (
              <div className="empty-state">
                <h3>Loading available works</h3>
                <p>The collection is on its way.</p>
              </div>
            )}
            {!productsLoading && productsError && (
              <div className="empty-state">
                <h3>Collection unavailable</h3>
                <p>{productsError}</p>
              </div>
            )}
            {!productsLoading && !productsError && filteredProducts.length === 0 && (
              <div className="empty-state">
                <Icon name="palette" size={34} />
                <h3>No works found</h3>
                <p>Try another search or browse the full collection.</p>
                <button
                  onClick={() => {
                    setQuery("")
                    setFilter("All")
                  }}
                >
                  View all works
                </button>
              </div>
            )}
          </section>

          <section className="studio-paths">
            <div className="studio-paths-heading">
              <span className="kicker">Beyond the frame</span>
              <h2>
                One studio, many ways to <em>create.</em>
              </h2>
              <p>
                Discover original pieces, commission something personal, or
                bring Mthunzi’s visual language into a larger creative project.
              </p>
            </div>
            <div className="studio-paths-grid">
              <article>
                <span>01</span>
                <Icon name="palette" size={26} />
                <h3>Collect original art</h3>
                <p>
                  Paintings and drawings made in small, thoughtful collections
                  for homes, studios, and galleries.
                </p>
                <button onClick={() => navigate("shop")}>
                  Shop available work <Icon name="arrow" size={17} />
                </button>
              </article>
              <article>
                <span>02</span>
                <Icon name="heart" size={26} />
                <h3>Commission your story</h3>
                <p>
                  A personal artwork shaped around your memory, space, or idea
                  and created directly with the artist.
                </p>
                <button onClick={() => navigate("contact")}>
                  Discuss a commission <Icon name="arrow" size={17} />
                </button>
              </article>
              <article>
                <span>03</span>
                <Icon name="sparkle" size={26} />
                <h3>Create on a larger scale</h3>
                <p>
                  Murals, illustration, screen printing, sign-writing, and
                  visual work for spaces, books, and brands.
                </p>
                <button onClick={() => navigate("contact")}>
                  Start a project <Icon name="arrow" size={17} />
                </button>
              </article>
            </div>
          </section>

          <section className="commission-section">
            <div>
              <span className="kicker light">Commission a piece</span>
              <h2>Your story, brought to life by hand.</h2>
            </div>
            <p>
              Have a place, memory, or idea you want to hold onto? Let’s create
              something entirely yours.
            </p>
            <button onClick={() => navigate("contact")}>
              Start a conversation <Icon name="arrow" size={19} />
            </button>
          </section>
        </>
      )}

      {route === "shop" && (
        <div className="page-view shop-page">
          <section className="page-hero shop-page-hero">
            <span className="kicker">The collection</span>
            <h1>
              Art with a <em>story.</em>
            </h1>
            <p>
              Original works and small editions, created by hand in Blantyre and
              ready to find their place in your world.
            </p>
          </section>
          <section className="section shop-catalogue">
            <div className="works-top">
              <div>
                <span className="kicker">Shop all</span>
                <h2>Available works</h2>
              </div>
              <div className="search-box">
                <Icon name="search" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search the collection"
                  aria-label="Search products"
                />
              </div>
            </div>
            <div className="filter-row">
              {filters.map((item) => (
                <button
                  key={item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
              <span>{filteredProducts.length} works</span>
            </div>
            <div className="product-grid">
              {filteredProducts.map((product, index) => (
                <article
                  className={`product-card product-${index + 1}`}
                  key={product.id}
                >
                  <button
                    className="product-image"
                    onClick={() => setActiveProduct(product)}
                    aria-label={`View ${product.name}`}
                  >
                    <img src={product.image} alt={product.name} />
                    {product.label && <span>{product.label}</span>}
                    <i>
                      <Icon name="arrow" size={22} />
                    </i>
                  </button>
                  <div className="product-details">
                    <div>
                      <small>
                        {product.category} · {product.dimensions}
                      </small>
                      <button onClick={() => setActiveProduct(product)}>
                        {product.name}
                      </button>
                    </div>
                    <div className="product-price">
                      <strong>MK {product.price.toLocaleString()}</strong>
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock < 1}
                        aria-label={`Add ${product.name} to cart`}
                      >
                        <Icon name="bag" size={19} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {productsLoading && filteredProducts.length === 0 && (
              <div className="empty-state">
                <h3>Loading available works</h3>
                <p>The collection is on its way.</p>
              </div>
            )}
            {!productsLoading && productsError && (
              <div className="empty-state">
                <h3>Collection unavailable</h3>
                <p>{productsError}</p>
              </div>
            )}
            {!productsLoading && !productsError && filteredProducts.length === 0 && (
              <div className="empty-state">
                <Icon name="palette" size={34} />
                <h3>No works found</h3>
                <p>Try another search or browse the full collection.</p>
                <button
                  onClick={() => {
                    setQuery("")
                    setFilter("All")
                  }}
                >
                  View all works
                </button>
              </div>
            )}
          </section>
          <section className="shop-assurance">
            <div>
              <strong>Signed originals</strong>
              <span>Every original is signed by Mthunzi.</span>
            </div>
            <div>
              <strong>Worldwide delivery</strong>
              <span>Carefully packed and shipped internationally.</span>
            </div>
            <div>
              <strong>Direct from the studio</strong>
              <span>Your purchase supports independent Malawian art.</span>
            </div>
          </section>
        </div>
      )}

      {route === "about" && (
        <div className="page-view about-page">
          <section className="about-editorial-hero">
            <div className="about-hero-copy">
              <span className="kicker">Mthunzi · Artist & founder</span>
              <h1>
                Art shaped by place, made with <em>purpose.</em>
              </h1>
              <p>
                From a studio in Blantyre, Mthunzi creates expressive work that
                turns observation, memory, and everyday Malawian life into
                colour, line, and form.
              </p>
              <div className="about-hero-actions">
                <button
                  className="primary-button"
                  onClick={() => navigate("shop")}
                >
                  View available work <Icon name="arrow" size={18} />
                </button>
                <button
                  className="underlined-button"
                  onClick={() => navigate("contact")}
                >
                  Contact the studio
                </button>
              </div>
            </div>
            <figure className="about-hero-art">
              <img
                src="https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1100&q=90"
                alt="Expressive original artwork"
              />
              <figcaption>
                <span>Inside the practice</span>
                <strong>Colour, culture & connection</strong>
              </figcaption>
            </figure>
          </section>

          <section className="about-statement">
            <span>Based in Blantyre, Malawi</span>
            <p>
              “The goal is not only to make something beautiful. It is to make
              something honest—work that carries a feeling, starts a
              conversation, and stays with you.”
            </p>
          </section>

          <section className="about-profile">
            <div className="about-profile-images">
              <img
                className="profile-image-main"
                src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1000&q=90"
                alt="Artist tools and paint in a working studio"
              />
              <img
                className="profile-image-detail"
                src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=700&q=90"
                alt="Detail of an original artwork"
              />
              <span>
                Working across painting, drawing, print, and public art
              </span>
            </div>
            <div className="about-profile-copy">
              <span className="kicker">The story</span>
              <h2>
                From first marks to an independent <em>studio.</em>
              </h2>
              <p className="profile-lead">
                Mthunzi’s practice began with curiosity: a natural instinct to
                draw, observe, and translate the world around him into images.
              </p>
              <p>
                Largely self-taught, he learned by making—experimenting with
                drawing, painting, illustration, and print until each medium
                became part of a distinctive visual language. The process was
                patient, practical, and shaped by a belief that strong creative
                work comes from attention and consistency.
              </p>
              <p>
                That personal practice grew into Mthunzi Creations, an
                independent creative enterprise in Blantyre. Today the studio
                produces original artwork and also works across screen printing,
                murals, sign-writing, illustration, art lessons, and creative
                consultancy.
              </p>
              <button
                className="underlined-button"
                onClick={() => navigate("contact")}
              >
                Work with the studio <Icon name="arrow" size={18} />
              </button>
            </div>
          </section>

          <section className="about-facts">
            <div>
              <strong>Blantyre</strong>
              <span>Home of the studio</span>
            </div>
            <div>
              <strong>Self-taught</strong>
              <span>Built through practice</span>
            </div>
            <div>
              <strong>Multi-disciplinary</strong>
              <span>From canvas to public space</span>
            </div>
            <div>
              <strong>Malawian made</strong>
              <span>Created with local perspective</span>
            </div>
          </section>

          <section className="artist-journey">
            <div className="journey-heading">
              <span className="kicker">The journey</span>
              <h2>A practice that keeps evolving.</h2>
              <p>
                Every stage has added a new material, skill, or way of telling a
                story.
              </p>
            </div>
            <div className="journey-steps">
              <article>
                <small>01</small>
                <div>
                  <span>The beginning</span>
                  <h3>Drawing what was close</h3>
                </div>
                <p>
                  Early drawings turned everyday observation into a regular
                  creative practice.
                </p>
              </article>
              <article>
                <small>02</small>
                <div>
                  <span>Finding a voice</span>
                  <h3>Learning by making</h3>
                </div>
                <p>
                  Experimenting across materials developed confidence, craft,
                  and a recognisable visual language.
                </p>
              </article>
              <article>
                <small>03</small>
                <div>
                  <span>Building the studio</span>
                  <h3>Mthunzi Creations</h3>
                </div>
                <p>
                  The practice expanded into an enterprise serving collectors,
                  communities, businesses, and creative partners.
                </p>
              </article>
              <article>
                <small>04</small>
                <div>
                  <span>The work today</span>
                  <h3>Creating with purpose</h3>
                </div>
                <p>
                  The studio continues to create original work while helping
                  other people bring meaningful visual ideas to life.
                </p>
              </article>
            </div>
          </section>

          <section className="about-practice">
            <div className="practice-heading">
              <span className="kicker">The practice</span>
              <h2>Built for expression in many forms.</h2>
              <p>
                The studio brings the same attention to craft and storytelling
                to every scale of work.
              </p>
            </div>
            <div className="practice-list">
              <div>
                <span>01</span>
                <strong>Original painting & drawing</strong>
              </div>
              <div>
                <span>02</span>
                <strong>Private commissions</strong>
              </div>
              <div>
                <span>03</span>
                <strong>Murals & public artwork</strong>
              </div>
              <div>
                <span>04</span>
                <strong>Illustration & sign-writing</strong>
              </div>
              <div>
                <span>05</span>
                <strong>Screen printing</strong>
              </div>
              <div>
                <span>06</span>
                <strong>Lessons & creative consultancy</strong>
              </div>
            </div>
          </section>

          <section className="commission-section">
            <div>
              <span className="kicker light">Create together</span>
              <h2>Have an idea for a custom piece?</h2>
            </div>
            <p>
              From private commissions to murals and illustration, bring your
              story to the studio.
            </p>
            <button onClick={() => navigate("contact")}>
              Start a conversation <Icon name="arrow" size={19} />
            </button>
          </section>
        </div>
      )}

      {route === "contact" && (
        <div className="page-view contact-page">
          <section className="page-hero contact-page-hero">
            <span className="kicker">Contact the studio</span>
            <h1>
              Let’s make something <em>meaningful.</em>
            </h1>
            <p>
              Ask about an artwork, discuss a commission, or simply say hello.
              The studio would love to hear from you.
            </p>
          </section>
          <section className="contact-layout">
            <div className="contact-details">
              <span className="kicker">Get in touch</span>
              <h2>
                Blantyre,
                <br />
                Malawi
              </h2>
              <div className="contact-list">
                <a href={`mailto:${settings.storeEmail}`}>
                  <small>Email</small>
                  <strong>{settings.storeEmail}</strong>
                </a>
                <a
                  href={`https://wa.me/${settings.storePhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <small>WhatsApp</small>
                  <strong>{settings.storePhone}</strong>
                </a>
                <span>
                  <small>Studio hours</small>
                  <strong>Mon–Fri, 9:00–17:00 CAT</strong>
                </span>
              </div>
              <p>
                For artwork enquiries, include the title of the piece. For
                commissions, tell us a little about your idea, preferred size,
                and timeline.
              </p>
            </div>
            <form className="contact-form" onSubmit={sendContact}>
              <div className="form-row">
                <label>
                  <span>Name</span>
                  <input required name="name" placeholder="Your full name" />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    required
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                  />
                </label>
              </div>
              <label>
                <span>What can we help with?</span>
                <select name="subject" defaultValue="Artwork enquiry">
                  <option>Artwork enquiry</option>
                  <option>Commission a piece</option>
                  <option>Murals & illustration</option>
                  <option>Art lessons</option>
                  <option>Something else</option>
                </select>
              </label>
              <label>
                <span>Message</span>
                <textarea
                  required
                  name="message"
                  rows={6}
                  placeholder="Tell us about your idea or enquiry..."
                />
              </label>
              <button className="primary-button" type="submit" disabled={contactSending}>
                {contactSending ? "Sending..." : "Send message"} <Icon name="arrow" size={19} />
              </button>
            </form>
          </section>
        </div>
      )}

      <footer id="contact">
        <div className="footer-main">
          <div className="footer-brand">
            <img className="brand-logo" src={projectLogo} alt="" />
            <h2>
              Art made in Malawi,
              <br />
              <em>for the world.</em>
            </h2>
            <p>
              Join the studio letter for new work, stories, and first access to
              limited editions.
            </p>
            <form onSubmit={submitNewsletter}>
              <input
                required
                type="email"
                name="email"
                placeholder="Your email address"
                aria-label="Your email address"
              />
              <button aria-label="Subscribe">
                <Icon name="arrow" size={20} />
              </button>
            </form>
          </div>
          <div className="footer-links">
            <div>
              <h3>Explore</h3>
              <button onClick={() => navigate("shop")}>Shop all</button>
              {categories.map((category) => (
                <button key={category.name} onClick={() => navigate("shop", category.name)}>
                  {category.name}
                </button>
              ))}
            </div>
            <div>
              <h3>Studio</h3>
              <button onClick={() => navigate("about")}>About Mthunzi</button>
              <button onClick={() => navigate("contact")}>
                Commissions
              </button>
              <button onClick={() => setToast("Worldwide shipping available")}>
                Shipping & returns
              </button>
              <button onClick={() => navigate("contact")}>Contact</button>
            </div>
            <div>
              <h3>Connect</h3>
              <a href="https://instagram.com" target="_blank" rel="noreferrer">
                <Icon name="instagram" size={16} /> Instagram
              </a>
              <a
                href={`https://wa.me/${settings.storePhone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="message" size={16} /> WhatsApp
              </a>
              <a href={`mailto:${settings.storeEmail}`}>
                <Icon name="mail" size={16} /> {settings.storeEmail}
              </a>
              <span>
                <Icon name="location" size={16} /> {settings.storeAddress}
              </span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Mthunzi Creations</span>
          <span>Original art, made with soul.</span>
        </div>
      </footer>

      {menuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-top">
            <span className="brand-name">
              <strong>Mthunzi</strong>
              <small>Creations</small>
            </span>
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <Icon name="close" size={25} />
            </button>
          </div>
          <nav>
            {(["home", "shop", "about", "contact"] as Route[]).map(
              (item, index) => (
                <button key={item} onClick={() => navigate(item)}>
                  <small>0{index + 1}</small>
                  {item === "shop"
                    ? "Shop"
                    : item.charAt(0).toUpperCase() + item.slice(1)}
                  <Icon name="chevron" size={20} />
                </button>
              ),
            )}
          </nav>
          <p>Original art from Blantyre, Malawi.</p>
        </div>
      )}

      {cartOpen && (
        <div className="overlay" onMouseDown={() => setCartOpen(false)}>
          <aside
            className="cart-drawer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <span className="kicker">Your selection</span>
                <h2>
                  Art bag <small>({cartCount})</small>
                </h2>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                <Icon name="close" size={24} />
              </button>
            </div>
            <div className="cart-list">
              {cart.length ? (
                cart.map((product) => (
                  <div className="cart-item" key={product.id}>
                    <img src={product.img} alt="" />
                    <div>
                      <small>{product.category}</small>
                      <strong>{product.name}</strong>
                      <span>MK {product.price.toLocaleString()} · Qty {product.qty}</span>
                    </div>
                    <button
                      onClick={() => updateQuantity(product.id, 0)}
                      aria-label={`Remove ${product.name}`}
                    >
                      <Icon name="close" size={17} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-cart">
                  <Icon name="bag" size={34} />
                  <h3>Your bag is waiting</h3>
                  <p>Discover a piece that speaks to you.</p>
                  <button
                    onClick={() => {
                      setCartOpen(false)
                      navigate("shop")
                    }}
                  >
                    Explore works
                  </button>
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="cart-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>MK {total.toLocaleString()}</strong>
                </div>
                <p>Shipping is calculated after your location is confirmed.</p>
                <button onClick={checkout}>
                  Continue to checkout <Icon name="arrow" size={19} />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {activeProduct && (
        <div
          className="overlay product-overlay"
          onMouseDown={() => setActiveProduct(null)}
        >
          <div
            className="product-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setActiveProduct(null)}
              aria-label="Close product details"
            >
              <Icon name="close" size={23} />
            </button>
            <div className="modal-image">
              <img src={activeProduct.image} alt={activeProduct.name} />
            </div>
            <div className="modal-copy">
              <span className="kicker">{activeProduct.category}</span>
              <h2>{activeProduct.name}</h2>
              <span className="modal-price">
                MK {activeProduct.price.toLocaleString()}
              </span>
              <p>{activeProduct.description}</p>
              <dl>
                <div>
                  <dt>Size</dt>
                  <dd>{activeProduct.dimensions}</dd>
                </div>
                <div>
                  <dt>Origin</dt>
                  <dd>Blantyre, Malawi</dd>
                </div>
                <div>
                  <dt>Authenticity</dt>
                  <dd>Signed original</dd>
                </div>
              </dl>
              <button
                className="primary-button"
                disabled={activeProduct.stock < 1}
                onClick={() => addToCart(activeProduct)}
              >
                {activeProduct.stock > 0 ? "Add to art bag" : "Sold out"} <Icon name="bag" size={19} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast ? "show" : ""}`} role="status">
        <Icon name="check" size={17} /> {toast}
      </div>
    </main>
  )
}

export default App
