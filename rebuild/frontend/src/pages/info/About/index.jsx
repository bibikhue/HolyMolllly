import { useEffect, useRef, useState } from "react";
import Hero from "./Hero";
import Need from "./Need";
import Features from "./Features";
import Team from "./Team";
import Members from "./Members";
import "./About.css";

const SECTION_COUNT = 5;
const SCROLL_DELAY = 850;

function About() {
  const pageRef = useRef(null);
  const moveRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const sections = Array.from(pageRef.current.children);
    const main = pageRef.current.closest("main");
    const lastIndex = sections.length - 1;
    let currentIndex = 0;
    let touchStartY = 0;
    let unlockTimer;

    const getViewport = () => {
      const scrollRoot = main.scrollHeight > main.clientHeight + 1 ? main : window;
      return {
        scrollRoot,
        top: scrollRoot === window ? 0 : main.getBoundingClientRect().top,
        height: scrollRoot === window ? window.innerHeight : main.clientHeight,
      };
    };

    const updateCurrentSection = () => {
      if (unlockTimer) return;
      const { top, height } = getViewport();
      const visibleIndex = sections.reduce((index, section, nextIndex) =>
        section.getBoundingClientRect().top - top <= height * 0.35
          ? nextIndex
          : index, 0);
      currentIndex = visibleIndex;
      setActiveIndex(visibleIndex);
    };

    const move = (direction, distance) => {
      if (unlockTimer) return true;

      const { scrollRoot, top, height } = getViewport();
      const bounds = sections[currentIndex].getBoundingClientRect();
      if (direction > 0 && bounds.bottom > top + height + 8) {
        scrollRoot.scrollBy({ top: Math.min(distance, bounds.bottom - top - height) });
        return true;
      }
      if (direction < 0 && bounds.top < top - 8) {
        scrollRoot.scrollBy({ top: -Math.min(distance, top - bounds.top) });
        return true;
      }

      const nextIndex = Math.max(0, Math.min(lastIndex, currentIndex + direction));
      if (nextIndex === currentIndex) return false;

      currentIndex = nextIndex;
      setActiveIndex(nextIndex);
      sections[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
      unlockTimer = window.setTimeout(() => {
        unlockTimer = undefined;
        updateCurrentSection();
      }, SCROLL_DELAY);
      return true;
    };
    moveRef.current = move;

    const onWheel = (event) => {
      if (event.ctrlKey || Math.abs(event.deltaY) < 8) return;
      if (move(Math.sign(event.deltaY), Math.max(80, Math.abs(event.deltaY)))) {
        event.preventDefault();
      }
    };
    const onTouchStart = (event) => {
      touchStartY = event.touches[0].clientY;
    };
    const onTouchMove = (event) => {
      const direction = Math.sign(touchStartY - event.touches[0].clientY);
      if ((direction > 0 && currentIndex < lastIndex) ||
          (direction < 0 && currentIndex > 0)) {
        event.preventDefault();
      }
    };
    const onTouchEnd = (event) => {
      const distance = touchStartY - event.changedTouches[0].clientY;
      if (Math.abs(distance) > 50) move(Math.sign(distance), Math.abs(distance));
    };

    window.addEventListener("scroll", updateCurrentSection);
    main.addEventListener("scroll", updateCurrentSection);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.clearTimeout(unlockTimer);
      moveRef.current = null;
      window.removeEventListener("scroll", updateCurrentSection);
      main.removeEventListener("scroll", updateCurrentSection);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <>
      <article className="about-page" ref={pageRef}>
        <Hero />
        <Need />
        <Features />
        <Team />
        <Members />
      </article>
      {activeIndex < SECTION_COUNT - 1 && (
        <button
          className="about-page__scroll-cue"
          type="button"
          onClick={() => moveRef.current?.(1, window.innerHeight)}
          aria-label="다음 섹션으로 이동"
        >
          <span>SCROLL DOWN</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 8 6 6 6-6" />
            <path d="m6 13 6 6 6-6" />
          </svg>
        </button>
      )}
    </>
  );
}

export default About;
