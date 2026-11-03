import { useState, type FormEvent } from "react"
import { apiUrl } from "./api"
import projectLogo from "./brand"

type AuthMode = "login" | "signup"

type AuthResponse = {
  data?: Record<string, unknown>
  error?: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const strongPasswordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

function getRedirectTarget() {
  const target = localStorage.getItem("mthunziAuthRedirect")
  localStorage.removeItem("mthunziAuthRedirect")
  if (!target) return "/account.html"
  try {
    const url = new URL(target, window.location.origin)
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : "/account.html"
  } catch {
    return "/account.html"
  }
}

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const isSignup = mode === "signup"
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")
  const [statusType, setStatusType] = useState<"error" | "success" | "">("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const name = String(values.get("name") || "").trim()
    const email = String(values.get("email") || "").trim()
    const phone = String(values.get("phone") || "").trim()
    const password = String(values.get("password") || "")
    const confirmation = String(values.get("confirmation") || "")

    if (!emailPattern.test(email)) {
      setStatus("Please enter a valid email address.")
      setStatusType("error")
      return
    }
    if (isSignup && !name) {
      setStatus("Please enter your name.")
      setStatusType("error")
      return
    }
    if (isSignup && !strongPasswordPattern.test(password)) {
      setStatus("Password must be at least 8 characters and include a letter and number.")
      setStatusType("error")
      return
    }
    if (isSignup && password !== confirmation) {
      setStatus("The passwords do not match.")
      setStatusType("error")
      return
    }
    if (!isSignup && password.length < 8) {
      setStatus("Password must be at least 8 characters long.")
      setStatusType("error")
      return
    }

    setBusy(true)
    setStatus("")
    try {
      const response = await fetch(apiUrl(isSignup ? "/api/signup" : "/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignup ? { name, email, phone, password } : { email, password },
        ),
      })
      const body = (await response.json().catch(() => ({}))) as AuthResponse
      if (!response.ok || !body.data) {
        throw new Error(body.error || (isSignup ? "Signup failed." : "Login failed."))
      }

      localStorage.setItem("mthunziAuthUser", JSON.stringify(body.data))
      setStatus(isSignup ? "Account created. Redirecting..." : "Welcome back. Redirecting...")
      setStatusType("success")
      window.setTimeout(() => window.location.assign(getRedirectTarget()), 700)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to connect to the server.")
      setStatusType("error")
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#26231f] md:grid md:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#292d27] text-white md:flex md:flex-col md:justify-between md:p-12 lg:p-16">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-screen"
          src={isSignup
            ? "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1400&q=85"
            : "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1400&q=85"}
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#20261f]/80 via-[#292d27]/55 to-[#8c432f]/40" />
        <a className="relative z-10 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.2em]" href="/index.html">
          <img className="size-12 rounded-full bg-white object-contain p-1" src={projectLogo} alt="" />
          Mthunzi Creations
        </a>
        <div className="relative z-10 max-w-xl pb-8">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[.25em] text-[#e2bd73]">Art from Malawi</p>
          <h1 className="font-serif text-5xl leading-[1.02] lg:text-7xl">
            {isSignup ? "Make room for original art." : "Welcome back to your creative space."}
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/75">
            {isSignup
              ? "Create an account to save your cart, follow your orders, and stay close to new work from the studio."
              : "Sign in to continue discovering original work, wearable art, and custom pieces from Blantyre."}
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/60">Original work, made in Malawi.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <a className="mb-12 inline-flex items-center gap-2 text-sm text-[#514b44] hover:text-[#a5482e] md:hidden" href="/index.html">
            <img className="size-9 rounded-full bg-white object-contain p-0.5" src={projectLogo} alt="" />
            Mthunzi Creations
          </a>
          <p className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#a5482e]">
            {isSignup ? "Join the studio" : "Your account"}
          </p>
          <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
            {isSignup ? "Create account" : "Sign in"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#6b655c]">
            {isSignup ? "A few details and you're ready to explore." : "Enter your email and password to continue."}
          </p>

          <form className="mt-9 space-y-5" onSubmit={submit}>
            {isSignup && (
              <label className="block text-xs font-semibold uppercase tracking-[.12em]">
                Full name
                <input className="mt-2 block w-full border border-[#d6d0c6] bg-white px-4 py-3.5 text-sm font-normal normal-case tracking-normal outline-none transition focus:border-[#a5482e] focus:ring-2 focus:ring-[#a5482e]/15" name="name" autoComplete="name" required />
              </label>
            )}
            <label className="block text-xs font-semibold uppercase tracking-[.12em]">
              Email
              <input className="mt-2 block w-full border border-[#d6d0c6] bg-white px-4 py-3.5 text-sm font-normal normal-case tracking-normal outline-none transition focus:border-[#a5482e] focus:ring-2 focus:ring-[#a5482e]/15" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
            </label>
            {isSignup && (
              <label className="block text-xs font-semibold uppercase tracking-[.12em]">
                Phone <span className="font-normal normal-case tracking-normal text-[#817a70]">(optional, include country code)</span>
                <input className="mt-2 block w-full border border-[#d6d0c6] bg-white px-4 py-3.5 text-sm font-normal normal-case tracking-normal outline-none transition focus:border-[#a5482e] focus:ring-2 focus:ring-[#a5482e]/15" name="phone" type="tel" autoComplete="tel" placeholder="+265..." />
              </label>
            )}
            <label className="block text-xs font-semibold uppercase tracking-[.12em]">
              Password
              <input className="mt-2 block w-full border border-[#d6d0c6] bg-white px-4 py-3.5 text-sm font-normal normal-case tracking-normal outline-none transition focus:border-[#a5482e] focus:ring-2 focus:ring-[#a5482e]/15" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} required />
            </label>
            {isSignup && (
              <label className="block text-xs font-semibold uppercase tracking-[.12em]">
                Confirm password
                <input className="mt-2 block w-full border border-[#d6d0c6] bg-white px-4 py-3.5 text-sm font-normal normal-case tracking-normal outline-none transition focus:border-[#a5482e] focus:ring-2 focus:ring-[#a5482e]/15" name="confirmation" type="password" autoComplete="new-password" required />
              </label>
            )}

            <p className={`min-h-5 text-sm ${statusType === "error" ? "text-red-700" : "text-emerald-800"}`} role="status" aria-live="polite">
              {status}
            </p>
            <button className="flex w-full items-center justify-between bg-[#a5482e] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#853721] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={busy}>
              {busy ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="mt-7 text-sm text-[#6b655c]">
            {isSignup ? "Already have an account?" : "New to the studio?"}{" "}
            <a className="font-semibold text-[#a5482e] underline decoration-[#a5482e]/40 underline-offset-4" href={isSignup ? "/login.html" : "/signup.html"}>
              {isSignup ? "Sign in" : "Create account"}
            </a>
          </p>
          <a className="mt-4 inline-block text-xs text-[#6b655c] underline underline-offset-4" href="/shop.html">Back to the shop</a>
        </div>
      </section>
    </main>
  )
}