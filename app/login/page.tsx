"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email o contrasenya incorrectes.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #111827 0%, #1e3a5f 100%)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: "36px 32px",
        boxShadow: "0 25px 80px rgba(0,0,0,0.35)", width: "100%", maxWidth: 380,
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🏥</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>GuàrdiesApp</h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Cirurgia · HCV · 2026</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nom.cognom@hcv.cat"
              required
              autoFocus
              style={{
                width: "100%", padding: "9px 12px", border: "1.5px solid #d1d5db",
                borderRadius: 7, fontSize: 13, fontFamily: "inherit", outline: "none",
                transition: "border-color 0.15s", boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4 }}>
              Contrasenya
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%", padding: "9px 12px", border: "1.5px solid #d1d5db",
                borderRadius: 7, fontSize: 13, fontFamily: "inherit", outline: "none",
                transition: "border-color 0.15s", boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "#fef2f2", color: "#991b1b", padding: "8px 12px",
              borderRadius: 6, fontSize: 12, marginBottom: 14, border: "1px solid #fecaca",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "10px", borderRadius: 7, border: "none",
              background: loading ? "#9ca3af" : "#111827", color: "#fff",
              fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit", transition: "background 0.15s",
            }}
          >
            {loading ? "Entrant..." : "Entrar"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 20 }}>
          Contrasenya per defecte: <strong>HCV2026</strong><br />
          Canvia-la des del perfil un cop hagis entrat.
        </p>
      </div>
    </div>
  );
}
