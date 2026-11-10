// Everything a visitor reads lives here. Sections with nothing to show stay hidden rather than showing filler.
export const CONTENT = {
  // One or two sentences in your own words. It reveals word by word as visitors scroll.
  about:
    'I build websites that feel alive — fast, precise, and full of small moments of motion that make people stay a little longer.',

  // The photo in the second section, which shrinks into the About text as you scroll.
  // PLACEHOLDER: a free Unsplash photo by Matthew Wiebe (via Picsum). Replace public/portrait.jpg with yours, in
  // It's shown in black and white.
  portrait: `${import.meta.env.BASE_URL}portrait.jpg`,

  // Your email, e.g. 'hello@example.com'. The contact button stays hidden until this is set.
  email: '',

  // Add a project by copying an entry. `url` is optional; without one the row isn't a link.
  // `image` (in public/projects, 4:3 works best) is shown in the W-O-R-K gallery; without one the card shows the title.
  projects: [
    // Placeholder cards for the W-O-R-K gallery (`soon: true` keeps them out of the project list).
    // Replace each with a real project: title, summary, tags, year, url and image.
    { title: 'Coming soon', soon: true },
    { title: 'Coming soon', soon: true },
    { title: 'Coming soon', soon: true },
    { title: 'Coming soon', soon: true },
    { title: 'Coming soon', soon: true },
  ],

  // Skills as books on a shelf: each book is one group. `blurb` is the line on its detail page.
  // From the tech stack on github.com/Masihh143. Add, remove or regroup freely.
  // The Journey section: one milestone per stop along the line. Keep each to one or two short lines.
  // PLACEHOLDER: an invented story for testing the section; replace with the real one.
  journey: [
    {
      year: '2016',
      title: 'The first spark',
      text: 'Took apart a family PC to see how it worked — and couldn’t put it back.',
    },
    { year: '2018', title: 'Hello, world', text: 'Wrote a first web page in Notepad. It was ugly. It was mine.' },
    { year: '2020', title: 'Hooked on the web', text: 'Learned JavaScript and React; built small tools for friends.' },
    {
      year: '2022',
      title: 'Going deeper',
      text: 'Backends, databases and APIs — taking ideas all the way to production.',
    },
    { year: '2024', title: 'Motion & craft', text: 'Discovered GSAP and fell for interfaces that move with purpose.' },
    { year: 'Now', title: 'Building what’s next', text: 'Shipping full-stack products and experiments in AI.' },
  ],

  skills: [
    {
      group: 'Languages',
      blurb: 'The ones I think in.',
      items: ['JavaScript', 'TypeScript', 'Python', 'Java', 'HTML5', 'CSS3'],
    },
    {
      group: 'Frontend',
      blurb: 'Interfaces that feel fast and look sharp.',
      items: ['React', 'Next.js', 'Three.js', 'Tailwind CSS', 'Bootstrap', 'Framer', 'Vite'],
    },
    {
      group: 'Backend',
      blurb: 'APIs, real-time and auth behind the scenes.',
      items: ['Node.js', 'Express.js', 'Django', 'FastAPI', 'Socket.io', 'JWT'],
    },
    {
      group: 'Databases',
      blurb: 'Where the data lives.',
      items: ['MongoDB', 'PostgreSQL', 'MySQL', 'Supabase', 'Firebase'],
    },
    {
      group: 'Cloud & DevOps',
      blurb: 'Shipping it and keeping it up.',
      items: ['AWS', 'Cloudflare', 'Vercel', 'Netlify', 'Git', 'GitHub'],
    },
    {
      group: 'AI & Data',
      blurb: 'Models, numbers and vision.',
      items: ['NumPy', 'SciPy', 'scikit-learn', 'Matplotlib', 'OpenCV'],
    },
    { group: 'Apps', blurb: 'Beyond the browser: mobile and desktop.', items: ['Expo', 'Electron'] },
    {
      group: 'Testing & Design',
      blurb: 'Getting it right, then making it beautiful.',
      items: ['Jest', 'Cypress', 'Figma'],
    },
  ],
};
