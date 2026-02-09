# React Carousel

An interactive, infinite-scrolling carousel built with React, TypeScript, and Vite. Features smooth drag (mouse) and swipe (touch) interactions with auto-play functionality.

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

## Project Structure

```
react-carousel/
├── src/
│   ├── components/
│   │   └── Carousel/
│   │       ├── config/
│   │       │   ├── carousel.types.ts      # TypeScript type definitions
│   │       │   └── carousel.constants.ts  # Configuration constants
│   │       ├── Carousel.tsx               # Main carousel component with drag/swipe logic
│   │       ├── CarouselSlide.tsx          # Individual slide component
│   │       └── Carousel.css               # Carousel styling
│   ├── data/
│   │   └── carousel.mock.ts               # Mock data for carousel items
│   ├── App.tsx                            # Root application component
│   ├── App.css                            # App styling
│   ├── main.tsx                           # Application entry point
│   └── index.css                          # Global styles
├── public/                                # Static assets
├── package.json                           # Dependencies and scripts
├── vite.config.ts                         # Vite configuration
└── tsconfig.json                          # TypeScript configuration
```

### Key Components

- **Carousel.tsx**: Core carousel logic including infinite scroll, drag/swipe handling, auto-play, and state management
- **CarouselSlide.tsx**: Renders individual slides with images and titles
- **carousel.types.ts**: TypeScript type definitions for carousel items and props
- **carousel.constants.ts**: Configuration constants (default slide width, clone count, auto-slide interval)
- **carousel.mock.ts**: Sample data structure for carousel items

## Drag & Swipe Implementation

### Mouse Drag (Desktop)

The carousel implements drag functionality using native mouse events:

1. **handleMouseDown**: Captures initial mouse position when user clicks
   - Sets `isDragging` state to true
   - Stores starting X coordinate in `startX` ref
   - Stops auto-slide timer
   - Removes CSS transition for smooth dragging
   - Attaches global `mousemove` and `mouseup` listeners

2. **handleMouseMove**: Tracks mouse movement during drag
   - Calculates delta (distance moved) from start position
   - Updates carousel position in real-time using `transform: translateX()`
   - Sets `hasMoved` flag if movement exceeds 5px threshold

3. **handleMouseUp**: Finalizes drag action
   - Determines if drag distance (≥40px) warrants slide change
   - Snaps to nearest slide or returns to original position
   - Re-enables CSS transitions
   - Restarts auto-slide timer
   - Cleans up event listeners

### Touch Swipe (Mobile)

Touch interactions mirror mouse drag logic using touch events:

1. **handleTouchStart**: Captures initial touch position from `e.touches[0].clientX`
2. **handleTouchMove**: Tracks finger movement and updates carousel position
3. **handleTouchEnd**: Reuses `handleMouseUp` logic for consistent behavior

### Key Technical Details

- **Refs over State**: Uses `useRef` for `startX`, `currentTranslate`, `prevTranslate`, and `currentIndexRef` to avoid re-renders and stale closures during drag
- **Global Event Listeners**: Mouse events attached to `document` to track movement outside carousel bounds
- **Transform over Position**: Uses CSS `transform: translateX()` for hardware-accelerated, smooth animations
- **Threshold Detection**: 40px minimum drag distance required to trigger slide change
- **Dynamic Slide Width**: Calculates slide width from DOM instead of using fixed constant, ensuring responsive behavior across devices

## Edge Case Handling

### 1. Infinite Loop

**Problem**: Creating seamless infinite scrolling without visible jumps.

**Solution**: Clone slides at both ends of the carousel
```typescript
const clonedItems = [
  ...items.slice(-CLONE_COUNT),  // Last 3 items at start
  ...items,                       // Original items
  ...items.slice(0, CLONE_COUNT)  // First 3 items at end
]
```

**Mechanism**:
- Carousel starts at index `CLONE_COUNT` (showing first real item)
- When reaching cloned items at either end, `handleTransitionEnd` detects boundary crossing
- Instantly repositions to corresponding real item without transition
- Uses `trackRef.current.offsetHeight` to force reflow before re-enabling transitions

### 2. Preventing Clicks While Dragging

**Problem**: Drag gestures should not trigger slide click actions.

**Solution**: Track movement with `hasMoved` state
```typescript
const handleSlideClick = (landingPage?: string) => {
  if (hasMoved || !landingPage) return  // Block click if dragged
  window.open(landingPage, '_blank')
}
```

**Mechanism**:
- `hasMoved` flag set to `true` when drag distance exceeds 5px
- Click handler checks this flag before executing navigation
- Prevents accidental link opens during drag/swipe gestures

### 3. Pause on Hover

**Problem**: Auto-play should pause when user interacts with carousel.

**Solution**: Event-driven timer management
```typescript
onMouseEnter={stopAutoSlide}   // Pause when hovering
onMouseLeave={startAutoSlide}  // Resume when leaving
```

**Mechanism**:
- `autoSlideTimer` ref stores interval ID
- `stopAutoSlide` clears interval when mouse enters carousel
- `startAutoSlide` restarts interval when mouse leaves
- Also paused during drag/swipe and resumed on release

### 4. Concurrent Interaction Prevention

**Problem**: Multiple interactions (drag + auto-slide) could conflict.

**Solution**: Use `isDraggingRef` and `isTransitioning` guards
```typescript
const nextSlide = useCallback(() => {
  if (isDraggingRef.current || isTransitioning) return  // Block if busy
  // ... slide logic
}, [isTransitioning])
```

**Mechanism**:
- `isDraggingRef` prevents auto-slide during manual drag
- `isTransitioning` prevents overlapping slide animations
- Ensures only one interaction occurs at a time

### 5. Smooth Transition Management

**Problem**: Transitions should be disabled during drag but enabled for auto-slide.

**Solution**: Dynamic CSS class toggling
```typescript
// During drag start
trackRef.current?.classList.remove('transitioning')

// During drag end
trackRef.current?.classList.add('transitioning')
```

**Mechanism**:
- `.transitioning` class applies `transition: transform 0.3s ease-out`
- Removed during drag for instant position updates
- Re-added after drag for smooth snap-back animation

### 6. Touch Action Optimization

**Problem**: Touch gestures might trigger browser scroll or zoom.

**Solution**: CSS touch-action property
```css
.carousel {
  touch-action: pan-y;  /* Allow vertical scroll, prevent horizontal */
}
```

**Mechanism**:
- Prevents browser from hijacking horizontal swipes
- Allows vertical scrolling to work normally
- Improves touch responsiveness on mobile devices

### 7. Responsive Slide Width

**Problem**: Fixed slide width causes misalignment on different screen sizes (mobile vs desktop).

**Solution**: Dynamic width calculation from DOM
```typescript
const getSlideWidth = useCallback(() => {
  if (trackRef.current) {
    const firstSlide = trackRef.current.firstElementChild as HTMLElement
    if (firstSlide) return firstSlide.offsetWidth
  }
  return SLIDE_WIDTH
}, [])
```

**Mechanism**:
- Reads actual slide width from rendered DOM element
- Updates on window resize to handle orientation changes
- Ensures correct positioning across all device sizes (300px desktop, 250px mobile)
- Prevents showing wrong slide on initial load

### 8. Fast Drag Prevention

**Problem**: Rapid consecutive drags can cause index to exceed boundaries, showing blank slides.

**Solution**: Block new drag interactions during transitions
```typescript
const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
  if (isTransitioning) return  // Block if animating
  // ... drag logic
}
```

**Mechanism**:
- `isTransitioning` flag prevents new drag while slide is animating
- `currentIndexRef` prevents stale closure issues during rapid interactions
- Ensures index stays within valid range (CLONE_COUNT to items.length + CLONE_COUNT)

## Technologies Used

- **React 19.2.0**: UI library
- **TypeScript 5.9.3**: Type safety
- **Vite 7.2.4**: Build tool and dev server
- **ESLint**: Code linting

## Features

✅ Infinite scrolling with seamless loop  
✅ Mouse drag support (desktop)  
✅ Touch swipe support (mobile)  
✅ Auto-play with configurable interval  
✅ Pause on hover  
✅ Click prevention during drag  
✅ Smooth animations with hardware acceleration  
✅ Responsive design with dynamic slide sizing  
✅ TypeScript type safety  
✅ Fast drag protection to prevent boundary overflow  
✅ Stale closure prevention with ref-based state management
