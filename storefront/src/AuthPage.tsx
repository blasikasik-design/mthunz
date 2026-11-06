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
    const firstName = String(values.get("firstName") || "").trim()
    const lastName = String(values.get("lastName") || "").trim()
    const name = `${firstName} ${lastName}`.trim()
    const email = String(values.get("email") || "").trim()
    const phone = String(values.get("phone") || "").trim()
    const password = String(values.get("password") || "")
    const confirmation = String(values.get("confirmation") || "")

    if (!emailPattern.test(email)) {
      setStatus("Please enter a valid email address.")
      setStatusType("error")
      return
    }
    if (isSignup && (!firstName || !lastName)) {
      setStatus("Please enter your first and last name.")
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

  const fieldClass = "w-full border border-[#cfc7bb] bg-[#fffdf9] py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-[#2d6cbb] focus:ring-2 focus:ring-[#2d6cbb]/10"
  const fieldLabelClass = "grid gap-2 text-[11px] font-semibold text-[#252925]"

  return (
    <main className="min-h-screen bg-[#fbf8f2] text-[#1d211f] md:grid md:grid-cols-[43%_57%]">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#183655] px-[5vw] py-11 text-white md:flex">
        <img className="absolute inset-0 h-full w-full object-cover" src="https://images.unsplash.com/photo-1541519230324-f6779f9f4a48?auto=format&fit=crop&w=1400&q=88" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10233a]/90 via-[#183655]/35 to-[#183655]/20" />
        <a className="relative z-10 inline-flex w-fit items-center gap-3 text-xs font-semibold uppercase tracking-[.18em]" href="/index.html">
          <img className="login-brand-logo" src={projectLogo} alt="Mthunzi Creations" />
        </a>
        <div className="relative z-10 max-w-xl pb-2">
          <p className="text-[9px] font-semibold tracking-[.2em] text-[#efc38e]">{isSignup ? "JOIN THE COLLECTION" : "WELCOME BACK"}</p>
          <h1 className="mt-5 font-serif text-5xl leading-[1.02] lg:text-7xl">
            {isSignup ? <>Art finds a home.<br /><em className="text-[#efc38e]">Make yours here.</em></> : <>Your collection<br /><em className="text-[#efc38e]">is waiting.</em></>}
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/80">Save the pieces that move you, follow your orders, and discover new work from Malawi.</p>
        </div>
        <p className="relative z-10 text-[9px] uppercase tracking-[.17em] text-white/75">Original art · Made in Malawi</p>
      </section>

      <section className="relative grid min-h-screen place-items-center px-6 py-14 sm:px-10 md:px-[7vw]">
        <a className="absolute right-6 top-6 text-[11px] text-[#4c596b] underline underline-offset-4 sm:right-10 md:right-[5vw]" href="/index.html">Back to home</a>
        <form className="w-full max-w-[500px] space-y-5" onSubmit={submit}>
          <a className="mb-6 inline-flex items-center gap-2 text-sm text-[#4c596b] md:hidden" href="/index.html">
            <img className="login-brand-logo login-brand-logo-compact" src={projectLogo} alt="Mthunzi Creations" />
          </a>
          <p className="text-[9px] font-semibold tracking-[.2em] text-[#2d6cbb]">ACCOUNT</p>
          <h2 className="font-serif text-4xl leading-tight sm:text-5xl">{isSignup ? "Create your account" : "Sign in to Mthunzi"}</h2>
          <p className="-mt-2 text-sm text-[#777067]">{isSignup ? "A personal space for the art you love." : "Welcome back. Enter your details below."}</p>

          {isSignup && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldLabelClass}>First name<input className={fieldClass} name="firstName" autoComplete="given-name" placeholder="First name" required /></label>
              <label className={fieldLabelClass}>Last name<input className={fieldClass} name="lastName" autoComplete="family-name" placeholder="Last name" required /></label>
            </div>
          )}
          <label className={fieldLabelClass}>Email address
            <span className="relative block"><svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#817a70]" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><input className={fieldClass} name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></span>
          </label>
          {isSignup && <label className={fieldLabelClass}>Phone number <span className="font-normal text-[#817a70]">(optional)</span><input className="w-full border border-[#cfc7bb] bg-[#fffdf9] px-4 py-3.5 text-sm outline-none focus:border-[#2d6cbb] focus:ring-2 focus:ring-[#2d6cbb]/10" name="phone" type="tel" autoComplete="tel" placeholder="+265..." /></label>}
          <label className={fieldLabelClass}>Password
            <span className="relative block"><svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#817a70]" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input className={fieldClass} name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} placeholder={isSignup ? "At least 8 characters" : "Your password"} required /></span>
          </label>
          {isSignup && <label className={fieldLabelClass}>Confirm password<input className="w-full border border-[#cfc7bb] bg-[#fffdf9] px-4 py-3.5 text-sm outline-none focus:border-[#2d6cbb] focus:ring-2 focus:ring-[#2d6cbb]/10" name="confirmation" type="password" autoComplete="new-password" minLength={8} required /></label>}
          {isSignup && <label className="flex items-start gap-2 text-[11px] font-normal leading-5 text-[#5f665f]"><input className="mt-1 accent-[#2d6cbb]" type="checkbox" required /> I agree to the Terms of Service and Privacy Policy.</label>}
          {!isSignup && <div className="flex items-center gap-2 text-[11px] text-[#5f665f]"><input className="accent-[#2d6cbb]" type="checkbox" /> Remember me</div>}
          <p className={`min-h-5 text-sm ${statusType === "error" ? "text-red-700" : "text-blue-800"}`} role="status" aria-live="polite">{status}</p>
          <button className="flex min-h-12 w-full items-center justify-between bg-[#2d6cbb] px-5 py-3.5 text-xs font-semibold text-white transition hover:bg-[#1f528e] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={busy}>{busy ? "Please wait…" : isSignup ? "Create my account" : "Sign in"}<span aria-hidden="true">→</span></button>
          <p className="pt-1 text-center text-[11px] text-[#777067]">{isSignup ? "Already have an account?" : "New to Mthunzi?"}{" "}<a className="border-b border-[#1d211f] pb-0.5 font-semibold text-[#1d211f]" href={isSignup ? "/login.html" : "/signup.html"}>{isSignup ? "Sign in" : "Create an account"}</a></p>
        </form>
      </section>
    </main>
  )
}