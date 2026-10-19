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
        role: 'CRS Mentor — SPS L3',
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

  // Skills section — "Disciplines". Technical items render as an icon grid;
  // core competencies render as tags. Icons are either a Font Awesome class
  // (`fa`) or a local SVG path (`img`, under public/icons/).
  skills: {
    heading: 'Disciplines',
    technical: {
      label: 'Technical Proficiency',
      items: [
        { name: 'JavaScript', fa: 'fab fa-js-square' },
        { name: 'SQL', fa: 'fas fa-database' },
        { name: 'AWS', fa: 'fab fa-aws' },
        { name: 'PowerBI', fa: 'fas fa-chart-bar' },
        { name: 'Excel', fa: 'fas fa-file-excel' },
        { name: 'HTML/CSS', fa: 'fab fa-html5' },
        { name: 'JSON', fa: 'fas fa-code' },
        { name: 'Minitab', fa: 'fas fa-calculator' },
        { name: 'Lambda', fa: 'fas fa-bolt' },
        { name: 'Amazon Nova', img: 'icons/amazon-nova.svg' },
        { name: 'Amazon Quick', img: 'icons/amazon-quick.svg' },
        { name: 'Kiro', img: 'icons/kiro.svg' },
        { name: 'VBA', fa: 'fas fa-file-code' },
      ],
    },
    core: {
      label: 'Core Competencies',
      items: [
        'Process Improvement', 'Project Management', 'Data Analysis',
        'Leadership', 'Problem Solving', 'Strategic Planning',
        'Team Management', 'Automation', 'Markdown', 'MS Access',
        'PowerPoint', 'Canva',
      ],
    },
  },

  // Projects / "Contracts" section
  projects: {
    heading: 'Contracts',
    items: [
      {
        name: 'Vireon — Operations Platform',
        desc: 'A standalone full-stack web platform I architected and built end to end with JavaScript and AWS (Amplify, Cognito, S3, Lambda): real-time tracking, productivity, capacity and project-health dashboards, project management and an in-app AI assistant. Evolved from an early browser-extension prototype (Aura) into one deployment serving multiple teams across 3 sites.',
        tags: ['JavaScript + AWS', '30+ Tools & Dashboards'],
        link: '#',
      },
      {
        name: 'In-App AI Assistant',
        desc: 'A natural-language assistant inside Vireon, powered by Amazon Nova via AWS Lambda — reads from live data sources, answers questions in plain English, explains features from an in-app knowledge base, and executes actions like opening tools and searching projects.',
        tags: ['Amazon Nova + Lambda', 'Natural-Language Actions'],
        link: '#',
      },
      {
        name: 'SOP Optimization',
        desc: 'Launched 3 SOPs, streamlining operational procedures across teams.',
        tags: ['$23.3M Savings', '95.3% Ticket Reduction'],
        link: '#',
      },
      {
        name: 'Duplicate Reimbursement Resolution',
        desc: 'Identified and resolved a major reimbursement issue through a STAR project.',
        tags: ['$2.2M Impact', 'Issue Resolution'],
        link: '#',
      },
      {
        name: 'TTR Reduction Project',
        desc: 'Reduced Time to Resolution for the FFT2 skill using Lean Six Sigma methodology.',
        tags: ['12.66 → 3.54 Days', '72% Improvement'],
        link: '#',
      },
      {
        name: 'CRS Annotation Program',
        desc: 'Programmed and implemented to improve ticket quality and reduce NVA tickets.',
        tags: ['Improved Quality', 'Reduced NVA Tickets'],
        link: '#',
      },
      {
        name: 'Buddy Form Program',
        desc: 'Initiated and launched globally to enhance CRS associate learning.',
        tags: ['Global Implementation', 'Enhanced Learning'],
        link: '#',
      },
    ],
  },

  // Contact section
  contact: {
    heading: 'Summon Me',
    body: 'Open to new contracts and collaborations.',
    email: 'abdul1mofil@gmail.com',
    socials: [
      { label: 'GitHub', url: 'https://github.com/Mofi-l/Portfolio' },
      {
        label: 'Builder Portfolio',
        url: 'https://canopy.fgbs.amazon.dev/apps/espr-innovation-center/#/profile/mofila',
      },
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
