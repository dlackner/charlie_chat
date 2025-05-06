"use client";

import { useEffect, useState } from "react";
import Joyride from "react-joyride";

export default function FeatureTour() {
  const [run, setRun] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    console.log("🚀 FeatureTour mounted");

    const seen = localStorage.getItem("seenCharlieTour");

    // Wait for DOM + chat input to be ready
    const timeout = setTimeout(() => {
      const input = document.querySelector("#chat-input");
      const sidebar = document.querySelector("#sidebar-search");

      console.log("🎯 Elements ready?", !!input, !!sidebar);

      if (input && sidebar && !seen) {
        setShow(true);
        setTimeout(() => {
          console.log("✅ Starting Joyride");
          setRun(true);
          localStorage.setItem("seenCharlieTour", "true");
        }, 300); // Extra delay after both elements confirmed
      }
    }, 500); // Delay for hydration & scroll

    return () => clearTimeout(timeout);
  }, []);

  if (!show) return null;

  return (
    <Joyride
      run={run}
      steps={[
        {
          target: "#chat-input",
          placement: "top",
          content: (
            <div>
              <h3 className="font-semibold text-base mb-1">Ask Your Question</h3>
              <p className="text-sm text-gray-600">
                Whether it’s about deals, underwriting, or decoding a broker’s “great opportunity,” just ask—I’m here to give it to you straight.
              </p>
            </div>
          ),
        },
        {
          target: "#sidebar-search",
          placement: "right",
          content: (
            <div>
              <h3 className="font-semibold text-base mb-1">Find Properties</h3>
              <p className="text-sm text-gray-600">
                Use this search to find rental properties by zip code and property type. It’s a great place to start comparing deals.
              </p>
            </div>
          ),
        },
      ]}
      showSkipButton
      continuous
      scrollToFirstStep
      disableOverlayClose
      spotlightClicks
      locale={{
        back: "Back",
        close: "Close",
        last: "Done",
        next: "Next",
        skip: "Skip",
      }}
      styles={{
        options: {
          arrowColor: "#3B82F6",
          backgroundColor: "#fff",
          overlayColor: "rgba(0, 0, 0, 0.4)",
          primaryColor: "#3B82F6",
          textColor: "#1E3A8A",
          zIndex: 99999,
        },
        buttonClose: { color: "#3B82F6" },
        buttonNext: { backgroundColor: "#3B82F6", color: "#fff" },
        buttonBack: { color: "#3B82F6" },
      }}
    />
  );
}
