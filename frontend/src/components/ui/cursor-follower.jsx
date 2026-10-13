import { useEffect, useRef } from "react";

// Smooth cursor follower: a small ink dot plus a trailing ring that
// grows over anything clickable. Styled with Tailwind.
//
// Adapted from a shadcn/TypeScript component to this project's plain
// React (JSX) setup. Changes from the original:
// - Positions are written straight to the DOM each frame instead of calling
//   setState 60 times a second, so the rest of the app doesn't re-render.
// - Hover detection uses event delegation, so buttons that appear later
//   (new pages, answers, modals) still make the ring grow.
// - The animation loop is properly cancelled on unmount.
// - It stays hidden on touch screens, for reduced-motion users, and until
//   the mouse first moves (so it never sits in the top-left corner).

const INTERACTIVE = "a, button, img, input, textarea, select, label, [role='button']";
const DOT_SMOOTHNESS = 0.2;
const RING_SMOOTHNESS = 0.1;

export function CursorFollower() {
  const rootRef = useRef(null);
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return undefined;

    const root = rootRef.current;
    const mouse = { x: 0, y: 0 };
    const dot = { x: 0, y: 0 };
    const ring = { x: 0, y: 0 };
    let started = false;
    let frameId = 0;

    const lerp = (start, end, factor) => start + (end - start) * factor;

    const animate = () => {
      dot.x = lerp(dot.x, mouse.x, DOT_SMOOTHNESS);
      dot.y = lerp(dot.y, mouse.y, DOT_SMOOTHNESS);
      ring.x = lerp(ring.x, mouse.x, RING_SMOOTHNESS);
      ring.y = lerp(ring.y, mouse.y, RING_SMOOTHNESS);

      dotRef.current.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0) translate(-50%, -50%)`;
      ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%)`;

      frameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;

      if (!started) {
        started = true;
        dot.x = ring.x = mouse.x;
        dot.y = ring.y = mouse.y;
        root.dataset.visible = "true";
        frameId = requestAnimationFrame(animate);
      }
    };

    const handleMouseOver = (event) => {
      root.dataset.hovering = String(Boolean(event.target.closest?.(INTERACTIVE)));
    };

    const handleLeaveWindow = () => {
      root.dataset.visible = "false";
    };
    const handleEnterWindow = () => {
      if (started) root.dataset.visible = "true";
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseover", handleMouseOver);
    document.documentElement.addEventListener("mouseleave", handleLeaveWindow);
    document.documentElement.addEventListener("mouseenter", handleEnterWindow);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseover", handleMouseOver);
      document.documentElement.removeEventListener("mouseleave", handleLeaveWindow);
      document.documentElement.removeEventListener("mouseenter", handleEnterWindow);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-visible="false"
      data-hovering="false"
      className="group pointer-events-none fixed inset-0 z-[200] opacity-0 transition-opacity duration-300 data-[visible=true]:opacity-100"
    >
      <div
        ref={dotRef}
        className="absolute left-0 top-0 size-2 rounded-full bg-[#22201b] dark:bg-[#efe9dd]"
      />
      <div
        ref={ringRef}
        className="absolute left-0 top-0 size-7 rounded-full border border-[#22201b]/60 transition-[width,height,background-color,border-color] duration-300 group-data-[hovering=true]:size-11 group-data-[hovering=true]:border-[#7a4b16] group-data-[hovering=true]:bg-[#7a4b16]/10 dark:border-[#efe9dd]/60 dark:group-data-[hovering=true]:border-[#d9a866] dark:group-data-[hovering=true]:bg-[#d9a866]/10"
      />
    </div>
  );
}

export default CursorFollower;
