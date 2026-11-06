import { useState, type FormEvent } from "react"
import { apiUrl } from "./api"
import projectLogo from "./brand"

export default function AdminLoginPage() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setBusy(true)
    setError("")
    try {
      const response = await fetch(apiUrl("/api/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(values.get("email") || "").trim(),
          password: String(values.get("password") || ""),
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.data) throw new Error(body.error || "Login failed.")
      localStorage.removeItem("mthunziAdminAuth")
      sessionStorage.setItem("mthunziAdminAuth", JSON.stringify(body.data))
      window.location.replace("/admin.html")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection error. Please try again.")
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#eef3f8] px-5 py-12 text-[#24251f]">
      <section className="w-full max-w-md border border-[#d4dbd3] bg-white p-8 sm:p-11">
        <a className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[.2em] text-[#42658f]" href="/index.html"><img className="size-11 rounded-full bg-white object-contain p-0.5" src={projectLogo} alt="" />Mthunzi Creations</a>
        <p className="mt-12 text-[10px] font-semibold uppercase tracking-[.22em] text-[#a5482e]">Studio operations</p>
        <h1 className="mt-3 font-serif text-4xl">Administrator sign in</h1>
        <p className="mt-3 text-sm leading-6 text-[#6b655c]">Sign in with the administrator account to manage the store.</p>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          <label className="block text-xs font-semibold uppercase tracking-[.12em]">Email<input className="mt-2 block w-full border border-[#d6d0c6] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#a5482e]" type="email" name="email" autoComplete="username" required /></label>
          <label className="block text-xs font-semibold uppercase tracking-[.12em]">Password<input className="mt-2 block w-full border border-[#d6d0c6] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#a5482e]" type="password" name="password" autoComplete="current-password" required /></label>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <button className="flex w-full justify-between bg-[#1a2e4a] px-5 py-4 text-sm font-semibold text-white hover:bg-[#2d507d] disabled:opacity-60" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<span aria-hidden="true">→</span></button>
        </form>
      </section>
    </main>
  )
}