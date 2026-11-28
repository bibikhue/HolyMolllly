import { Link } from "react-router-dom";
import "./FeatureGuide.css";

export default function FeatureGuide({ title, description, items }) {
  return <section className="feature-guide">
    <div className="feature-guide__inner">
      <header className="feature-guide__intro"><h1>{title}</h1><p>{description}</p></header>
      <ul className="feature-guide__list">{items.map((item) => {
        const content = <><div><h2>{item.title}</h2><p>{item.description}</p></div><span className="feature-guide__action">{item.to ? <>보기 <span aria-hidden="true">↗</span></> : "준비 중"}</span></>;
        return <li key={item.title}>{item.to ? <Link to={item.to}>{content}</Link> : <div className="feature-guide__pending">{content}</div>}</li>;
      })}</ul>
    </div>
  </section>;
}
