import { useState } from "react"

function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("")
  }

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError("Please fill in all fields."); return }
    if (isSignup && !form.name) { setError("Please enter your name."); return }
    setLoading(true)
    try {
      const endpoint = isSignup ? "http://127.0.0.1:8000/register" : "http://127.0.0.1:8000/login"
      const body = isSignup
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      if (onLogin) onLogin(data)
    } catch (e) {
      setError("Could not connect to server. Is it running?")
    }
    setLoading(false)
  }

  return (
    <div style={{
      backgroundColor: "#0e0e10",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Segoe UI', sans-serif",
      color: "#fff",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Background decorative circles */}
      <div style={{
        position: "absolute", width: "600px", height: "600px",
        borderRadius: "50%", border: "1px solid rgba(227,27,35,0.08)",
        top: "-200px", right: "-100px", pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", width: "400px", height: "400px",
        borderRadius: "50%", border: "1px solid rgba(227,27,35,0.06)",
        bottom: "-100px", left: "-100px", pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", width: "200px", height: "200px",
        borderRadius: "50%", background: "radial-gradient(circle, rgba(227,27,35,0.07) 0%, transparent 70%)",
        top: "30%", left: "10%", pointerEvents: "none"
      }} />

      {/* Navbar */}
      <nav style={{
        padding: "20px 40px",
        borderBottom: "1px solid #1a1a1a",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(14,14,16,0.95)",
        zIndex: 10,
      }}>
        <h1 style={{ fontSize: "24px", fontWeight: "900", margin: 0, letterSpacing: "1px" }}>
          BHARAT<span style={{ color: "#e31b23" }}>WHEELS</span>
        </h1>
        <div style={{ color: "#e31b23", fontSize: "12px", fontWeight: "bold", letterSpacing: "2px" }}>
          ● LIVE SHOWROOM
        </div>
      </nav>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        zIndex: 1,
      }}>
        <div style={{ display: "flex", width: "100%", maxWidth: "1000px", gap: "0", alignItems: "stretch" }}>

          {/* Left side — branding */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 50px",
            background: "#111113",
            borderRadius: "20px 0 0 20px",
            border: "1px solid #1e1e1e",
            borderRight: "none",
          }}>
            <div style={{
              width: "48px", height: "4px",
              background: "#e31b23", marginBottom: "32px",
              borderRadius: "2px"
            }} />
            <h2 style={{
              fontSize: "42px", fontWeight: "900", margin: "0 0 16px 0",
              lineHeight: "1.1", letterSpacing: "-1px"
            }}>
              YOUR NEXT<br />
              <span style={{ color: "#e31b23" }}>DRIVE</span><br />
              AWAITS.
            </h2>
            <p style={{ color: "#555", fontSize: "15px", lineHeight: "1.7", margin: "0 0 40px 0" }}>
              Join thousands of bidders competing for India's finest automobiles. Real-time auctions, verified listings.
            </p>

            {/* Stats row */}
            <div style={{ display: "flex", gap: "30px" }}>
              {[
                { value: "50+", label: "Live Listings" },
                { value: "24/7", label: "Live Bidding" },
                { value: "100%", label: "Verified Cars" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#e31b23" }}>{stat.value}</div>
                  <div style={{ fontSize: "11px", color: "#444", letterSpacing: "1px", marginTop: "2px" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side — form */}
          <div style={{
            width: "380px",
            flexShrink: 0,
            background: "#131315",
            borderRadius: "0 20px 20px 0",
            border: "1px solid #1e1e1e",
            borderLeft: "1px solid #e31b23",
            padding: "50px 40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}>

            {/* Toggle */}
            <div style={{
              display: "flex",
              background: "#0e0e10",
              borderRadius: "10px",
              padding: "4px",
              marginBottom: "36px",
              border: "1px solid #222",
            }}>
              {["Login", "Sign Up"].map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => { setIsSignup(i === 1); setError("") }}
                  style={{
                    flex: 1, padding: "10px",
                    border: "none", borderRadius: "8px", cursor: "pointer",
                    fontWeight: "700", fontSize: "13px", letterSpacing: "1px",
                    transition: "all 0.2s",
                    background: isSignup === (i === 1) ? "#e31b23" : "transparent",
                    color: isSignup === (i === 1) ? "#fff" : "#444",
                  }}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            <h3 style={{ margin: "0 0 28px 0", fontSize: "20px", fontWeight: "800", letterSpacing: "0.5px" }}>
              {isSignup ? "Create Account" : "Welcome Back"}
            </h3>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {isSignup && (
                <div>
                  <label style={{ fontSize: "11px", color: "#555", letterSpacing: "1.5px", display: "block", marginBottom: "8px" }}>
                    FULL NAME
                  </label>
                  <input
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Arjun Sharma"
                    style={{
                      width: "100%", padding: "14px 16px",
                      background: "#0e0e10", border: "1px solid #252525",
                      borderRadius: "10px", color: "#fff", fontSize: "15px",
                      outline: "none", boxSizing: "border-box",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => e.target.style.borderColor = "#e31b23"}
                    onBlur={e => e.target.style.borderColor = "#252525"}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: "11px", color: "#555", letterSpacing: "1.5px", display: "block", marginBottom: "8px" }}>
                  EMAIL
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  style={{
                    width: "100%", padding: "14px 16px",
                    background: "#0e0e10", border: "1px solid #252525",
                    borderRadius: "10px", color: "#fff", fontSize: "15px",
                    outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#e31b23"}
                  onBlur={e => e.target.style.borderColor = "#252525"}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#555", letterSpacing: "1.5px", display: "block", marginBottom: "8px" }}>
                  PASSWORD
                </label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{
                    width: "100%", padding: "14px 16px",
                    background: "#0e0e10", border: "1px solid #252525",
                    borderRadius: "10px", color: "#fff", fontSize: "15px",
                    outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#e31b23"}
                  onBlur={e => e.target.style.borderColor = "#252525"}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginTop: "14px", padding: "10px 14px",
                background: "rgba(227,27,35,0.1)", border: "1px solid rgba(227,27,35,0.3)",
                borderRadius: "8px", color: "#e31b23", fontSize: "13px",
              }}>
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                marginTop: "28px", width: "100%", padding: "16px",
                background: loading ? "#6b0e12" : "#e31b23",
                border: "none", borderRadius: "10px",
                color: "#fff", fontWeight: "800", fontSize: "14px",
                letterSpacing: "2px", cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s, transform 0.1s",
              }}
              onMouseOver={e => { if (!loading) e.target.style.background = "#c41520" }}
              onMouseOut={e => { if (!loading) e.target.style.background = "#e31b23" }}
              onMouseDown={e => { if (!loading) e.target.style.transform = "scale(0.98)" }}
              onMouseUp={e => { e.target.style.transform = "scale(1)" }}
            >
              {loading ? "PLEASE WAIT..." : isSignup ? "CREATE ACCOUNT" : "ENTER SHOWROOM"}
            </button>

            {!isSignup && (
              <p style={{ textAlign: "center", marginTop: "16px", fontSize: "12px", color: "#333" }}>
                Forgot password?{" "}
                <span style={{ color: "#e31b23", cursor: "pointer" }}>Reset here</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
