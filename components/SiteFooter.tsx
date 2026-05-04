import type { ReactNode } from 'react';

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="text-ink-muted underline decoration-transparent underline-offset-2 hover:decoration-accent-gold transition-colors duration-150"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer
      className="border-t border-rule-hairline py-6 px-4 text-ink-muted text-[11px] leading-[1.6]"
      style={{ borderTopWidth: '0.5px' }}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="font-semibold mb-2">Source data</p>
          <p className="mb-1">
            Greek New Testament: Center for New Testament Restoration (CNTR),{' '}
            <FooterLink href="https://greekcntr.org">greekcntr.org</FooterLink>
            {' '}·{' '}
            Robinson-Pierpont Byzantine Textform (2018),{' '}
            <FooterLink href="https://byzantinetext.com">byzantinetext.com</FooterLink>
          </p>
          <p className="mb-1">Latin: Clementine Vulgate (1592, public domain)</p>
          <p className="mb-1">Syriac: Peshitta (BFBS 1905, public domain)</p>
          <p>
            English glosses: Tyndale House Cambridge STEP Bible (TAGNT) · Whitaker&apos;s Words
            (William Whitaker, public domain) · A Compendious Syriac Dictionary (Jessie Payne
            Smith, 1903, public domain)
          </p>
        </div>
        <div>
          <p className="font-semibold mb-2">License</p>
          <p>
            Urevangelium is released under the{' '}
            <FooterLink href="https://creativecommons.org/licenses/by-sa/4.0/">
              Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0)
            </FooterLink>
            . Source data acquired from the Center for New Testament Restoration is incorporated
            under its CC BY-SA 4.0 license; this project honors the ShareAlike obligation by
            releasing all derivative alignment data under the same terms. You are free to share
            and adapt this work, including for commercial use, provided you give appropriate
            credit and license your derivative work under the same terms.
          </p>
        </div>
      </div>
      <p className="mt-6">© 2026 Urevangelium</p>
    </footer>
  );
}
