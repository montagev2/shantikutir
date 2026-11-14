
interface LoaderProps {
  text?: string
}

export function Loader({ text = 'Preparing Culinary Experience...' }: LoaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '45vh',
        gap: '1.25rem',
        color: 'var(--gold)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          width: '3.2rem',
          height: '3.2rem',
          border: '3px solid rgba(223, 177, 91, 0.15)',
          borderTop: '3px solid var(--gold)',
          borderRadius: '50%',
          animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          boxShadow: '0 0 20px rgba(223, 177, 91, 0.25)',
        }}
      />
      <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
        {text}
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
