// src/components/AnalyticsLoader.js
"use client";
import { useEffect } from "react";

export default function AnalyticsLoader() {
  useEffect(() => {
    const { getAnalytics } = require("firebase/analytics");
    const { app } = require("../lib/firebase");
    try {
      getAnalytics(app);
    } catch (err) {
      console.warn("Analytics not available in this environment:", err.message);
    }
  }, []);

  return null;
}
