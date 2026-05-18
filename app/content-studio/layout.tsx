import '../crm/crm.css'

export default function ContentStudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="crm-app">
      <main className="crm-main" style={{ marginLeft: 0 }}>
        <div className="crm-page">
          {children}
        </div>
      </main>
    </div>
  )
}
