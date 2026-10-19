// ─────────────────────────────────────────────────────────────
//  EDIT YOUR PORTFOLIO CONTENT HERE
//  All text shown on the site lives in this one file.
// ─────────────────────────────────────────────────────────────

export const content = {
  // Shown in the hero section
  name: 'Abdul Mofil',
  title: 'Technical Specialist / Full-Stack Developer',
  // First shown in the hero before the title swaps in (see Overlay hero).
  intro: 'Shadow Monk',
  tagline: 'Moving unseen between design and code.',

  // About section
  about: {
    heading: 'The Vow',
    body: [
      'I build in the quiet hours — crafting systems that feel effortless on the surface and are relentless underneath.',
      'Transforming Selling Partner Support STAR-ESPR Org with data-driven process improvement and full-stack automation — turning manual workflows into AWS-powered web apps.',
    ],
  },

  // Experience / career path — a chronological timeline of roles ("The Path")
  experience: {
    heading: 'The Path',
    items: [
      {
        role: 'Senior Process Specialist, STAR — SPS L4',
        org: 'Amazon Hyderabad',
        period: 'Present',
        current: true,
        achievements: [
          'Architected and built Vireon — a standalone full-stack operations platform (AWS Amplify, Cognito, S3, Lambda, Amazon Nova AI) with 30+ integrated tools and dashboards, evolved from an early browser-extension prototype (Aura) into a web app serving multiple teams across 3 sites.',
          'Identified and resolved a duplicate reimbursement issue, saving $2.2M.',
        ],
        awards: ['Lean Six Sigma Green Belt', 'Emerald GEM Award', 'Builder Award 2026'],
      },
      {
        role: 'Selling Partner Support — CRS Mentor (L3)',
        org: 'Amazon Chennai',
        period: '2021 — 24',
        achievements: [
          'Launched 3 SOPs, reducing ticket volume by 95.3% and saving $23.3M.',
          'Reduced TTR for FFT2 skill from 12.66 days to 3.54 days.',
        ],
        awards: ['Lean Six Sigma White Belt', 'GEM Award'],
      },
      {
        role: 'CS Associate (L2)',
        org: 'Amazon Coimbatore',
        period: '2017 — 20',
        achievements: ['Trained new hires as Subject Matter Expert (SME).'],
        awards: ['ACES Stage 1 Certified', 'Customer Delight Ambassador'],
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
