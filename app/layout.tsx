import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthListener from './components/auth/AuthListener';
import { NavigationProgress } from './components/feedback';

export const metadata: Metadata = {
  title: "WIMUTISASSTR Law Office - Admin Panel",
  description: "Admin panel for WIMUTISASSTR Law Office",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <AuthListener />
        {children}
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
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
