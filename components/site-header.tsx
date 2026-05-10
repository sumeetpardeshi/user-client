import Image from "next/image";
import Link from "next/link";

const NAV = [{ href: "/", label: "Brief" }] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/90 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 rounded-lg outline-none ring-amber-400/0 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          <div className="relative size-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-zinc-200/90 shadow-sm sm:size-11">
            <Image
              src="/sleeperagent-logo.png"
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 40px, 44px"
              priority
            />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="font-[family-name:var(--font-fraunces)] text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
              SleeperAgent
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-widest text-amber-800/90 sm:block">
              Research brief
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
