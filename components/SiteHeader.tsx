import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="bg-band text-ink-on-band px-4 py-3 grid grid-cols-3 items-center">
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold tracking-tight leading-tight">
          <Link href="/matthew/1/1" className="hover:text-accent-gold-soft transition-colors">
            Urevangelium
          </Link>
        </h1>
        <span className="text-[13px] italic text-ink-on-band-muted leading-none mt-0.5">
          ur-eh-van-GAY-lee-um · the original Gospel
        </span>
      </div>
      <p className="text-lg text-ink-on-band-muted text-center leading-snug">
        The Gospels across their earliest witnesses, and the tradition they carried forward
      </p>
      <nav aria-label="Primary navigation" className="flex items-center justify-end gap-5 text-sm">
        <Link href="/matthew/1/1" className="text-ink-on-band-muted hover:text-ink-on-band transition-colors">
          Gospels
        </Link>
        <Link href="/papyrus-map" className="text-ink-on-band-muted hover:text-ink-on-band transition-colors">
          Papyri
        </Link>
        <Link href="/sources" className="text-ink-on-band-muted hover:text-ink-on-band transition-colors">
          Sources
        </Link>
        <Link href="/certification-systems" className="text-ink-on-band-muted hover:text-ink-on-band transition-colors">
          Methods
        </Link>
        <Link href="/vaticanus-english-exceptions" className="text-ink-on-band-muted hover:text-ink-on-band transition-colors">
          Exceptions
        </Link>
      </nav>
    </header>
  );
}
