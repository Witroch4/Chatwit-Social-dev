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
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`
        ${visible ? "opacity-100" : "opacity-0"} 
        ${isAssistant 
          ? "assistant-message-enter" 
          : "transition-all duration-300 ease-out " + 
            (visible ? "translate-y-0" : "translate-y-4")
        }
      `}
    >
      {children}
    </div>
  );
}
