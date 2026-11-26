import { useState } from "react";
import { NavLink } from "react-router-dom";

import "./index.css";
import Logo from "../Logo";
import { HEADER_LIST } from "../../constants/navigation";

function Header({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);

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
