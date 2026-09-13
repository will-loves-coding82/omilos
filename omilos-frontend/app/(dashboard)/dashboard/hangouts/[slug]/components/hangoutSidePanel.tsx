"use client";

import { useEffect, useState } from "react";

type Tab = "Stops" | "Participants";

const PANEL_WIDTH_DESKTOP = "280px";

export default function HangoutSidePanel() {
  const [activeTab, setActiveTab] = useState<Tab>("Stops");

  // Expose this panel's width as a CSS variable (desktop only, since on
  // mobile it's a full-screen overlay and doesn't need to offset anything)
  // so other overlays (e.g. the map's search box) can position around it.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');

    const updatePanelWidth = () => {
      document.documentElement.style.setProperty(
        '--panel-width',
        mediaQuery.matches ? PANEL_WIDTH_DESKTOP : '0px'
      );
    };

    updatePanelWidth();
    mediaQuery.addEventListener('change', updatePanelWidth);

    return () => {
      mediaQuery.removeEventListener('change', updatePanelWidth);
      document.documentElement.style.setProperty('--panel-width', '0px');
    };
  }, []);

  return (
    <div className="fixed inset-0 z-10 bg-bg-primary md:inset-auto md:top-0 md:h-full md:w-[280px] md:shadow-md md:left-[var(--sidebar-width)] transition-[left] duration-300">
      <div className="flex items-center gap-4 p-4 border-b border-border-primary">
        <TabButton label="Stops" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="Participants" activeTab={activeTab} onClick={setActiveTab} />
      </div>

      <div className="p-4">
        {activeTab === "Stops" && <p className="text-text-secondary">No stops yet.</p>}
        {activeTab === "Participants" && <p className="text-text-secondary">No participants yet.</p>}
      </div>
    </div>
  );
}

function TabButton({
  label,
  activeTab,
  onClick,
}: {
  label: Tab;
  activeTab: Tab;
  onClick: (tab: Tab) => void;
}) {
  const isActive = activeTab === label;
  return (
    <button
      onClick={() => onClick(label)}
      className={`text-sm font-medium hover:cursor-pointer ${
        isActive ? "text-text-primary" : "text-text-secondary"
      }`}
    >
      {label}
    </button>
  );
}
