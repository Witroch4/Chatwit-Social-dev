import React, { useEffect, useState } from "react";

export default function AnimatedMessage({
  children,
  isAssistant,
}: {
  children: React.ReactNode;
  isAssistant: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`transition-all duration-500 ease-in-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${isAssistant ? "animate-pulse-subtle" : ""}`}
    >
      {children}
    </div>
  );
}
