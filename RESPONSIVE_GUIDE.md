# Responsive Design Quick Reference

## Breakpoint System

```
sm:  640px   (Small tablets and large phones in landscape)
md:  768px   (Tablets)
lg:  1024px  (Desktop)
xl:  1280px  (Large desktop)
```

## Common Patterns Used

### Container Padding
```jsx
className="px-3 sm:px-4 lg:px-6"
// Mobile: 12px, Tablet: 16px, Desktop: 24px
```

### Card Padding
```jsx
className="p-3 sm:p-4 md:p-6"
// Mobile: 12px, Tablet: 16px, Desktop: 24px
```

### Gap Spacing
```jsx
className="gap-2 sm:gap-3 lg:gap-6"
// Mobile: 8px, Tablet: 12px, Desktop: 24px
```

### Text Sizing
```jsx
className="text-2xl sm:text-3xl"
// Mobile: 24px, Tablet+: 30px
```

### Grid Layouts
```jsx
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
// Mobile: 1 column, Tablet: 2 columns, Desktop: 4 columns
```

### Flexbox Layouts
```jsx
className="flex flex-col sm:flex-row gap-2"
// Mobile: Stack vertically, Tablet+: Horizontal
```

### Touch Targets
```jsx
className="min-h-[44px] touch-manipulation"
// Ensures minimum 44px height for touch-friendly interaction
```

### Responsive Width
```jsx
className="w-full sm:w-auto sm:min-w-[240px]"
// Mobile: Full width, Tablet+: Auto width with minimum
```

### Responsive Visibility
```jsx
className="hidden md:block"
// Hidden on mobile, visible on tablet+
```

```jsx
className="md:hidden"
// Visible on mobile, hidden on tablet+
```

### Font Sizing
```jsx
className="text-xs sm:text-sm"
// Mobile: 12px, Tablet+: 14px
```

### Border Radius
```jsx
className="rounded-lg sm:rounded-xl"
// Mobile: 8px, Tablet+: 12px
```

## Component-Specific Patterns

### Filter Toolbar
```jsx
<div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
  <div className="relative w-full sm:flex-1 sm:min-w-[240px]">
    {/* Search input */}
  </div>
  <div className="flex flex-wrap gap-2">
    {/* Filter buttons */}
  </div>
</div>
```

### Data Tables
```jsx
<div className="overflow-x-auto max-h-[calc(100vh-20rem)]">
  <table className="min-w-full text-xs sm:text-sm">
    <thead className="bg-gray-100 sticky top-0 z-10">
      <tr>
        <th className="px-2 sm:px-3 md:px-4 py-3">...</th>
      </tr>
    </thead>
  </table>
</div>
```

### Buttons
```jsx
// Primary action
<button className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm 
                   hover:bg-blue-700 active:bg-blue-800 transition-colors 
                   shadow-sm hover:shadow min-h-[44px] touch-manipulation">
  Action
</button>

// Secondary action
<button className="px-3 py-2 rounded-lg border border-gray-300 text-sm 
                   hover:bg-gray-50 transition-colors min-h-[44px] 
                   touch-manipulation">
  Cancel
</button>
```

### Modal/Popover
```jsx
{/* Backdrop */}
<div className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm" 
     onClick={handleClose} />

{/* Content */}
<div className="absolute left-0 sm:left-auto z-20 mt-2 
                w-full sm:w-72 rounded-xl bg-white shadow-xl 
                ring-1 ring-black ring-opacity-5 p-4">
  {/* Popover content */}
</div>
```

### Input Fields
```jsx
<input className="w-full rounded-lg border border-gray-300 px-3 py-2.5 
                  text-sm focus:outline-none focus:ring-2 
                  focus:ring-blue-500 focus:border-transparent min-h-[44px]" />
```

### Select Dropdowns
```jsx
<select className="w-full rounded-lg border border-gray-300 px-3 py-2.5 
                   text-sm focus:outline-none focus:ring-2 
                   focus:ring-blue-500 focus:border-transparent min-h-[44px]">
  <option>...</option>
</select>
```

## Accessibility Classes

### Focus States
```jsx
className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
```

### Screen Reader Only
```jsx
className="sr-only"
```

### Touch Manipulation
```jsx
className="touch-manipulation"
// Disables double-tap zoom on touch devices for better UX
```

## Color System

### Backgrounds
- `bg-white` - Main content areas
- `bg-gray-50` - Page background, secondary areas
- `bg-gray-100` - Table headers, hover states

### Borders
- `border-gray-200` - Standard borders
- `border-gray-300` - Input borders
- `border-blue-500` - Focus state borders

### Text
- `text-gray-900` - Primary text
- `text-gray-600` - Secondary text
- `text-gray-500` - Tertiary text, placeholders

### Buttons
- `bg-blue-600 hover:bg-blue-700 active:bg-blue-800` - Primary actions
- `bg-green-600 hover:bg-green-700` - Success/Download
- `bg-red-600 hover:bg-red-700` - Delete/Danger
- `bg-indigo-600 hover:bg-indigo-700` - Special actions
- `bg-purple-600 hover:bg-purple-700` - Alternative actions

## Testing Checklist

- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test on iPad (Safari)
- [ ] Test on Desktop (Chrome, Firefox, Safari, Edge)
- [ ] Test at 150% zoom
- [ ] Test with keyboard navigation
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Verify all touch targets meet 44px minimum
- [ ] Check color contrast ratios (WCAG AA minimum)
- [ ] Test landscape and portrait orientations
- [ ] Verify sticky headers work properly
- [ ] Test form submissions on mobile
- [ ] Verify modals/popovers work on all devices
