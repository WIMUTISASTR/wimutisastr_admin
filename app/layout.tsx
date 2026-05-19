import type { Metadata } from "next";
import { Suspense } from "react";
import { Kantumruy_Pro } from "next/font/google";
import "./globals.css";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthListener from './components/auth/AuthListener';
import { NavigationProgress } from './components/feedback';

const kantumruy = Kantumruy_Pro({
  subsets: ["latin", "khmer"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-kantumruy",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WIMUTISASSTR Law Office — Admin",
  description: "Admin panel for WIMUTISASSTR Law Office",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km" className={kantumruy.variable}>
      <body className="antialiased">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <AuthListener />
        {children}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </body>
    </html>
  );
}
