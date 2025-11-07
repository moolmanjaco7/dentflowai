// pages/index.js
export default function Home() {
  return (
    <main className="home">
      <header className="hero">
        <div className="container">
          <div className="brand">DentFlow <span className="ai">AI</span></div>
          <nav className="nav">
            <a href="/pricing">Pricing</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a className="btn" href="/auth/login">Dashboard Login</a>
          </nav>
        </div>

        <div className="hero-inner container">
          <h1>Smart Scheduling for Modern Clinics</h1>
          <p>Capture leads, manage patients, and reduce no-shows with one simple dashboard.</p>
          <div className="cta">
            <a className="btn primary" href="/auth/login">Start 7-Day Free Trial</a>
            <a className="btn ghost" href="#features">See features</a>
          </div>
        </div>
      </header>

      <section id="features" className="features container">
        <div className="card">
          <h3>Lead Capture</h3>
          <p>Website form posts straight to your dashboard. No more lost enquiries.</p>
        </div>
        <div className="card">
          <h3>Appointments</h3>
          <p>Today’s view, status chips, and one-click confirm / complete / cancel.</p>
        </div>
        <div className="card">
          <h3>Reminders</h3>
          <p>Email/WhatsApp reminders (enable SMTP) to reduce no-shows.</p>
        </div>
        <div className="card">
          <h3>Patients</h3>
          <p>Lightweight CRM for contacts, notes, and quick look-ups.</p>
        </div>
      </section>

      <section className="pricing container">
        <div className="price-box">
          <h2>R499 <span>/ month</span></h2>
          <ul>
            <li>Lead form → dashboard</li>
            <li>Patients & appointments</li>
            <li>Status chips & reminders</li>
            <li>Admin access for your team</li>
          </ul>
          <a className="btn primary" href="/auth/login">Start Free Trial</a>
          <p className="note">No credit card needed. Cancel anytime.</p>
        </div>
      </section>

      <footer className="site-footer">
        Powered by DentFlow AI • <a href="/pricing">Pricing</a> • <a href="/privacy">Privacy</a> • <a href="/terms">Terms</a>
      </footer>
    </main>
  )
}
