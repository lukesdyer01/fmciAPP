export default function VerifiedBadge({ size = 14, title = 'Verified' }: { size?: number; title?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 22 22"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
      role="img" aria-label={title}
    >
      <title>{title}</title>
      <path
        d="M11 0l2.35 1.9 2.98-.6 1.24 2.78 2.78 1.24-.6 2.98L21.65 11l-1.9 2.35.6 2.98-2.78 1.24-1.24 2.78-2.98-.6L11 22l-2.35-1.9-2.98.6-1.24-2.78-2.78-1.24.6-2.98L.35 11l1.9-2.35-.6-2.98 2.78-1.24L5.67 1.3l2.98.6L11 0z"
        fill="#1D9BF0"
      />
      <path d="M6.5 11.2l2.8 2.8 6.2-6.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
