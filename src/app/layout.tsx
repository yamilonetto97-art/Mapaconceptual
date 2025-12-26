import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generador de Mapas Conceptuales | Herramienta para Docentes",
  description:
    "Herramienta educativa con IA para generar mapas conceptuales automáticamente. Ingresa el tema y el grado, y obtén un mapa conceptual visual en segundos.",
  keywords:
    "mapa conceptual, docentes, educación, herramienta educativa, IA, generador",
  authors: [{ name: "Equipo Educativo" }],
  openGraph: {
    title: "Generador de Mapas Conceptuales para Docentes",
    description:
      "Crea mapas conceptuales automáticamente con inteligencia artificial",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* Google Fonts - Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
