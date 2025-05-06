// components/ui/feature-tour.tsx
"use client";

import { useEffect, useState } from "react";
import { useTour } from "@reactour/tour";
import { TourProvider } from "@reactour/tour";

const tourSteps = [
  {
    selector: "#chat-input",
    content: "Type your questions about multifamily investing here."
  },
  {
    selector: "#sidebar-search",
    content: "Use this search panel to pull in RentCast listings."
  },
  {
    selector: "#send-to-chat",
    content: "Send the listings to the chat and have Charlie analyze them"
  },
  {
    selector: "#upload-docs",
    content: "Upload documents and have Charlie create populated LOI's for you"
  }
];

export default function FeatureTourWrapper({ children }: { children?: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <TourProvider steps={tourSteps} showNavigation showBadge disableDotsNavigation>
      <FeatureTour />
      {children}
    </TourProvider>
  );
}

function FeatureTour() {
  const { setIsOpen, isOpen, currentStep, setCurrentStep } = useTour();

  useEffect(() => {
    const seen = localStorage.getItem("charlie_seen_tour");
    if (!seen) {
      setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      localStorage.setItem("charlie_seen_tour", "true");
    }
  }, [setIsOpen]);

  return null;
}
