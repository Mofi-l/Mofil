// ─────────────────────────────────────────────────────────────
//  EDIT YOUR PORTFOLIO CONTENT HERE
//  All text shown on the site lives in this one file.
// ─────────────────────────────────────────────────────────────

export const content = {
  // Shown in the hero section
  name: 'YOUR NAME',
  title: 'Shadow Monk / Full-Stack Engineer',
  tagline: 'Moving unseen between design and code.',

  // About section
  about: {
    heading: 'The Vow',
    body: [
      'I build in the quiet hours — crafting systems that feel effortless on the surface and are relentless underneath.',
      'Replace this with a short story about who you are: your focus, your craft, and what drives you.',
    ],
  },

  // Experience / career path — a chronological timeline of roles ("The Path")
  experience: {
    heading: 'The Path',
    items: [
      {
        role: 'Senior Engineer',
        org: 'Company / Guild',
        period: '2023 — Present',
        desc: 'What you own here and the impact you have made. One or two tight lines.',
      },
      {
        role: 'Software Engineer',
        org: 'Company / Order',
        period: '2020 — 2023',
        desc: 'A key accomplishment or the scope of work you were trusted with.',
      },
      {
        role: 'Junior Engineer',
        org: 'Where it began',
        period: '2018 — 2020',
        desc: 'How you sharpened your craft and the foundations you laid.',
      },
    ],
  },

  // Skills section — grouped "disciplines"
  skills: {
    heading: 'Disciplines',
    groups: [
      { label: 'Blades (Frontend)', items: ['React', 'TypeScript', 'Three.js', 'CSS / Motion'] },
      { label: 'Shadows (Backend)', items: ['Node.js', 'Python', 'PostgreSQL', 'REST / GraphQL'] },
      { label: 'Rituals (Infra)', items: ['AWS', 'Docker', 'CI/CD', 'Observability'] },
    ],
  },

  // Projects / "Contracts" section
  projects: {
    heading: 'Contracts',
    items: [
      {
        name: 'Project One',
        desc: 'A short description of what you built and the impact it had.',
        tags: ['React', 'Node', 'AWS'],
        link: '#',
      },
      {
        name: 'Project Two',
        desc: 'Another contract completed in the dark. Describe the problem and your solution.',
        tags: ['Three.js', 'WebGL'],
        link: '#',
      },
      {
        name: 'Project Three',
        desc: 'Describe a third project here. Keep it tight and outcome-focused.',
        tags: ['Python', 'ML'],
        link: '#',
      },
    ],
  },

  // Contact section
  contact: {
    heading: 'Summon Me',
    body: 'Open to new contracts and collaborations.',
    email: 'you@example.com',
    socials: [
      { label: 'GitHub', url: 'https://github.com/yourname' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/yourname' },
      { label: 'X', url: 'https://x.com/yourname' },
    ],
  },
}

// Section metadata used for scroll choreography + nav.
// Keep the order in sync with the sections rendered in Overlay.jsx.
export const sections = [
  { id: 'hero', label: 'Enter' },
  { id: 'about', label: 'The Vow' },
  { id: 'experience', label: 'The Path' },
  { id: 'skills', label: 'Disciplines' },
  { id: 'projects', label: 'Contracts' },
  { id: 'contact', label: 'Summon' },
]
