import "./globals.css";
import { Montserrat } from "next/font/google";
import { ModalProvider } from "@/components/ModalProvider";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata = {
  title: "Kemer.ai | Démo",
  description: "Démonstration de Kemer : l'assistant intelligent des praticiens.",
  icons: { icon: "logo-kemer.svg" },
};

export const viewport = { width: "device-width", initialScale: 1 };

// Même enveloppe que l'app : la barre de navigation est fixe, le contenu est décalé dessous.
export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${montserrat.variable} antialiased`} suppressHydrationWarning>
      <body className="font-sans bg-white dark:bg-[#0b1121] text-[#001F3F] dark:text-white transition-colors duration-300 min-h-screen flex flex-col selection:bg-[#4931F7] selection:text-white">
        <ModalProvider>
          <div className="flex-1 flex flex-col pt-16 md:pt-20">
            <div className="flex-1">{children}</div>
          </div>
        </ModalProvider>
      </body>
    </html>
  );
}
