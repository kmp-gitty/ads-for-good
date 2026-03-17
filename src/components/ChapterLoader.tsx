"use client";

import { useEffect } from "react";

const CONSENT_KEY = "afg_consent_v1";

export default function ChapterLoader() {
  useEffect(() => {
    try {
      const consent = localStorage.getItem(CONSENT_KEY);
      
      if (consent === "declined") return;

      const existing = document.querySelector('script[data-chapter-loader="true"]');
      if (existing) return;

      const script = document.createElement("script");
      script.src = "/api/chapter/pixel.js";
      script.async = true;
      script.setAttribute("data-chapter-loader", "true");
      script.setAttribute("data-client-key", "adsforgood_prod");
      script.setAttribute("data-vertical", "AFG_SITE");

      document.body.appendChild(script);
    } catch {
      // fail quietly
    }
  }, []);

  return null;
}