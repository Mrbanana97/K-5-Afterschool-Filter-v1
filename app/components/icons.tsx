"use client";
import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function createIcon(path: React.ReactNode) {
  return function Icon({ size = 18, className, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        {path}
      </svg>
    );
  };
}

export const IconHome = createIcon(
  <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5z" />
);

export const IconFilter = createIcon(
  <>
    <path d="M4 6h16" />
    <path d="M6 12h12" />
    <path d="M10 18h4" />
  </>
);

export const IconList = createIcon(
  <>
    <path d="M8 6h12" />
    <path d="M8 12h12" />
    <path d="M8 18h12" />
    <circle cx="4" cy="6" r="1.5" />
    <circle cx="4" cy="12" r="1.5" />
    <circle cx="4" cy="18" r="1.5" />
  </>
);

export const IconUpload = createIcon(
  <>
    <path d="M12 15V3" />
    <path d="M7 8l5-5 5 5" />
    <path d="M4 21h16" />
  </>
);

export const IconActivity = createIcon(
  <path d="M3 12h4l3 7 4-14 3 7h4" />
);

export const IconUser = createIcon(
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4 20c1.5-3.5 4.5-5.5 8-5.5s6.5 2 8 5.5" />
  </>
);

export const IconSettings = createIcon(
  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8.94-3a7.97 7.97 0 0 0-.17-1.5l2.07-1.61-2-3.46-2.5 1A8.2 8.2 0 0 0 16.5 4l-.38-2.65h-4.24L11.5 4a8.2 8.2 0 0 0-1.84 1.93l-2.5-1-2 3.46 2.07 1.61A8.2 8.2 0 0 0 7.06 12c0 .5.06 1 .17 1.5l-2.07 1.61 2 3.46 2.5-1A8.2 8.2 0 0 0 11.5 20l.38 2.65h4.24L16.5 20a8.2 8.2 0 0 0 1.84-1.93l2.5 1 2-3.46-2.07-1.61c.11-.5.17-1 .17-1.5z" />
);

export const IconSearch = createIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-3.5-3.5" />
  </>
);

export const IconCalendar = createIcon(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 9h18" />
  </>
);

export const IconTag = createIcon(
  <path d="M20 13l-7 7-9-9V4h7l9 9zM7 7h.01" />
);

export const IconSort = createIcon(
  <>
    <path d="M10 4h10" />
    <path d="M10 8h7" />
    <path d="M10 12h4" />
  </>
);

export const IconClear = createIcon(
  <path d="M6 6l12 12M18 6L6 18" />
);

export const IconMenu = createIcon(
  <>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </>
);

export const IconChevronLeft = createIcon(
  <path d="M14 6l-6 6 6 6" />
);

export const IconChevronRight = createIcon(
  <path d="M10 6l6 6-6 6" />
);

const icons = {
  IconHome,
  IconFilter,
  IconList,
  IconUpload,
  IconActivity,
  IconUser,
  IconSettings,
  IconSearch,
  IconCalendar,
  IconTag,
  IconSort,
  IconClear,
  IconMenu,
  IconChevronLeft,
  IconChevronRight,
};
export default icons;
