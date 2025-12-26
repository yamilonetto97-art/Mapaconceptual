'use client';

import Link from 'next/link';

/**
 * Página 404 - No encontrado
 * 
 * Se muestra cuando el usuario accede a una ruta que no existe
 */
export default function NotFound() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
            background: 'var(--color-bg-primary)',
        }}>
            <div style={{
                fontSize: '6rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '1rem',
            }}>
                404
            </div>

            <h1 style={{
                fontSize: '2rem',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                marginBottom: '0.5rem',
            }}>
                Página no encontrada
            </h1>

            <p style={{
                fontSize: '1rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '2rem',
                maxWidth: '500px',
            }}>
                Lo sentimos, la página que buscas no existe o ha sido movida.
            </p>

            <Link
                href="/"
                className="not-found-link"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'var(--color-primary)',
                    color: 'white',
                    borderRadius: 'var(--radius-lg)',
                    textDecoration: 'none',
                    fontWeight: '500',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
            >
                Volver al inicio
            </Link>

            <style jsx>{`
        .not-found-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
        }
      `}</style>
        </div>
    );
}
