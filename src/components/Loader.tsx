interface LoaderProps {
  text?: string
}

export function Loader({ text = 'Loading...' }: LoaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        gap: '1rem',
        color: '#c2410c',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          width: '2.5rem',
          height: '2.5rem',
          border: '4px solid #fbfaf7',
          borderTop: '4px solid #c2410c',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: '0.95rem', color: '#78716c' }}>{text}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
