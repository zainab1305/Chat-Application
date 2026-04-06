export const metadata = {
  title: "Chat App",
  description: "Real-time chat using Socket.IO",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}