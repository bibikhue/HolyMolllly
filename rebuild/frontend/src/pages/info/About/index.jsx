import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Hero from "./Hero";
import Need from "./Need";
import Features from "./Features";
import Team from "./Team";
import Members from "./Members";
import "./About.css";

function About() {
  const pageRef = useRef(null);
  const moveRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useLayoutEffect(() => {
    pageRef.current.closest("main").scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const sections = Array.from(pageRef.current.children);
    const main = pageRef.current.closest("main");
    const listeners = new AbortController();
    let currentIndex = 0;
    let lockedUntil = 0;

    const viewport = () => {
      const scrollRoot = main.scrollHeight > main.clientHeight + 1 ? main : window;
      return {
        scrollRoot,
        top: scrollRoot === window ? 0 : main.getBoundingClientRect().top,
        height: scrollRoot === window ? window.innerHeight : main.clientHeight,
      };
    };

    const syncIndex = () => {
      if (performance.now() < lockedUntil) return;
      const { top, height } = viewport();
      currentIndex = sections.findLastIndex((section) =>
        section.getBoundingClientRect().top - top <= height * 0.35);
      currentIndex = Math.max(0, currentIndex);
      setActiveIndex(currentIndex);
    };

    const move = (direction, distance) => {
      if (performance.now() < lockedUntil) return true;
      const { scrollRoot, top, height } = viewport();
      const bounds = sections[currentIndex].getBoundingClientRect();
      const remaining = direction > 0 ? bounds.bottom - top - height : top - bounds.top;

      if (remaining > 8) {
        scrollRoot.scrollBy({ top: direction * Math.min(distance, remaining) });
        return true;
      }

      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= sections.length) return false;
      currentIndex = nextIndex;
      setActiveIndex(nextIndex);
      sections[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
      lockedUntil = performance.now() + 850;
      return true;
    };
    moveRef.current = move;

    window.addEventListener("scroll", syncIndex, { signal: listeners.signal });
    main.addEventListener("scroll", syncIndex, { signal: listeners.signal });
    window.addEventListener("wheel", (event) => {
      if (window.matchMedia("(max-width: 1000px), (max-height: 600px)").matches) return;
      if (event.ctrlKey || Math.abs(event.deltaY) < 8) return;
      if (move(Math.sign(event.deltaY), Math.max(80, Math.abs(event.deltaY)))) event.preventDefault();
    }, { passive: false, signal: listeners.signal });

    return () => {
      listeners.abort();
      moveRef.current = null;
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
      {activeIndex < 4 && (
        <button className="about-page__scroll-cue" type="button" onClick={() => moveRef.current?.(1, window.innerHeight)} aria-label="다음 섹션으로 이동">
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
