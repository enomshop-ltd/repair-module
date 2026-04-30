import { useEffect, useState } from "preact/hooks";

export default function TopProgressBarIsland() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeout: number | null = null;
    let interval: number | null = null;

    const startProgress = () => {
      console.debug("[TopProgressBarIsland] Client navigation started.");
      setVisible(true);
      setProgress(15);
      
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + (90 - prev) * 0.1;
        });
      }, 200);
    };

    const completeProgress = () => {
      console.debug("[TopProgressBarIsland] Client navigation completed.");
      if (interval) clearInterval(interval);
      setProgress(100);
      
      timeout = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setProgress(0), 300); // reset after fade out
      }, 500);
    };

    const errorProgress = () => {
      console.error("[TopProgressBarIsland] Client navigation error.");
      if (interval) clearInterval(interval);
      setProgress(100);
      
      timeout = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setProgress(0), 300);
      }, 500);
    };

    // Adding listener for Fresh client side routing events.
    globalThis.addEventListener("fresh:render", startProgress);
    globalThis.addEventListener("fresh:rendered", completeProgress);
    
    // In some builds, custom events trigger, so we capture these if people implement standard router custom events:
    globalThis.addEventListener("router:start", startProgress);
    globalThis.addEventListener("router:done", completeProgress);
    globalThis.addEventListener("router:error", errorProgress);

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
      globalThis.removeEventListener("fresh:render", startProgress);
      globalThis.removeEventListener("fresh:rendered", completeProgress);
      globalThis.removeEventListener("router:start", startProgress);
      globalThis.removeEventListener("router:done", completeProgress);
      globalThis.removeEventListener("router:error", errorProgress);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: `${progress}%`,
        height: "3px",
        backgroundColor: "#2563EB", // Tailwind blue-600
        zIndex: 9999,
        transition: "width 0.2s ease-out",
        opacity: visible ? 1 : 0,
      }}
    />
  );
}
