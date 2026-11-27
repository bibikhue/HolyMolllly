import { useLayoutEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

import "./index.css";
import Logo from "../Logo";
import { HEADER_LIST } from "../../constants/navigation";

function LogoutButton({ onLogout, onCloseMenu }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setError("");
    onCloseMenu();
    try {
      await onLogout();
    } catch {
      setError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="header-actions">
      <button type="button" className="header-logout" onClick={handleLogout} disabled={isLoggingOut}>
        {isLoggingOut ? "로그아웃 중…" : "로그아웃"}
      </button>
      {error && <p className="header-logout-error" role="alert">{error}</p>}
    </div>
  );
}

function Header({ onNavigate, isLoggedIn, onLogout }) {
  const headerRef = useRef(null);
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const alignDropdown = () => {
      const columns = Array.from(menu.children, (item) => `${item.getBoundingClientRect().width}px`);
      headerRef.current.style.setProperty("--header-menu-columns", columns.join(" "));
    };
    alignDropdown();
    const observer = new ResizeObserver(alignDropdown);
    observer.observe(menu);
    for (const item of menu.children) observer.observe(item);
    return () => observer.disconnect();
  }, []);

  const closeMenu = () => {
    setIsOpen(false);
    setHoveredMenu(null);
  };

  return (
    <header
      ref={headerRef}
      id="top"
      className="header"
      onMouseLeave={closeMenu}
    >
      <div className="header-bar">
        <Logo />
        <nav
          aria-label="주 메뉴"
          onMouseEnter={() => setIsOpen(true)}
          onTouchStart={() => setIsOpen((open) => !open)}
        >
          <ul className="header-columns" ref={menuRef}>
            {HEADER_LIST.map(({ name, link }) => (
              <li key={link}>
                <NavLink
                  to={link}
                  onClick={(event) => onNavigate(event, link)}
                  className={({ isActive }) =>
                    isActive || hoveredMenu === link ? "active" : undefined
                  }
                >
                  {name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {isLoggedIn && (
          <LogoutButton onLogout={onLogout} onCloseMenu={closeMenu} />
        )}
      </div>
      {isOpen && (
        <nav className="header-dropdown" aria-label="하위 메뉴">
          <ul className="header-columns">
            {HEADER_LIST.map(({ name, link, children }) => (
              <li
                key={link}
                onMouseEnter={() => setHoveredMenu(link)}
                onMouseLeave={() => setHoveredMenu(null)}
              >
                {children && (
                  <ul className="header-submenu" aria-label={name}>
                    {children.map((item) => (
                      <li key={item.link}>
                        <NavLink
                          to={item.link}
                          onClick={(event) => {
                            onNavigate(event, item.link);
                            closeMenu();
                          }}
                        >
                          {item.name}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

export default Header;
