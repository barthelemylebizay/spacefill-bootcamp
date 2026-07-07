import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "Spacefill",
  description: "Spacefill — outils internes",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
