"use client";

import { useEffect, useState } from "react";
import { SearchBoxResponse } from "./hangoutDetailsClient";

type Tab = "Stops" | "Participants";

const PANEL_WIDTH_DESKTOP = "280px";

export default function HangoutSidePanel({eventStops} : {eventStops: SearchBoxResponse[]}) {
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
      <section className="flex items-center gap-4 p-4 border-b border-border-primary">
        <TabButton label="Stops" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="Participants" activeTab={activeTab} onClick={setActiveTab} />
      </section>

      <section className="p-4">
        {
          activeTab === "Stops" && 
          <ul className="text-text-secondary">
            {eventStops.map(s => (
              <div className='min-h-24 max-h-32 bg-bg-secondary p-3 flex flex-col gap-1 rounded-lg'>
                <h3 className='text-lg font-semibold text-text-primary'>{s.name}</h3>
                <p className='text-md text-text-secondary'>{s.address}</p>
              </div>              
            ))}
          </ul>
        }
        {activeTab === "Participants" && <p className="text-text-secondary">No participants yet.</p>}
      </section>
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
