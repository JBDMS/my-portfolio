// components/Header.js
"use client";

import Link from "next/link";
import { useAuth } from "./AuthContext";

export default function Header() {
  const { profile, user, signOut } = useAuth();

  return (
    <header className="fc-header">
      <div className="left">
        <Link href="/" className="logo">FLASHCHAT</Link>
      </div>
      <div className="right">
        {!user ? (
          <Link href="/signin" className="btn">Sign in</Link>
        ) : (
          <>
            <Link href="/profile" className="profile">
              {profile?.appUserId || "Profile"}
            </Link>
            <button className="btn ghost" onClick={() => signOut()} aria-label="Log out">
              Log out
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        .fc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 28px;
          background: transparent;
        }
        .logo {
          font-weight: 700;
          color: #d9b3ff;
          letter-spacing: 1px;
          text-decoration: none;
        }
        .btn {
          background: #0a84ff;
          color: white;
          padding: 10px 18px;
          border-radius: 24px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          font-size: 16px;
        }
        .btn.ghost {
          margin-left: 10px;
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .profile {
          margin-right: 12px;
          color: #fff;
          text-decoration: none;
          font-weight: 600;
          font-size: 15px;
        }
      `}</style>
    </header>
  );
}
