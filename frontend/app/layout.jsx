import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Chat App",
  description: "Real-time chat using Socket.IO",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={spaceGrotesk.variable}>
        <AuthProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
