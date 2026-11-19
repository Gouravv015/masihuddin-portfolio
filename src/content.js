// Everything a visitor reads lives here. Sections with nothing to show stay hidden rather than showing filler.
export const CONTENT = {
  // One or two sentences in your own words. It reveals word by word as visitors scroll.
  about:
    'I’m a computer science student at Scaler School of Technology and BITS Pilani, building backend systems — real-time apps, caches, rate limiters and search — that stay fast under load.',

  // The photo in the second section, which shrinks into the About text as you scroll.
  // PLACEHOLDER: a free Unsplash photo by Matthew Wiebe (via Picsum). Replace public/portrait.jpg with yours.
  // It's shown in black and white.
  portrait: `${import.meta.env.BASE_URL}portrait.jpg`,

  // Your email, e.g. 'hello@example.com'. The contact button stays hidden until this is set.
  email: 'masihuddin4545@gmail.com',

  // Add a project by copying an entry. `url` is optional; without one the row isn't a link.
  // `image` (in public/projects, 4:3 works best) is shown in the W-O-R-K gallery; without one the card shows the title.
  projects: [
    {
      title: 'Typeahead',
      summary:
        'High-performance autocomplete engine: an in-memory Trie with cache nodes on a consistent-hashing ring; p50 0.5 ms / p95 1.2 ms on 1.24M queries.',
      tags: ['Node.js', 'PostgreSQL', 'Docker'],
    },
    {
      title: 'ChatApp',
      summary:
        'Real-time chat with AI personas: JWT auth, media sharing, presence and queues, with persona replies grounded in Qdrant-retrieved context.',
      tags: ['Express', 'Socket.io', 'MongoDB', 'Redis', 'React', 'Gemini', 'Qdrant'],
    },
    {
      title: 'HTTP Server',
      summary:
        'A multi-threaded HTTP server from scratch in core Java: no frameworks, a thread-pool model, static files and dynamic endpoints.',
      tags: ['Java', 'Sockets', 'Multithreading'],
    },
    {
      title: 'Distributed Cache',
      summary: 'In-memory distributed cache with pluggable node-distribution strategies and LRU eviction.',
      tags: ['Java', 'ConcurrentHashMap', 'LRU'],
    },
    {
      title: 'Rate Limiter',
      summary: 'Pluggable, thread-safe rate-limiter library with fixed-window and sliding-window algorithms.',
      tags: ['Java', 'Strategy Pattern'],
    },
  ],

  // The Journey section: one milestone per stop along the line. Keep each to one or two short lines.
  journey: [
    {
      year: '2024',
      title: 'Scaler School of Technology',
      text: 'Started the undergraduate program in Computer Science in Bengaluru.',
    },
    {
      year: '2024',
      title: 'BITS Pilani',
      text: 'Began a B.Sc. (Hons.) in Computer Science alongside it, online.',
    },
    {
      year: 'Now',
      title: 'Building systems',
      text: 'Typeahead, ChatApp, an HTTP server from scratch, a distributed cache and a rate limiter.',
    },
    { year: '2027', title: 'B.Sc. (Hons.)', text: 'Graduating from BITS Pilani in Computer Science.' },
    { year: '2028', title: 'Scaler graduation', text: 'Completing the Computer Science program at Scaler.' },
  ],

  // Skills as books on a shelf: each book is one group. `blurb` is the line on its detail page.
  skills: [
    { group: 'Languages', blurb: 'The ones I think in.', items: ['Java', 'Python', 'TypeScript', 'JavaScript', 'SQL'] },
    {
      group: 'Backend',
      blurb: 'Servers, APIs and real-time, plus the apps on top.',
      items: ['Node.js', 'Express', 'Fastify', 'Socket.io', 'REST APIs', 'React', 'React Native (Expo)', 'JDBC'],
    },
    {
      group: 'Cloud & DevOps',
      blurb: 'Shipping it and keeping it up.',
      items: ['Docker', 'Docker Compose', 'CI/CD Pipelines', 'AWS (RDS)', 'Render'],
    },
    {
      group: 'Distributed Systems',
      blurb: 'Staying fast and correct at scale.',
      items: [
        'Consistent Hashing',
        'LRU Caching',
        'Rate Limiting',
        'Pub/Sub',
        'BullMQ Queues',
        'Event-Driven Architecture',
      ],
    },
    {
      group: 'Databases',
      blurb: 'Where the data lives.',
      items: ['MongoDB (Mongoose)', 'PostgreSQL', 'MySQL', 'Redis', 'SQLite'],
    },
    {
      group: 'AI & Data',
      blurb: 'Models, retrieval and vision.',
      items: [
        'Gemini API',
        'Qdrant Vector Search',
        'Hugging Face Vision Models',
        'Supervised & Unsupervised Learning',
        'Neural Networks & Computer Vision',
      ],
    },
    {
      group: 'Core Concepts',
      blurb: 'The foundations under everything else.',
      items: ['OOP', 'Low-Level Design', 'High-Level Design', 'OS & Concurrency', 'Computer Networks', 'DBMS'],
    },
    { group: 'Tools', blurb: 'The everyday kit.', items: ['Git', 'GitHub', 'Linux', 'n8n'] },
  ],
};
