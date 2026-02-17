import { Outfit } from 'next/font/google';
import "./globals.css";
import { SidebarProvider } from '../context/SidebarProvider'
import { ThemeProvider } from '../context/ThemeProvider'
import { AuthProvider } from '../context/AuthProvider'

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '700'] });

export const metadata = {
  title: "B-Pris",
  description: "Sistem Integrasi Humas Polresta Banyuwangi (B-PRIS)",
};

export default function RootLayout({ children }) {
  return (
    <AuthProvider>
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
    </AuthProvider>
  );
}
