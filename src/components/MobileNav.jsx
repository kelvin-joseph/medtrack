import { MoreHorizontal, X } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { useRole } from "../context/RoleContext.jsx";
import { NAV_ITEMS, MOBILE_PRIMARY_KEYS } from "./navConfig.js";

export default function MobileNav() {
  const { screen, navigate, mobileNavOpen, setMobileNavOpen } = useApp();
  const { canSeeNav } = useRole();

  const visible = NAV_ITEMS.filter((item) => canSeeNav(item.key));
  const primary = visible.filter((item) => MOBILE_PRIMARY_KEYS.includes(item.key));
  const overflow = visible.filter((item) => !MOBILE_PRIMARY_KEYS.includes(item.key));
  const overflowActive = overflow.some((item) => item.screen === screen);

  return (
    <>
      {/* Bottom tab bar — one-thumb reach for the most-used screens */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]">
        {primary.map(({ key, screen: s, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => navigate(s)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
              screen === s ? "text-accent" : "text-muted"
            }`}
          >
            <Icon size={19} />
            <span className="leading-none">{label.split(" ")[0]}</span>
          </button>
        ))}
        {overflow.length > 0 && (
          <button
            onClick={() => setMobileNavOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
              overflowActive ? "text-accent" : "text-muted"
            }`}
          >
            <MoreHorizontal size={19} />
            <span className="leading-none">More</span>
          </button>
        )}
      </nav>

      {/* More sheet — everything that doesn't fit in the bottom bar */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-[#0F3058]/40" onClick={() => setMobileNavOpen(false)} />
          <div className="relative bg-surface rounded-t-2xl shadow-tag pb-[env(safe-area-inset-bottom)] max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-divider">
              <span className="text-sm font-semibold text-ink">More</span>
              <button onClick={() => setMobileNavOpen(false)}><X size={18} color="#5B7591" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 p-5">
              {overflow.map(({ key, screen: s, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => navigate(s)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center ${
                    screen === s ? "border-accent bg-accent-soft text-accent" : "border-border text-ink"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[11px] font-medium leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
