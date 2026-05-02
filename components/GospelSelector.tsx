'use client';

import Link from 'next/link';
import type { Gospel } from '@/lib/types';
import { GOSPELS } from '@/lib/types';

interface Props {
  current: Gospel;
  chapter: number;
  verse: number;
}

const GOSPEL_LABELS: Record<Gospel, string> = {
  matthew: 'Matthew',
  mark: 'Mark',
  luke: 'Luke',
  john: 'John',
};

export function GospelSelector({ current, chapter, verse }: Props) {
  return (
    <nav
      className="flex gap-1 px-4 py-2 bg-stone-900 text-sm"
      aria-label="Gospel selection"
    >
      {GOSPELS.map((gospel) => {
        const isActive = gospel === current;
        return (
          <Link
            key={gospel}
            href={`/${gospel}/${chapter}/${verse}`}
            className={
              isActive
                ? 'px-3 py-1 rounded bg-white text-stone-900 font-semibold'
                : 'px-3 py-1 rounded text-stone-300 hover:text-white hover:bg-stone-700'
            }
            aria-current={isActive ? 'page' : undefined}
          >
            {GOSPEL_LABELS[gospel]}
          </Link>
        );
      })}
    </nav>
  );
}
