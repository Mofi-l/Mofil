import { content, sections } from '../content'

/**
 * The scrollable HTML content layered over the fixed 3D canvas.
 * Each <section> is one full viewport tall so scroll progress maps
 * cleanly onto the 3D camera / model choreography.
 */
export default function Overlay({ active, onNavigate }) {
  const { name, title, tagline, about, skills, projects, contact } = content

  return (
    <div className="overlay">
      {/* Fixed side navigation */}
      <nav className="side-nav" aria-label="Section navigation">
        {sections.map((s, i) => (
          <button
            key={s.id}
            className={`nav-dot ${active === i ? 'is-active' : ''}`}
            onClick={() => onNavigate(i)}
            aria-label={s.label}
          >
            <span className="nav-dot__mark" />
            <span className="nav-dot__label">{s.label}</span>
          </button>
        ))}
      </nav>

      {/* HERO */}
      <section className="section section--hero" id="hero">
        <div className="hero-inner">
          <p className="eyebrow">Portfolio of</p>
          <h1 className="hero-name">{name}</h1>
          <p className="hero-title">{title}</p>
          <p className="hero-tagline">{tagline}</p>
          <div className="scroll-hint">
            <span>scroll into the dark</span>
            <span className="scroll-hint__arrow">↓</span>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="section section--left" id="about">
        <div className="panel">
          <h2 className="section-heading">{about.heading}</h2>
          {about.body.map((p, i) => (
            <p className="section-body" key={i}>
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* SKILLS */}
      <section className="section section--right" id="skills">
        <div className="panel">
          <h2 className="section-heading">{skills.heading}</h2>
          <div className="skill-groups">
            {skills.groups.map((g) => (
              <div className="skill-group" key={g.label}>
                <h3 className="skill-group__label">{g.label}</h3>
                <ul className="skill-list">
                  {g.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section className="section section--left" id="projects">
        <div className="panel panel--wide">
          <h2 className="section-heading">{projects.heading}</h2>
          <div className="project-grid">
            {projects.items.map((p) => (
              <a className="project-card" href={p.link} key={p.name}>
                <h3 className="project-card__name">{p.name}</h3>
                <p className="project-card__desc">{p.desc}</p>
                <div className="project-card__tags">
                  {p.tags.map((t) => (
                    <span className="tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="section section--center" id="contact">
        <div className="panel panel--center">
          <h2 className="section-heading">{contact.heading}</h2>
          <p className="section-body">{contact.body}</p>
          <a className="contact-email" href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
          <div className="socials">
            {contact.socials.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
