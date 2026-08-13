"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * Injects Zeneva-branded overrides on top of the stock Driver.js CSS.
 * Driver.js uses plain CSS variables so we can remap them without touching
 * the library source. The overrides live under a high-specificity selector
 * that is present while the tour is active.
 */
const TOUR_STYLE = `
  /* ── Zeneva brand palette ─────────────────────────────────────── */
  :root {
    --driver-popover-bg: #1a1a1f;
    --driver-popover-text: #f5f5f5;
    --driver-popover-muted: rgba(255,255,255,0.55);
    --driver-brand: hsl(22, 90%, 55%);
    --driver-brand-dark: hsl(22, 90%, 45%);
    --driver-radius: 14px;
  }

  /* ── Overlay ──────────────────────────────────────────────────── */
  .driver-overlay {
    background: rgba(0, 0, 0, 0.65) !important;
    backdrop-filter: blur(2px) !important;
  }

  /* ── Popover shell ────────────────────────────────────────────── */
  .driver-popover {
    background: var(--driver-popover-bg) !important;
    color: var(--driver-popover-text) !important;
    border-radius: var(--driver-radius) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.04),
      0 24px 48px rgba(0,0,0,0.55),
      0 4px 16px rgba(0,0,0,0.35) !important;
    min-width: 280px !important;
    max-width: 340px !important;
    padding: 20px 22px 18px !important;
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  }

  /* ── Header: logo + title row ─────────────────────────────────── */
  .driver-popover-title {
    font-size: 15px !important;
    font-weight: 700 !important;
    color: #ffffff !important;
    letter-spacing: -0.01em !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    margin-bottom: 6px !important;
    line-height: 1.3 !important;
  }

  /* Orange accent line above title */
  .driver-popover-title::before {
    content: '' !important;
    display: inline-block !important;
    width: 4px !important;
    height: 16px !important;
    background: var(--driver-brand) !important;
    border-radius: 2px !important;
    flex-shrink: 0 !important;
  }

  /* ── Description ──────────────────────────────────────────────── */
  .driver-popover-description {
    font-size: 13px !important;
    line-height: 1.55 !important;
    color: var(--driver-popover-muted) !important;
    margin-top: 4px !important;
    margin-bottom: 16px !important;
  }

  /* ── Progress bar ─────────────────────────────────────────────── */
  .driver-popover-progress-text {
    font-size: 11px !important;
    font-weight: 600 !important;
    color: var(--driver-brand) !important;
    opacity: 1 !important;
    letter-spacing: 0.03em !important;
    text-transform: uppercase !important;
  }

  /* ── Footer ───────────────────────────────────────────────────── */
  .driver-popover-footer {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    border-top: 1px solid rgba(255,255,255,0.07) !important;
    padding-top: 14px !important;
    margin-top: 0 !important;
  }

  /* ── Shared button base ───────────────────────────────────────── */
  .driver-popover-prev-btn,
  .driver-popover-next-btn,
  .driver-popover-close-btn {
    font-family: 'DM Sans', sans-serif !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    border-radius: 8px !important;
    padding: 7px 16px !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
    border: none !important;
    line-height: 1.4 !important;
  }

  /* Next / Done button → Zeneva orange ─────────────────────────── */
  .driver-popover-next-btn {
    background: var(--driver-brand) !important;
    color: #fff !important;
    box-shadow: 0 2px 8px rgba(234, 115, 50, 0.35) !important;
    margin-left: auto !important;
  }
  .driver-popover-next-btn:hover {
    background: var(--driver-brand-dark) !important;
    box-shadow: 0 4px 14px rgba(234, 115, 50, 0.45) !important;
    transform: translateY(-1px) !important;
  }
  .driver-popover-next-btn:active {
    transform: translateY(0) !important;
  }

  /* Back button → ghost ────────────────────────────────────────── */
  .driver-popover-prev-btn {
    background: rgba(255,255,255,0.06) !important;
    color: rgba(255,255,255,0.75) !important;
    border: 1px solid rgba(255,255,255,0.10) !important;
  }
  .driver-popover-prev-btn:hover {
    background: rgba(255,255,255,0.12) !important;
    color: #fff !important;
  }
  .driver-popover-prev-btn:disabled,
  .driver-popover-prev-btn[disabled] {
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /* Close (×) button ───────────────────────────────────────────── */
  .driver-popover-close-btn {
    position: absolute !important;
    top: 14px !important;
    right: 14px !important;
    padding: 4px 7px !important;
    background: transparent !important;
    color: rgba(255,255,255,0.4) !important;
    font-size: 16px !important;
    line-height: 1 !important;
    border-radius: 6px !important;
  }
  .driver-popover-close-btn:hover {
    background: rgba(255,255,255,0.08) !important;
    color: #fff !important;
  }

  /* ── Highlight border on targeted element ─────────────────────── */
  .driver-active-element {
    outline: 2px solid var(--driver-brand) !important;
    outline-offset: 3px !important;
    border-radius: 8px !important;
  }

  /* ── Arrow ────────────────────────────────────────────────────── */
  .driver-popover-arrow {
    border-color: transparent !important;
  }
  .driver-popover-arrow.driver-popover-arrow-side-left { border-right-color: #1a1a1f !important; }
  .driver-popover-arrow.driver-popover-arrow-side-right { border-left-color: #1a1a1f !important; }
  .driver-popover-arrow.driver-popover-arrow-side-top { border-bottom-color: #1a1a1f !important; }
  .driver-popover-arrow.driver-popover-arrow-side-bottom { border-top-color: #1a1a1f !important; }
`;

export function ProductTour() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/dashboard") return;
    const needsTour = localStorage.getItem("zeneva_needs_tour");
    if (needsTour !== "true") return;

    // Inject brand CSS once
    if (!document.getElementById("zeneva-tour-styles")) {
      const style = document.createElement("style");
      style.id = "zeneva-tour-styles";
      style.textContent = TOUR_STYLE;
      document.head.appendChild(style);
    }

    const timer = setTimeout(() => {
      localStorage.removeItem("zeneva_needs_tour");

      const isMobile = window.innerWidth < 768;

      const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: false,
        doneBtnText: "Let's Go →",
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        steps: [
          {
            popover: {
              title: "Welcome to Zeneva",
              description: "Your store is officially set up. Let's take a quick 3-step tour to help you get started.",
              side: "left",
              align: "start",
            },
          },
          {
            element: isMobile ? "#tour-nav-mobile-inventory" : "#tour-nav-inventory",
            popover: {
              title: "1. Manage Inventory",
              description: "Add your products, track stock levels, and organise categories — all in one place.",
              side: isMobile ? "top" : "right",
              align: "start",
            },
          },
          {
            element: isMobile ? "#tour-nav-mobile-pos" : "#tour-nav-pos",
            popover: {
              title: "2. Point of Sale (POS)",
              description: "Ring up customers, apply discounts, and send digital receipts in seconds.",
              side: isMobile ? "top" : "right",
              align: "start",
            },
          },
          {
            element: isMobile ? "#tour-nav-mobile-dashboard" : "#tour-nav-dashboard",
            popover: {
              title: "3. Track Your Analytics",
              description: "Come back here anytime to see daily sales, revenue growth, and store insights.",
              side: isMobile ? "top" : "right",
              align: "start",
            },
          },
        ],
        onDestroyStarted: () => {
          localStorage.removeItem("zeneva_needs_tour");
          driverObj.destroy();
        },
      });

      try {
        driverObj.drive();
      } catch (e) {
        console.error("Product Tour failed to start:", e);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
