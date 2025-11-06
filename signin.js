// pages/signup.js
"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAuth } from "../components/AuthContext";

export default function SignUpPage() {
  const router = useRouter();
  const { user, signUp } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 If user already logged in, go directly to chat
  useEffect(() => {
    if (user) router.push("/chat");
  }, [user, router]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.id]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { name, email, password, confirm } = form;
    if (!name || !email || !password || !confirm)
      return setError("Please fill in all fields.");
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (password !== confirm)
      return setError("Passwords do not match.");

    try {
      setLoading(true);
      await signUp(email, password);
      alert(`Welcome to FlashChat, ${name.split(" ")[0]}!`);
      router.push("/chat");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use")
        setError("That email is already registered. Please log in instead.");
      else if (err.code === "auth/invalid-email")
        setError("Please enter a valid email address.");
      else if (err.code === "auth/weak-password")
        setError("Password must be at least 6 characters.");
      else setError("Sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up | FlashChat</title>
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
          max-width: 400px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
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
          text-align: center;
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
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(43, 103, 119, 0.4);
        }
        a {
          display: block;
          margin-top: 15px;
          text-align: center;
          color: #2b6777;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="container">
        <form onSubmit={handleSubmit}>
          <h2>Create Account</h2>

          <div className="form-group">
            <input
              type="text"
              id="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
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
          <div className="form-group">
            <input
              type="password"
              id="confirm"
              placeholder="Confirm Password"
              value={form.confirm}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account ..." : "Sign Up"}
          </button>

          <a href="login">Already have an account? Login</a>
        </form>
      </div>
    </>
  );
}
