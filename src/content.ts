import { projects } from "./work";
// Editorial source: the owner's brief (2026-09-26), with linked public evidence.
// Unknown details are deliberately null. Resolve CONTENT_REVIEW.md before publication.
export const profile = {
  name: "Imane Benzegunine",
  // Place the supplied photo in public/images, then set src to /images/filename.
  portrait: {
    src: "/images/imane-profile.png",
    alt: "Portrait of Imane Benzegunine",
    position: "50% 100%",
  },
  role: "Data Engineer",
  email: import.meta.env.VITE_PUBLIC_EMAIL || "",
  siteUrl: import.meta.env.VITE_SITE_URL || "https://imanbenzegunine.com",
  cvAvailable: import.meta.env.VITE_CV_AVAILABLE === "true",
  cvPath: "/cv/Imane-Benzegunine-CV.pdf",
  linkedin: "https://www.linkedin.com/in/imane-benzegunine/",
  github: "https://github.com/ImaneBenzegunine",
  location: null as string | null,
  availability: null as string | null,
  workPreference: null as string | null,
};
export { projects, experiences } from "./work";
export type { Project } from "./work";
export const capabilities = [
  {
    title: "Build the data foundation",
    description: "Ingestion, transformation, and orchestration.",
    tools: ["Python", "SQL", "PySpark", "Airflow", "Microsoft Fabric"],
    evidence: "servicenow-analytics",
  },
  {
    title: "Make data useful",
    description: "Analytical storage, modeling, and reporting.",
    tools: ["ClickHouse", "SQL Server", "PostgreSQL", "Power BI", "DAX"],
    evidence: "akkan-crowdfunding",
  },
  {
    title: "Connect knowledge to AI",
    description: "Prepared knowledge, retrieval, and LLM integration.",
    tools: ["LlamaIndex", "FAISS", "BM25", "Embeddings"],
    evidence: "chronobrain",
  },
];
export interface Note {
  slug: string;
  title: string;
  date: string;
  summary: string;
  paragraphs: string[];
  published: boolean;
}
// Add authored, reviewed articles here. Unpublished notes never get routes or sitemap entries.
export const notes: Note[] = [];
export const pageInfo: Record<string, { title: string; description: string }> =
  {
    "/": {
      title: "Imane Benzegunine — Data Engineer",
      description:
        "Data pipelines, analytical platforms, and applied AI. Explore Imane Benzegunine’s selected engineering work.",
    },
    "/projects": {
      title: "Selected projects",
      description:
        "Data engineering, analytics, and applied AI project case studies.",
    },
    "/about": {
      title: "About Imane",
      description:
        "My engineering focus, education at ENSA Berrechid, and approach to data.",
    },
    "/experience": {
      title: "Experience",
      description:
        "Data Engineer AI, Data Engineer, BI Engineer, and ML pipeline internship experience.",
    },
    "/recruiter": {
      title: "Recruiter quick view",
      description:
        "A concise view of capabilities, project evidence, CV, and contact details.",
    },
    "/community": {
      title: "Leadership & community",
      description: "DevMinds AI track leadership and the ENSA cloud community.",
    },
    "/certifications": {
      title: "Certifications",
      description:
        "Microsoft Fabric Data Engineer Associate and professional learning.",
    },
    "/skills": {
      title: "Engineering capabilities",
      description: "Tools grouped by demonstrated project capability.",
    },
    "/notes": {
      title: "Engineering notes",
      description:
        "A space for technical notes from data engineering practice.",
    },
    "/cv": {
      title: "Curriculum vitae",
      description:
        "View and download Imane Benzegunine’s CV when the approved PDF is available.",
    },
    "/contact": {
      title: "Let’s talk",
      description:
        "Connect with Imane about a hiring opportunity or a project collaboration.",
    },
    "/privacy": {
      title: "Contact privacy",
      description: "How contact details and inquiry messages are handled.",
    },
  };
projects.forEach((p) => {
  pageInfo["/projects/" + p.slug] = {
    title: p.title + " — project",
    description: p.summary,
  };
});
notes
  .filter((n) => n.published)
  .forEach((n) => {
    pageInfo["/notes/" + n.slug] = { title: n.title, description: n.summary };
  });
