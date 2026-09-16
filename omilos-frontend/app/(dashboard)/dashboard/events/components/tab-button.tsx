
export default function TabButton({
  label,
  activeTab,
  onClick,
}: {
  label: string;
  activeTab: string;
  onClick: (tab: string) => void;
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
