import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-principal",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-secundaria",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Dulce Paladar — Repostería Artesanal",
    template: "%s | Dulce Paladar",
  },
  description:
    "Tortas, postres y productos de repostería artesanal hechos con amor. Pedidos por WhatsApp.",
  keywords: ["repostería", "tortas", "postres", "dulce paladar", "Colombia"],
  openGraph: {
    title: "Dulce Paladar — Repostería Artesanal",
    description:
      "Tortas, postres y productos de repostería artesanal hechos con amor.",
    type: "website",
    locale: "es_CO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
