'use client';

import { useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  content: React.ReactNode;
}

export function HoverTooltip({ children, content }: Props) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={spanRef}
      className="relative"
      onMouseEnter={() => {
        const r = spanRef.current?.getBoundingClientRect();
        if (r) setAnchor({ x: r.left + r.width / 2, y: r.top - 6 });
      }}
      onMouseLeave={() => setAnchor(null)}
    >
      {children}
      {anchor && content && (
        <span
          style={{
            position: 'fixed',
            top: anchor.y,
            left: anchor.x,
            transform: 'translate(-50%, -100%)',
            background: '#1a1510',
            border: '1px solid rgba(200,170,120,.25)',
            borderRadius: 4,
            padding: '8px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,.6)',
            zIndex: 9999,
            maxWidth: 320,
            maxHeight: '40vh',
            overflowY: 'auto',
            width: 'max-content',
            color: 'rgba(200,180,150,.85)',
            fontSize: 13,
            lineHeight: 1.5,
            pointerEvents: 'none',
            whiteSpace: 'pre-wrap',
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
