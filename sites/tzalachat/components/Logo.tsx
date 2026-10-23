/** A plate seen from above, with a citrus wedge: the site mark. */
export default function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="#fff" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".35" />
      <path d="M16 16 L16 7.5 A8.5 8.5 0 0 1 23.4 12.2 Z" fill="#e9f26b" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
