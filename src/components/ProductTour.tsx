"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function ProductTour() {
  const [hasSeenTour, setHasSeenTour] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Only show tour on the dashboard
    if (pathname !== "/dashboard") return;

    // Only run if the user just finished onboarding
    const needsTour = localStorage.getItem("zeneva_needs_tour");
    if (needsTour !== "true") return;

    // Small delay to let the UI finish rendering
    const timer = setTimeout(() => {
      // Remove it right before starting so it never runs again
      localStorage.removeItem("zeneva_needs_tour");
      
      const isMobile = window.innerWidth < 768;
      
      const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: false,
        doneBtnText: "Let's Go!",
        nextBtnText: "Next",
        prevBtnText: "Back",
        steps: [
          {
            popover: {
              title: "Welcome to Zeneva! 🎉",
              description: "Your store is officially set up. Let's take a quick 3-step tour to help you get started.",
              side: "left",
              align: "start"
            }
          },
          {
            element: isMobile ? undefined : "#tour-nav-inventory",
            popover: {
              title: "1. Manage Inventory",
              description: "This is where you'll add your products, track stock levels, and organize categories.",
              side: "right",
              align: "start"
            }
          },
          {
            element: isMobile ? undefined : "#tour-nav-pos",
            popover: {
              title: "2. Point of Sale (POS)",
              description: "Ready to sell? Use the POS to quickly ring up customers and print digital receipts.",
              side: "right",
              align: "start"
            }
          },
          {
            element: isMobile ? undefined : "#tour-nav-dashboard",
            popover: {
              title: "3. Track Analytics",
              description: "Head back here anytime to see your daily sales, revenue growth, and store insights.",
              side: "right",
              align: "start"
            }
          }
        ],
        onDestroyStarted: () => {
          localStorage.removeItem("zeneva_needs_tour");
          setHasSeenTour(true);
          driverObj.destroy();
        },
      });

      driverObj.drive();
    }, 1500);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
