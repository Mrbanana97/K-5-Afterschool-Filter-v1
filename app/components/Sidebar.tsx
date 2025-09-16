"use client";
import React from "react";
import { IconHome, IconList, IconUpload, IconActivity, IconChevronLeft, IconChevronRight } from "./icons";

type View = "filter" | "manage" | "import" | "activities";

export default function Sidebar({
  current,
  onSelect,
  collapsed = false,
  onToggle,
}: {
  current: View;
  onSelect: (v: View) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const items: Array<{ key: View; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }> = [
    { key: "filter", label: "Filter & Print", Icon: IconHome },
    { key: "manage", label: "Manage", Icon: IconList },
    { key: "import", label: "Import", Icon: IconUpload },
    { key: "activities", label: "Activities", Icon: IconActivity },
  ];

  return (
    <aside className={`${collapsed ? "w-14" : "w-full md:w-64"} transition-[width] duration-300 ease-in-out`}>
      <div className={`h-full flex flex-col bg-[#0f1217] text-gray-100 border border-black/40 rounded-2xl overflow-hidden transition-all duration-300 ease-in-out`}>
        {/* Top control bar for toggle (does not overlap content) */}
        <div className="px-2 pt-2 pb-0 flex justify-end">
          {onToggle && (
            <button
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={onToggle}
              className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 p-1.5 transition-colors"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
            </button>
          )}
        </div>

        <div className={`px-3 py-3 flex items-center ${collapsed ? "justify-center" : "gap-2"} border-b border-white/5`}>
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
            <span className="text-lg">🏫</span>
          </div>
          {!collapsed && (
            <div className="text-sm">
              <div className="font-semibold text-white">K-5 Afterschool</div>
              <div className="text-gray-400">Admin</div>
            </div>
          )}
        </div>
        <nav className="p-2 space-y-1">
          {items.map(({ key, label, Icon }) => {
            const active = current === key;
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-3 px-3"} py-2 rounded-xl text-left transition-colors ${
                  active ? "bg-white/10 text-white border border-white/10" : "hover:bg-white/5 text-gray-300"
                }`}
                title={collapsed ? label : undefined}
              >
                <Icon className="shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{label}</span>}
              </button>
            );
          })}
        </nav>
        <div className={`text-xs text-gray-500 ${collapsed ? "px-0 py-3 text-center" : "px-4 py-3"}`}>© {new Date().getFullYear()}</div>
      </div>
    </aside>
  );
}
