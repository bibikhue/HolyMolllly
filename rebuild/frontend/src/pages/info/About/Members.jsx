import { useTranslation } from "react-i18next";
const teamMembers = [
  { name: "김봉진", position: "3.5%" },
  { name: "박정하", position: "25.5%" },
  { name: "황지원", position: "50%" },
  { name: "유진", position: "73%" },
  { name: "이상영", position: "96.5%" },
];

function Members() {
  const { t } = useTranslation();
  return (
    <section className="about-page__members" aria-labelledby="members-title">
      <span className="about-page__label">05 / 05 · OUR TEAM</span>
      <h2 id="members-title">{t("함께 만든 사람들")}</h2>
      <ul>
        {teamMembers.map(({ name, position }) => (
          <li key={name}>
            <span className="about-page__avatar" style={{ backgroundPositionX: position }} aria-hidden="true" />
            <strong>{name}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Members;
