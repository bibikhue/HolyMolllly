import { Link } from "react-router-dom";
import Logo from "../Logo";
import { FOOTER_LIST, RELATED_SITES } from "../../constants/navigation";

function Top() {
  return (
    <div className="footer-top">
      <Logo />
      <nav className="footer-links" aria-label="사이트 안내">
        <ul>
          {FOOTER_LIST.map(({ name, link }) => (
            <li key={link}>
              <Link to={link}>{name}</Link>
            </li>
          ))}
          <li>
            <details className="footer-sites">
              <summary>관련 사이트</summary>
              <ul>
                {RELATED_SITES.map(({ name, link }) => (
                  <li key={link}>
                    <a href={link} target="_blank" rel="noopener noreferrer">{name} ↗</a>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default Top;
