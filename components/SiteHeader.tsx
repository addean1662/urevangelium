export function SiteHeader() {
  return (
    <header className="bg-band text-ink-on-band px-4 py-3 grid grid-cols-3 items-center">
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold tracking-tight leading-tight">Urevangelium</h1>
        <span className="text-[13px] italic text-ink-on-band-muted leading-none mt-0.5">
          ur-eh-van-GAY-lee-um · the original Gospel
        </span>
      </div>
      <p className="text-lg text-ink-on-band-muted text-center leading-snug">
        The Gospels across their earliest witnesses, and the tradition they carried forward
      </p>
      <div />
    </header>
  );
}
