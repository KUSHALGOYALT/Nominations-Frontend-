import "./globals.css";

export const metadata = {
  title: "Hexa Climate — Best Performer Recognition",
  description: "Fortnightly goal review recognition voting system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
      <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen bg-[#050d1a]">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
