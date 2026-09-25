import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API = "http://localhost:5000";

function App() {
  const [token, setToken] = useState(localStorage.getItem("jwt"));
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: ""
  });
  const [summary, setSummary] = useState(null);
  const [messages, setMessages] = useState([]);
  const [apiKey, setApiKey] = useState("");
  const [sms, setSms] = useState({ to: "", message: "" });
  const [result, setResult] = useState("");

  async function request(path, options = {}) {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function login(e) {
    e.preventDefault();
    try {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password
        })
      });
      localStorage.setItem("jwt", data.token);
      setToken(data.token);
    } catch (e) {
      setResult(e.message);
    }
  }

  async function register(e) {
    e.preventDefault();
    try {
      await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMode("login");
      setResult("Registered. Now login.");
    } catch (e) {
      setResult(e.message);
    }
  }

  async function loadDashboard() {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [s, m] = await Promise.all([
        request("/api/dashboard/summary", { headers }),
        request("/api/dashboard/messages", { headers })
      ]);
      setSummary(s);
      setMessages(m.data);
    } catch (e) {
      setResult(e.message);
    }
  }

  async function createKey() {
    try {
      const data = await request("/api/keys", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "Main API Key" })
      });
      setApiKey(data.api_key);
    } catch (e) {
      setResult(e.message);
    }
  }

  async function sendSms(e) {
    e.preventDefault();

    if (!apiKey) {
      setResult("Create an API key first.");
      return;
    }

    try {
      const data = await request("/v1/sms/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(sms)
      });
      setResult(JSON.stringify(data, null, 2));
      await loadDashboard();
    } catch (e) {
      setResult(e.message);
    }
  }

  useEffect(() => {
    if (token) loadDashboard();
  }, [token]);

  if (!token) {
    return (
      <main className="auth">
        <div className="card">
          <h1>SMS SaaS MVP</h1>
          <p>Developer SMS API platform</p>

          <form onSubmit={mode === "login" ? login : register}>
            {mode === "register" && (
              <>
                <input
                  placeholder="Your name"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                />
                <input
                  placeholder="Company name"
                  value={form.companyName}
                  onChange={e => setForm({...form, companyName: e.target.value})}
                />
              </>
            )}

            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
            />

            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
            />

            <button>{mode === "login" ? "Login" : "Create account"}</button>
          </form>

          <button className="secondary" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Create account" : "Already have an account?"}
          </button>

          <pre>{result}</pre>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header>
        <div>
          <h1>SMS SaaS</h1>
          <span>MVP Dashboard</span>
        </div>
        <button onClick={() => {
          localStorage.removeItem("jwt");
          setToken(null);
        }}>Logout</button>
      </header>

      <section className="cards">
        <div className="stat">
          <span>SMS Credits</span>
          <strong>{summary?.credits ?? "-"}</strong>
        </div>
        <div className="stat">
          <span>Total SMS</span>
          <strong>{summary?.sms?.total ?? "-"}</strong>
        </div>
        <div className="stat">
          <span>Delivered</span>
          <strong>{summary?.sms?.delivered ?? "-"}</strong>
        </div>
        <div className="stat">
          <span>Plan</span>
          <strong>{summary?.subscription?.name ?? "Starter"}</strong>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>API Key</h2>
          <button onClick={createKey}>Create API Key</button>
          {apiKey && <pre>{apiKey}</pre>}
          <small>Store this key securely. It is shown only once.</small>
        </div>

        <div className="card">
          <h2>Send SMS</h2>
          <form onSubmit={sendSms}>
            <input
              placeholder="919876543210"
              value={sms.to}
              onChange={e => setSms({...sms, to: e.target.value})}
            />
            <textarea
              placeholder="Your message"
              value={sms.message}
              onChange={e => setSms({...sms, message: e.target.value})}
            />
            <button>Send SMS</button>
          </form>
          <pre>{result}</pre>
        </div>
      </section>

      <section className="card">
        <h2>Recent SMS</h2>
        <table>
          <thead>
            <tr>
              <th>To</th>
              <th>Message</th>
              <th>Status</th>
              <th>Credits</th>
            </tr>
          </thead>
          <tbody>
            {messages.map(m => (
              <tr key={m.id}>
                <td>{m.to_number}</td>
                <td>{m.message}</td>
                <td>{m.status}</td>
                <td>{m.cost_credits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
