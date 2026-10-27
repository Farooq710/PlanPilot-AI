import Link from 'next/link'

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">404</p>
      <h1 className="display mt-2 text-[40px]">No plan here</h1>
      <p className="mt-2 text-[16px] text-ink-muted">
        This link may have expired, or the plan was never created. Shared plans live only as long
        as the server that made them.
      </p>
      <p className="mt-6">
        <Link
          href="/brief"
          className="tx inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-[14px] font-semibold text-white hover:opacity-90"
        >
          Start a new plan
        </Link>
      </p>
    </main>
  )
}
