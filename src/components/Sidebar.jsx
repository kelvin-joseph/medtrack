import { Activity } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { useRole } from "../context/RoleContext.jsx";
import { useData } from "../context/AppDataContext.jsx";
import { NAV_ITEMS } from "./navConfig.js";

export default function Sidebar() {
  const { screen, navigate } = useApp();
  const { canSeeNav } = useRole();
  const { equipment } = useData();
  const visible = NAV_ITEMS.filter((item) => canSeeNav(item.key));

  return (
    <aside className="hidden md:flex w-60 shrink-0 bg-navy flex-col justify-between py-5 px-3 sticky top-0 h-screen">
      <div className="min-h-0 flex flex-col">
        <div className="flex items-center gap-2 px-2 mb-6">
          <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center shrink-0">
            <Activity size={17} color="#FFFFFF" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-none font-display">MedTrack</div>
            <div className="text-[9.5px] text-faint font-mono tracking-wide leading-tight mt-0.5">
              PREDICTIVE FAILURE MGMT
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 overflow-y-auto">
          {visible.map(({ key, screen: s, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => navigate(s)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors border-l-2 text-left ${
                screen === s
                  ? "text-white bg-navy-light border-l-[#6FB1FF]"
                  : "text-[#9FBBDA] border-l-transparent hover:text-white"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div className="px-3 py-3 rounded-lg bg-navy-dark border border-navy-border shrink-0">
        <div className="flex items-center gap-2 text-[#5EDBA3] text-xs font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-[#5EDBA3]" />
          SYSTEM NOMINAL
        </div>
        <div className="text-[10px] text-faint mt-1">{equipment.length} assets tracked</div>
      </div>
    </aside>
  );
}
