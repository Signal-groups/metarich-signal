import "./globals.css"
import ClientLayout from "./components/ClientLayout"

export const metadata = {
  title: "보험 설계사 서포트 프로그램",
  description: "보험 설계사 서포트 프로그램",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
