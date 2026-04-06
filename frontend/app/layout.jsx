import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";

export const metadata = {
  title: "Chat App",
  description: "Real-time chat using Socket.IO",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}