export type SimonExperience = {
  company: string;
  title: string;
  start: string; // ISO or human readable
  end: string; // "Present" or date
  highlights: string[];
};

export type SimonProject = {
  name: string;
  description: string;
  tech: string[];
  outcomes?: string[];
  link?: string;
};

export type SimonContextDoc = {
  owner: "Simon Curran";
  summary: string;
  location?: string;
  skills: string[];
  experience: SimonExperience[];
  projects: SimonProject[];
  links?: { label: string; url: string }[];
};

// Seed content: replace with your real professional details
export const SIMON_CONTEXT: SimonContextDoc = {
  owner: "Simon Curran",
  summary:
    "Senior web software engineer focused on modern TypeScript, Three.js visuals, and product-oriented engineering.",
  location: "Brisbane, Australia",
  skills: [
    "TypeScript",
    "React",
    "Node.js",
    "Three.js",
    "Vite",
    "TailwindCSS",
    "Testing (Vitest)",
  ],
  experience: [
    {
      company: "ExampleCorp",
      title: "Senior Software Engineer",
      start: "2021-01",
      end: "Present",
      highlights: [
        "Led front‑end architecture migration to TypeScript and Vite.",
        "Delivered interactive 3D visualizations using Three.js.",
        "Improved test coverage and CI stability across projects.",
      ],
    },
    {
      company: "Startup Labs",
      title: "Full‑Stack Engineer",
      start: "2018-05",
      end: "2020-12",
      highlights: [
        "Built customer‑facing features end‑to‑end (React/Node).",
        "Designed pragmatic REST APIs and data models.",
      ],
    },
  ],
  projects: [
    {
      name: "Portfolio Starfield",
      description:
        "A glassmorphic chat UI layered over a transparent WebGL canvas with a procedural starfield background.",
      tech: ["Three.js", "TypeScript", "Vite", "TailwindCSS"],
      outcomes: [
        "Smooth 60fps on modern devices",
        "Clear layering strategy with transparent renderer",
      ],
    },
  ],
  links: [
    { label: "GitHub", url: "https://github.com/your‑github" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/your‑linkedin" },
  ],
};


