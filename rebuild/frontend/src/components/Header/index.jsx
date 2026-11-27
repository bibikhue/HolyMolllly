import { useState } from "react";
import { NavLink } from "react-router-dom";

import "./index.css";
import Logo from "../Logo";
import { HEADER_LIST } from "../../constants/navigation";

function Header({ onNavigate, isLoggedIn, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError("");
    setIsOpen(false);
    setHoveredMenu(null);
    try {
      await onLogout();
    } catch {
      setLogoutError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header
      id="top"
      className="header"
      onMouseLeave={() => {
        setIsOpen(false);
        setHoveredMenu(null);
      }}
    >
      <div className="header-bar">
        <Logo />
        <nav
          aria-label="주 메뉴"
          onMouseEnter={() => setIsOpen(true)}
          onTouchStart={() => setIsOpen((open) => !open)}
        >
          <ul className="header-columns">
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
          <div className="header-actions">
            <button
              type="button"
              className="header-logout"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5H5v14h4M13 8l4 4-4 4M9 12h12" />
              </svg>
              {isLoggingOut ? "로그아웃 중…" : "로그아웃"}
            </button>
            {logoutError && <p className="header-logout-error" role="alert">{logoutError}</p>}
          </div>
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
                            setIsOpen(false);
                            setHoveredMenu(null);
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
