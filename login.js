"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAuth } from "../components/AuthContext";
import { firestore } from "../lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";



export default function SignInPage() {
  const router = useRouter();
  const { user, signIn } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.push("/chat");
  }, [user, router]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.id]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { email, password } = form;

    if (!email || !password) return setError("Please fill in all fields.");
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");

    try {
      setLoading(true);
      await signIn(email, password);
      alert(`Welcome back to FlashChat, ${email.split("@")[0]}!`);
      router.push("/chat");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/invalid-credential")
        setError("Incorrect email or password.");
      else setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login | FlashChat</title>
      </Head>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: "Poppins", sans-serif;
        }

        .container {
          height: 100vh;
          background: url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e")
            no-repeat center/cover;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }

        .container::before {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(1px);
        }

        form {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 40px 50px;
          width: 100%;
          max-width: 380px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
          text-align: center;
          position: relative;
          z-index: 1;
          animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        h2 {
          margin-bottom: 30px;
          color: #2b6777;
          font-size: 28px;
          background: linear-gradient(135deg, #2b6777, #1b4f5f);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .form-group {
          margin-bottom: 20px;
        }

        input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          font-size: 16px;
          outline: none;
          background: rgba(255, 255, 255, 0.8);
        }

        input:focus {
          border-color: #2b6777;
          box-shadow: 0 0 0 4px rgba(43, 103, 119, 0.1);
        }

        .error {
          color: #e74c3c;
          font-size: 13px;
          margin-top: 8px;
          text-align: center;
        }

        button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #2b6777, #1b4f5f);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          cursor: pointer;
          margin-top: 10px;
          transition: transform 0.2s, box-shadow 0.3s;
        }

        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(43, 103, 119, 0.4);
        }

        a {
          display: block;
          margin-top: 15px;
          color: #2b6777;
          text-decoration: none;
          font-weight: 500;
        }

        a:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="container">
        <form onSubmit={handleSubmit}>
          <h2>FlashChat Login</h2>

          <div className="form-group">
            <input
              type="email"
              id="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              id="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <a href="#">Forgot Password?</a>
          <a href="signin">Create an Account</a>
        </form>
      </div>
    </>
  );
}
