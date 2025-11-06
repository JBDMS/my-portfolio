"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, firestore } from "../lib/firebase";
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

const AuthContext = createContext();

// Helper: generate unique app user ID
function generateUserId(length = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `u_${id}`;
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Update lastActive every minute
  useEffect(() => {
    let intervalId;

    const updateLastActive = async (uidToUpdate) => {
      if (!uidToUpdate) return;
      try {
        const userRef = doc(firestore, "users", uidToUpdate);
        await updateDoc(userRef, { lastActive: serverTimestamp() });
      } catch (err) {
        console.warn("Failed to update lastActive:", err.message);
      }
    };

    if (user?.uid) {
      updateLastActive(user.uid);
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") updateLastActive(user.uid);
      }, 60000);
    }

    return () => clearInterval(intervalId);
  }, [user]);

  // Monitor auth state safely
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        // No user: sign in anonymously
        try {
          await signInAnonymously(auth);
        } catch (anonErr) {
          console.error("Anonymous sign-in failed:", anonErr.message);
        } finally {
          setLoading(false);
        }
        return;
      }

      setUser(fbUser);

      // Only create Firestore profile if not anonymous
      if (!fbUser.isAnonymous) {
        try {
          const userRef = doc(firestore, "users", fbUser.uid);
          const snap = await getDoc(userRef);

          if (!snap.exists()) {
            const appUserId = generateUserId();
            const data = {
              uid: fbUser.uid,
              email: fbUser.email || "",
              appUserId,
              displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
              createdAt: serverTimestamp(),
              lastActive: serverTimestamp(),
            };
            await setDoc(userRef, data);
            setProfile({ ...data, createdAt: new Date() });
          } else {
            setProfile({ ...snap.data() });
          }
        } catch (err) {
          console.warn("Profile creation failed:", err.message);
        }
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Safe signIn & reset password
  const signIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (err) {
      console.error("Sign-In failed:", err.message);
      throw err;
    }
  };

  const signOut = async () => fbSignOut(auth);
  const resetPassword = async (email) => sendPasswordResetEmail(auth, email);

  // Sign-up is **only possible if Email/Password is enabled** in Firebase Console
  const signUp = async (email, password) => {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      return userCredential.user;
    } catch (err) {
      console.error(
        "Sign-Up failed. Enable Email/Password sign-in in Firebase Console:",
        err.message
      );
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        uid: user?.uid || null,
        appUserId: profile?.appUserId || null,
        signUp,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
