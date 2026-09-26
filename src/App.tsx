import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  Database,
  Workflow,
  Github,
  Linkedin,
  Mail,
  FileDown,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import {
  capabilities,
  experiences,
  notes,
  pageInfo,
  profile,
  projects,
  type Project,
} from "./content";
import { ThemeToggle } from "./ThemeToggle";
import { HomePortrait } from "./HomePortrait";

const Arrow = () => <ArrowUpRight size={18} aria-hidden="true" />;
function External({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <Arrow />
    </a>
  );
}
function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}
function PageHeading({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <Eyebrow>{label}</Eyebrow>
      <h1>{title}</h1>
      {children && <div className="page-intro">{children}</div>}
    </header>
  );
}
function RouteEffects() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    const info = pageInfo[pathname] || {
      title: "Page not found",
      description: "This page could not be found.",
    };
    document.title =
      pathname === "/" ? info.title : `${info.title} | ${profile.name}`;
    const setMeta = (selector: string, content: string) =>
      document.querySelector(selector)?.setAttribute("content", content);
    setMeta('meta[name="description"]', info.description);
    setMeta('meta[property="og:title"]', document.title);
    setMeta('meta[property="og:description"]', info.description);
    setMeta('meta[property="og:url"]', profile.siteUrl + pathname);
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute("href", profile.siteUrl + pathname);
    if (!first.current) {
      window.scrollTo(0, 0);
      document.getElementById("main")?.focus({ preventScroll: true });
    }
    first.current = false;
  }, [pathname]);
  return null;
}
function Header() {
  const [mobile, setMobile] = useState(false);
  const [contact, setContact] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => {
    setMobile(false);
    setContact(false);
  }, [location.pathname]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setContact(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" aria-label="Imane Benzegunine, home" className="wordmark">
          Imane<span>.</span>
          <span className="wordmark-sub">BENZEGUNINE</span>
        </Link>
        <div className="header-controls">
          <ThemeToggle />
          <button
            className="mobile-toggle icon-button"
            aria-label={mobile ? "Close navigation" : "Open navigation"}
            aria-expanded={mobile}
            aria-controls="primary-nav"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
        <nav
          id="primary-nav"
          aria-label="Main navigation"
          className={mobile ? "nav open" : "nav"}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setMobile(false);
              (
                document.querySelector(".mobile-toggle") as HTMLButtonElement
              )?.focus();
            }
          }}
        >
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/projects">Work</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/experience">Experience</NavLink>
          <NavLink to="/notes">Notes</NavLink>
          <NavLink to="/recruiter" className="recruiter-nav">
            For recruiters <Arrow />
          </NavLink>
          <div
            className="contact-menu"
            ref={wrap}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setContact(false);
                trigger.current?.focus();
              }
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setContact(false);
            }}
          >
            <button
              ref={trigger}
              className="contact-trigger"
              aria-expanded={contact}
              aria-controls="contact-links"
              onClick={() => setContact(!contact)}
            >
              Contact me <ChevronDown size={15} />
            </button>
            {contact && (
              <div id="contact-links" className="dropdown">
                <a
                  href={profile.email ? `mailto:${profile.email}` : "/contact"}
                >
                  <Mail size={17} />
                  Email
                  <Arrow />
                </a>
                <External href={profile.linkedin}>
                  <Linkedin size={17} />
                  LinkedIn
                </External>
                <External href={profile.github}>
                  <Github size={17} />
                  GitHub
                </External>
                <Link to="/contact">
                  Send an inquiry <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <Link to="/" className="footer-name">
            Imane Benzegunine<span>.</span>
          </Link>
          <p>Data engineering. Thoughtfully built.</p>
        </div>
        <div className="footer-links">
          <Link to="/community">Community</Link>
          <Link to="/certifications">Certifications</Link>
          <Link to="/skills">Skills</Link>
          <Link to="/cv">CV</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Imane Benzegunine</span>
        <span>
          Personal portfolio <span className="muted-dot">/</span>{" "}
          <Link to="/privacy">Privacy</Link>
        </span>
        <div>
          <External href={profile.linkedin}>LinkedIn</External>
          <External href={profile.github}>GitHub</External>
        </div>
      </div>
    </footer>
  );
}
function ProjectVisual({ project }: { project: Project }) {
  return (
    <div className={`project-visual ${project.color}`} aria-hidden="true">
      <span className="visual-caption">
        {project.slug === "chronobrain"
          ? "KNOWLEDGE → CONTEXT"
          : project.slug === "servicenow-analytics"
            ? "RAW → REFINED → READY"
            : project.slug === "akkan-crowdfunding"
              ? "ORCHESTRATE → ANALYZE"
              : "DATA → INSIGHT"}
      </span>
      {project.slug === "chronobrain" ? (
        <div className="retrieval-art">
          <div className="doc-stack">
            <i />
            <i />
            <i />
          </div>
          <span className="connector">······</span>
          <div className="retrieval-core">
            <Workflow size={30} />
          </div>
          <span className="connector">······</span>
          <div className="answer-lines">
            <i />
            <i />
            <i />
          </div>
        </div>
      ) : (
        <div className="layer-art">
          {(project.slug === "servicenow-analytics"
            ? ["BRONZE", "SILVER", "GOLD"]
            : project.slug === "akkan-crowdfunding"
              ? ["INGEST", "TRANSFORM", "ANALYZE"]
              : ["COLLECT", "PROCESS", "EXPLORE"]
          ).map((s, i) => (
            <div key={s} className={`layer layer-${i}`}>
              <Database size={19} />
              <span>{s}</span>
              <small>0{i + 1}</small>
            </div>
          ))}
        </div>
      )}
      <span className="visual-foot">
        {project.organization.split(" · ")[0]} <ArrowUpRight size={16} />
      </span>
    </div>
  );
}
function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <article className="project-card">
      <Link className="project-card-link" to={"/projects/" + project.slug}>
        <ProjectVisual project={project} />
        <div className="card-meta">
          <span>
            {String(index + 1).padStart(2, "0")} / {project.category}
          </span>
          <Arrow />
        </div>
        <h3>{project.title}</h3>
        {project.period && (
          <span className="project-dates">{project.period}</span>
        )}
        {project.summary && <p>{project.summary}</p>}
        <div className="tags">
          {project.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <span className="sr-only">Read {project.organization} case study</span>
      </Link>
    </article>
  );
}
function CTA() {
  return (
    <section className="cta">
      <Eyebrow>THE NEXT CONVERSATION</Eyebrow>
      <div>
        <h2>
          Good work starts
          <br />
          with a conversation<span>.</span>
        </h2>
        <Link className="button dark" to="/contact">
          Let’s talk <Arrow />
        </Link>
      </div>
      <p>Have a role in mind, or a data challenge to work through?</p>
    </section>
  );
}
function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <Eyebrow>
            <span className="status-dot" /> DATA ENGINEER · APPLIED AI &
            ANALYTICS
          </Eyebrow>
          <p className="hello">Hello, I’m Imane Benzegunine.</p>
          <h1>
            From raw data
            <br />
            to{" "}
            <em>
              something
              <br className="desktop-break" /> useful.
            </em>
          </h1>
          <p className="hero-description">
            I build data pipelines, analytical platforms, and knowledge systems
            that connect complex data to clear decisions.
          </p>
          <div className="button-row">
            <Link className="button primary" to="/projects">
              Explore my work <ArrowRight size={18} />
            </Link>
            <Link className="text-link" to="/cv">
              View my CV <Arrow />
            </Link>
          </div>
        </div>
        <HomePortrait />
      </section>
      <div className="evidence-strip">
        <span>EXPERIENCE & LEARNING</span>
        <span>Inetum</span>
        <span>Akkan Crowdfunding</span>
        <span>ENSA Berrechid</span>
        <Link to="/certifications">
          <ShieldCheck size={20} /> Microsoft Fabric <Arrow />
        </Link>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <Eyebrow>01 / SELECTED WORK</Eyebrow>
            <h2>Behind the pipelines.</h2>
          </div>
          <Link className="text-link" to="/projects">
            All projects <Arrow />
          </Link>
        </div>
        <div className="project-grid">
          {projects
            .filter((p) => p.featured)
            .map((p, i) => (
              <ProjectCard key={p.slug} project={p} index={i} />
            ))}
        </div>
      </section>
      <section className="approach section">
        <div>
          <Eyebrow>02 / HOW I THINK</Eyebrow>
          <h2>
            The useful part
            <br />
            is the point.
          </h2>
          <p>
            My focus sits where data engineering meets real questions: how to
            organize incident data, make knowledge searchable, or turn
            operational records into reporting.
          </p>
          <Link className="text-link" to="/about">
            A little more about me <Arrow />
          </Link>
        </div>
        <div className="approach-list">
          {capabilities.map((c, i) => (
            <div key={c.title}>
              <span className="step-number">0{i + 1}</span>
              <div>
                <h3>{c.title}</h3>
                <p>{c.description}</p>
              </div>
              <Arrow />
            </div>
          ))}
        </div>
      </section>
      <CTA />
    </>
  );
}
function Projects() {
  const [filter, setFilter] = useState("All work");
  const options = ["All work", "Data engineering", "Applied AI", "Analytics"];
  return (
    <>
      <PageHeading label="SELECTED WORK" title="Ideas, engineered.">
        <p>
          From operational pipelines to applied AI. A closer look at the
          systems, the context, and the work behind them.
        </p>
      </PageHeading>
      <div className="filters" aria-label="Filter projects">
        {options.map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
            <span>
              {f === "All work"
                ? projects.length
                : projects.filter((p) => p.category === f).length}
            </span>
          </button>
        ))}
      </div>
      <div className="project-grid all-projects">
        {projects
          .filter((p) => filter === "All work" || p.category === filter)
          .map((p, i) => (
            <ProjectCard key={p.slug} project={p} index={i} />
          ))}
      </div>
      <CTA />
    </>
  );
}
function CaseStudy() {
  const { slug } = useParams();
  const p = projects.find((project) => project.slug === slug);
  if (!p) return <NotFound />;
  const hasDescription =
    p.description.paragraphs.length > 0 ||
    Boolean(p.description.bullets?.length);
  return (
    <div lang={p.language}>
      <Link className="back-link" to="/projects">
        ← All projects
      </Link>
      <PageHeading label={p.category} title={p.title}>
        <p className="project-context">
          {p.organization}
          {p.period && <> · {p.period}</>}
          {p.location && <> · {p.location}</>}
        </p>
      </PageHeading>
      <div className="case-facts">
        {p.role && (
          <div>
            <Eyebrow>{p.language === "fr" ? "RÔLE" : "ROLE"}</Eyebrow>
            <strong>{p.role}</strong>
          </div>
        )}
        <div>
          <Eyebrow>{p.language === "fr" ? "TECHNOLOGIES" : "TOOLS"}</Eyebrow>
          <strong>{p.tags.join(" · ")}</strong>
        </div>
        {p.collaborators && (
          <div>
            <Eyebrow>CONTRIBUTORS</Eyebrow>
            <strong>{p.collaborators}</strong>
          </div>
        )}
      </div>
      <div className="case-layout">
        <aside>
          <span className="eyebrow">IN THIS PROJECT</span>
          {hasDescription && <a href="#project-description">Description</a>}
          {p.flow && (
            <a href="#project-flow">
              {p.language === "fr" ? "Flux de données" : "Data flow"}
            </a>
          )}
          {p.links.length > 0 && <a href="#project-links">Project links</a>}
        </aside>
        <article className="case-body">
          {hasDescription && (
            <section id="project-description" className="source-description">
              <Eyebrow>PROJECT DESCRIPTION</Eyebrow>
              {p.description.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {p.description.heading && <h2>{p.description.heading}</h2>}
              {p.description.introduction && (
                <p>{p.description.introduction}</p>
              )}
              {p.description.bullets && (
                <ul className="detail-list">
                  {p.description.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
              {p.description.closing && <p>{p.description.closing}</p>}
            </section>
          )}
          {p.flow && (
            <section id="project-flow">
              <Eyebrow>DATA FLOW</Eyebrow>
              <h2>
                {p.language === "fr"
                  ? "Le parcours des données."
                  : "A view of the system."}
              </h2>
              <figure className="flow-figure">
                <ol>
                  {p.flow.map((step, i) => (
                    <li key={step}>
                      <span>0{i + 1}</span>
                      <strong>{step}</strong>
                      {i < p.flow!.length - 1 && (
                        <ArrowRight size={18} aria-hidden="true" />
                      )}
                    </li>
                  ))}
                </ol>
                <figcaption>
                  {p.language === "fr"
                    ? "Schéma simplifié à partir de la description du projet."
                    : "Simplified diagram based on the project description."}
                </figcaption>
              </figure>
            </section>
          )}
          {p.links.length > 0 && (
            <section id="project-links">
              <Eyebrow>EXPLORE THE PROJECT</Eyebrow>
              <div className="project-links">
                {p.links.map((link) => (
                  <External
                    key={link.href}
                    href={link.href}
                    className="text-link"
                  >
                    {link.label}
                  </External>
                ))}
              </div>
            </section>
          )}
          {!hasDescription && p.collaborators && (
            <section>
              <Eyebrow>TEAM PROJECT</Eyebrow>
              <h2>{p.title}</h2>
              <p>Contributors: {p.collaborators}</p>
              <div className="tags">
                {p.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
      <CTA />
    </div>
  );
}
function About() {
  return (
    <>
      <PageHeading
        label="ABOUT ME"
        title="Curious about the data. Intentional about the work."
      >
        <p>
          I’m Imane, a Data Engineer with additional strengths in applied AI and
          analytics.
        </p>
      </PageHeading>
      <div className="about-grid">
        <div className="initial-card" aria-label="Imane Benzegunine monogram">
          <span>ENGINEERING / WITH INTENTION</span>
          <strong>
            ib<span>.</span>
          </strong>
          <p>Data → Structure → Understanding</p>
        </div>
        <div className="prose">
          <h2>Connecting the pieces.</h2>
          <p>
            My work brings together data pipelines, analytical models, and
            knowledge retrieval. At Inetum, that includes ServiceNow incident
            analytics and ChronoBrain. At Akkan Crowdfunding, the focus is the
            path from operational data to reporting.
          </p>
          <p>
            I’m interested in the full journey: how data arrives, how it is
            shaped, and how someone can make use of it.
          </p>
          <h3>Education</h3>
          <p>ENSA Berrechid</p>
          <p className="muted">
            Degree title, specialization, and graduation dates will be added
            after the CV is verified.
          </p>
          <Link className="text-link" to="/experience">
            Explore my experience <Arrow />
          </Link>
        </div>
      </div>
      <div className="section-heading section">
        <div>
          <Eyebrow>BEYOND INDIVIDUAL WORK</Eyebrow>
          <h2>Learning happens together.</h2>
        </div>
        <Link className="text-link" to="/community">
          Leadership & community <Arrow />
        </Link>
      </div>
      <CTA />
    </>
  );
}
function Experience() {
  return (
    <>
      <PageHeading label="EXPERIENCE" title="Learning through building.">
        <p>
          Data engineering, analytical systems, and applied AI in professional
          settings.
        </p>
      </PageHeading>
      <div className="timeline">
        {experiences.map((e, i) => (
          <article key={e.company} lang={e.language}>
            <div className="timeline-date">
              <span>0{i + 1}</span>
              <p>{e.period}</p>
            </div>
            <div>
              <h2>{e.title}</h2>
              <p className="experience-context">
                {e.company} <span aria-hidden="true">·</span> {e.location}
              </p>
              <ul className="detail-list experience-contributions">
                {e.contributions.map((contribution) => (
                  <li key={contribution}>{contribution}</li>
                ))}
              </ul>
              <p className="experience-technologies">
                <strong>Technologies{e.language === "fr" ? " :" : ":"}</strong>{" "}
                {e.technologies.join(", ")}
              </p>
              <div
                className="experience-links"
                aria-label="Projects from this role"
              >
                {e.projects.map((slug) => (
                  <Link key={slug} to={"/projects/" + slug}>
                    {projects.find((p) => p.slug === slug)?.title}
                    <Arrow />
                  </Link>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
      <CTA />
    </>
  );
}
function Recruiter() {
  return (
    <>
      <PageHeading
        label="THE RECRUITER QUICK VIEW"
        title="The relevant details. In one place."
      >
        <p>
          Imane Benzegunine · Data Engineer
          <br />
          Applied AI and analytics as complementary strengths.
        </p>
      </PageHeading>
      <div className="button-row">
        <Link className="button primary" to="/contact">
          Discuss a role <Arrow />
        </Link>
        <Link className="button outline" to="/cv">
          View CV <FileDown size={17} />
        </Link>
      </div>
      <dl className="quick-facts">
        <div>
          <dt>Primary focus</dt>
          <dd>Data Engineering</dd>
        </div>
        <div>
          <dt>Education</dt>
          <dd>ENSA Berrechid</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{profile.location || "Please contact me to confirm"}</dd>
        </div>
        <div>
          <dt>Work preferences</dt>
          <dd>{profile.workPreference || "To discuss"}</dd>
        </div>
        <div>
          <dt>Availability</dt>
          <dd>
            {profile.availability || "Please ask for current availability"}
          </dd>
        </div>
      </dl>
      <SkillsContent />
      <section className="section">
        <Eyebrow>FEATURED EVIDENCE</Eyebrow>
        <h2>Start with these projects.</h2>
        <div className="project-grid">
          {projects
            .filter((p) => p.featured)
            .map((p, i) => (
              <ProjectCard key={p.slug} project={p} index={i} />
            ))}
        </div>
      </section>
      <Link className="text-link" to="/experience">
        Full experience <Arrow />
      </Link>
      <CTA />
    </>
  );
}
function SkillsContent() {
  return (
    <div className="capabilities">
      {capabilities.map((c, i) => (
        <article key={c.title}>
          <span className="step-number">0{i + 1}</span>
          <h2>{c.title}</h2>
          <p>{c.description}</p>
          <div className="tags">
            {c.tools.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <Link className="text-link" to={"/projects/" + c.evidence}>
            See project context <Arrow />
          </Link>
        </article>
      ))}
    </div>
  );
}
function Skills() {
  return (
    <>
      <PageHeading label="CAPABILITIES" title="Tools, with a purpose.">
        <p>
          Grouped by the work they support. Each capability connects to a
          project, so there’s context behind the technology.
        </p>
      </PageHeading>
      <SkillsContent />
      <CTA />
    </>
  );
}
function Community() {
  return (
    <>
      <PageHeading
        label="LEADERSHIP & COMMUNITY"
        title="Better when we build together."
      >
        <p>
          Sharing the work, learning with peers, and helping ideas become
          projects.
        </p>
      </PageHeading>
      <div className="community-list">
        <article>
          <Eyebrow>01 / GOOGLE DEVELOPER CLUB ENSA</Eyebrow>
          <h2>Discover the cloud with GCP.</h2>
          <img
            className="community-image"
            src="/images/gdg-cloud-workshop.jpg"
            alt="Discover the Cloud with GCP workshop poster featuring Imane Benzegunine, organized by Google Developer Groups on Campus ENSA Berrechid on 13 March 2025."
            width={640}
            height={800}
            loading="lazy"
            decoding="async"
          />
          <p>
            My “Discover the Cloud with GCP” workshop with Google Developer
            Groups on Campus ENSA Berrechid, held online via Google Meet on 13
            March 2025.
          </p>
        </article>
        <article>
          <Eyebrow>02 / DEVMINDS MOROCCO</Eyebrow>
          <h2>Leading the AI track.</h2>
          <img
            className="community-image"
            src="/images/devminds-community.jpg"
            alt="DevMinds Morocco for Women community poster: She codes, she builds, she leads."
            width={639}
            height={800}
            loading="lazy"
            decoding="async"
          />
          <p>
            Imane’s public announcement describes leading an eight-week AI track
            for Cohort 1, helping a team take an AI project from concept toward
            deployment. A community sprint recap credits her with guiding the AI
            team.
          </p>
          <p className="muted">
            Individual mentoring activities, project deliverables, and outcomes
            still need to be confirmed.
          </p>
        </article>
      </div>
      <CTA />
    </>
  );
}
function Certifications() {
  return (
    <>
      <PageHeading label="CERTIFICATIONS" title="A foundation to build on.">
        <p>Professional learning connected to hands-on engineering.</p>
      </PageHeading>
      <article className="cert-feature">
        <div className="cert-symbol">
          <ShieldCheck size={56} />
        </div>
        <div>
          <Eyebrow>MICROSOFT CERTIFIED</Eyebrow>
          <h2>
            Fabric Data Engineer
            <br />
            Associate
          </h2>
          <p>Microsoft · Credential identified in the supplied brief.</p>
          <p className="muted">
            Issue date and personal verification link pending.
          </p>
          <Link to="/projects/servicenow-analytics" className="text-link">
            Explore the Fabric project <Arrow />
          </Link>
        </div>
      </article>
      <div className="section prose">
        <h2>Further learning</h2>
        <p>
          The indexed LinkedIn profile also lists Google Cloud Computing
          Foundations: Cloud Computing Fundamentals (Google Cloud Skills Boost,
          October 2024) and Facial Expression Recognition with PyTorch
          (Coursera, September 2024).
        </p>
        <p className="muted">
          These are listed as learning credentials. Direct verification links
          and the complete CV certification list are awaiting review.
        </p>
        <External href={profile.linkedin} className="text-link">
          View LinkedIn profile
        </External>
      </div>
    </>
  );
}
function Notes() {
  const published = notes.filter((n) => n.published);
  return (
    <>
      <PageHeading label="ENGINEERING NOTES" title="From the workbench.">
        <p>
          A place for short technical articles, practical observations, and
          things learned while building.
        </p>
      </PageHeading>
      {published.length ? (
        <div className="notes-list">
          {published.map((n) => (
            <Link to={"/notes/" + n.slug} key={n.slug}>
              <time>{n.date}</time>
              <h2>{n.title}</h2>
              <p>{n.summary}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <BookOpen size={32} />
          <h2>Room for the next idea.</h2>
          <p>
            No notes published yet. In the meantime, explore the project case
            studies.
          </p>
          <Link className="text-link" to="/projects">
            Explore the work <Arrow />
          </Link>
        </div>
      )}
    </>
  );
}
function NotePage() {
  const { slug } = useParams();
  const note = notes.find((n) => n.slug === slug && n.published);
  return note ? (
    <>
      <PageHeading label={note.date} title={note.title}>
        <p>{note.summary}</p>
      </PageHeading>
      <article className="prose">
        {note.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </article>
    </>
  ) : (
    <NotFound />
  );
}
function CV() {
  return (
    <>
      <PageHeading label="CURRICULUM VITAE" title="The full picture.">
        <p>
          Experience, education, and technical capabilities in one document.
        </p>
      </PageHeading>
      <div className="cv-panel">
        <FileDown size={44} />
        <h2>Imane Benzegunine</h2>
        <p>Data Engineer · Applied AI & analytics</p>
        {profile.cvAvailable ? (
          <div className="button-row">
            <a
              className="button primary"
              href={profile.cvPath}
              target="_blank"
              rel="noopener noreferrer"
            >
              View CV <Arrow />
            </a>
            <a className="button outline" href={profile.cvPath} download>
              Download PDF <FileDown size={18} />
            </a>
          </div>
        ) : (
          <>
            <div className="review-note">
              <p>The approved CV PDF is not available yet.</p>
            </div>
            <Link className="button primary" to="/contact">
              Request my CV <Arrow />
            </Link>
          </>
        )}
      </div>
    </>
  );
}
type ContactConfig = { mode: "local" | "smtp"; retentionDays: number };
function Contact() {
  const [kind, setKind] = useState("hiring");
  const [config, setConfig] = useState<ContactConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const started = useRef(Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setConfig)
      .catch(() => setConfigError(true));
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const next: Record<string, string> = {};
    if (String(data.name || "").trim().length < 2)
      next.name = "Enter your name (at least 2 characters).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email || "")))
      next.email = "Enter a valid email address.";
    if (String(data.message || "").trim().length < 20)
      next.message = "Please write at least 20 characters.";
    for (const [key, max] of Object.entries({
      name: 100,
      email: 254,
      message: 5000,
      phone: 40,
      projectType: 100,
      timeline: 100,
      projectLink: 500,
    }))
      if (String(data[key] || "").length > max)
        next[key] = `Use ${max} characters or fewer.`;
    if (data.projectLink) {
      try {
        const url = new URL(String(data.projectLink));
        if (!["http:", "https:"].includes(url.protocol)) throw Error();
      } catch {
        next.projectLink = "Use a complete http or https link.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length) {
      form
        .querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)
        ?.focus();
      return;
    }
    setStatus("loading");
    setFeedback("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, kind, startedAt: started.current }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.errors) setErrors(result.errors);
        throw new Error(
          result.message ||
            "Your message could not be accepted. Please try again.",
        );
      }
      setStatus("success");
      setFeedback(result.message);
      form.reset();
      started.current = Date.now();
    } catch (error) {
      setStatus("error");
      setFeedback(
        error instanceof Error
          ? error.message
          : "Connection failed. Please try again.",
      );
    }
  }
  function field(
    name: string,
    label: string,
    options: {
      required?: boolean;
      type?: string;
      max?: number;
      placeholder?: string;
    } = {},
  ) {
    return (
      <div className="form-field">
        <label htmlFor={name}>
          {label}
          {options.required ? (
            <span aria-hidden="true"> *</span>
          ) : (
            <span className="optional"> (optional)</span>
          )}
        </label>
        <input
          id={name}
          name={name}
          type={options.type || "text"}
          required={options.required}
          maxLength={options.max || 100}
          placeholder={options.placeholder}
          autoComplete={
            name === "name"
              ? "name"
              : name === "email"
                ? "email"
                : name === "phone"
                  ? "tel"
                  : "off"
          }
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? name + "-error" : undefined}
        />
        {errors[name] && (
          <span id={name + "-error"} className="field-error">
            {errors[name]}
          </span>
        )}
      </div>
    );
  }
  return (
    <>
      <PageHeading label="CONTACT" title="Let’s make something useful.">
        <p>
          A hiring opportunity, a project idea, or a good technical
          conversation. I’d like to hear about it.
        </p>
      </PageHeading>
      <div className="contact-layout">
        <aside>
          <h2>Start a conversation.</h2>
          <p>Share a little context about what you have in mind.</p>
          <div className="contact-options">
            {profile.email ? (
              <a href={"mailto:" + profile.email}>
                <Mail size={21} />
                <span>
                  Email<strong>{profile.email}</strong>
                </span>
                <Arrow />
              </a>
            ) : (
              <div>
                <Mail size={21} />
                <span>
                  Email<strong>Address awaiting confirmation</strong>
                </span>
              </div>
            )}
            <External href={profile.linkedin}>
              <Linkedin size={21} />
              <span>
                LinkedIn<strong>Imane Benzegunine</strong>
              </span>
            </External>
            <External href={profile.github}>
              <Github size={21} />
              <span>
                GitHub<strong>ImaneBenzegunine</strong>
              </span>
            </External>
          </div>
          <p className="contact-note">
            Please keep confidential documents and sensitive personal
            information out of your inquiry.
          </p>
        </aside>
        <form
          ref={formRef}
          className="contact-form"
          onSubmit={submit}
          noValidate
        >
          <fieldset>
            <legend>What brings you here?</legend>
            <div className="inquiry-types">
              {[
                ["hiring", "Hiring opportunity"],
                ["collaboration", "Project collaboration"],
              ].map(([value, label]) => (
                <label className={kind === value ? "selected" : ""} key={value}>
                  <input
                    type="radio"
                    name="kind"
                    value={value}
                    checked={kind === value}
                    onChange={() => setKind(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="required-note">Fields marked * are required.</p>
          <div className="form-row">
            {field("name", "Your name", {
              required: true,
              max: 100,
              placeholder: "Your name",
            })}
            {field("email", "Email address", {
              required: true,
              type: "email",
              max: 254,
              placeholder: "you@example.com",
            })}
          </div>
          {field("phone", "Phone number", { type: "tel", max: 40 })}
          {kind === "collaboration" && (
            <div className="collaboration-fields">
              <div className="form-row">
                {field("projectType", "Project type", {
                  placeholder: "e.g. Data pipeline",
                })}
                {field("timeline", "Timeline", {
                  placeholder: "e.g. Exploring options",
                })}
              </div>
              {field("projectLink", "Project link", {
                type: "url",
                max: 500,
                placeholder: "https://",
              })}
            </div>
          )}
          <div className="form-field">
            <label htmlFor="message">
              Your message <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              required
              minLength={20}
              maxLength={5000}
              placeholder="Tell me about the role or project you have in mind…"
              aria-invalid={!!errors.message}
              aria-describedby={
                errors.message ? "message-error" : "message-hint"
              }
            />
            {errors.message ? (
              <span id="message-error" className="field-error">
                {errors.message}
              </span>
            ) : (
              <span id="message-hint" className="input-hint">
                20–5,000 characters
              </span>
            )}
          </div>
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="website">Leave this empty</label>
            <input
              tabIndex={-1}
              autoComplete="off"
              id="website"
              name="website"
            />
          </div>
          {config?.mode === "local" && (
            <div className="mode-notice">
              <strong>Local test mode</strong>
              <p>
                No email will be sent. Use synthetic details only; test
                inquiries are stored on this machine for up to{" "}
                {config.retentionDays} days.
              </p>
            </div>
          )}
          {configError && (
            <p role="alert" className="field-error">
              The form is temporarily unavailable. Please use LinkedIn to
              connect.
            </p>
          )}
          <p className="privacy-notice">
            Your details are used to respond to this inquiry.{" "}
            {config?.mode === "smtp" &&
              `Undelivered messages are retained for up to ${config.retentionDays} days; delivered messages are removed from this server. `}
            <Link to="/privacy">Read the privacy notice</Link>.
          </p>
          <button
            disabled={status === "loading" || !config}
            className="button primary"
            type="submit"
          >
            {status === "loading"
              ? "Submitting…"
              : config?.mode === "local"
                ? "Send test inquiry"
                : "Send inquiry"}
            <Arrow />
          </button>
          <div
            role={status === "error" ? "alert" : "status"}
            aria-live="polite"
            className={"form-feedback " + status}
          >
            {feedback}
          </div>
        </form>
      </div>
    </>
  );
}
function Privacy() {
  return (
    <>
      <PageHeading label="PRIVACY" title="A little context about your data." />
      <div className="prose">
        <h2>Contact inquiries</h2>
        <p>
          The form collects your name, email, message, and any optional fields
          you provide to respond to a hiring or collaboration inquiry. Please do
          not send sensitive personal information.
        </p>
        <h2>Local test mode</h2>
        <p>
          The form clearly identifies local test mode. No email is sent.
          Synthetic test inquiries are held locally for the configured retention
          period, seven days by default.
        </p>
        <h2>Email mode</h2>
        <p>
          When email delivery is configured, messages are queued privately until
          the mail provider accepts them, then removed from the application
          database. Unsent messages expire after the configured retention
          period, shown on the form. SMTP acceptance does not guarantee inbox
          delivery. Mailbox copies follow the owner’s mailbox retention policy,
          which must be finalized before publication.
        </p>
        <h2>Spam protection & storage</h2>
        <p>
          A salted hash of the connection address is retained briefly for rate
          limiting. Raw addresses and form content are not written to
          application logs. There are no advertising cookies or analytics
          trackers. Protected operational backups may retain data until their
          scheduled deletion.
        </p>
        <h2>Appearance preference</h2>
        <p>
          Your light or dark mode choice is saved in your browser so the site
          remembers it on your next visit. This preference stays on your device
          and is not sent with contact inquiries.
        </p>
        <h2>Deletion requests</h2>
        <p>
          Contact Imane through{" "}
          <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          {profile.email && (
            <>
              {" "}
              or <a href={"mailto:" + profile.email}>email</a>
            </>
          )}{" "}
          to request deletion. The final email provider, mailbox policy, and
          backup retention must be confirmed before this site is published.
        </p>
      </div>
    </>
  );
}
function NotFound() {
  return (
    <>
      <PageHeading label="404 / A DIFFERENT PATH" title="This page isn’t here.">
        <p>The link may have changed. There’s plenty of work to explore.</p>
      </PageHeading>
      <Link className="button primary" to="/">
        Back to home <ArrowRight size={18} />
      </Link>
    </>
  );
}
export function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <RouteEffects />
      <Header />
      <main id="main" className="container" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<CaseStudy />} />
          <Route path="/about" element={<About />} />
          <Route path="/experience" element={<Experience />} />
          <Route path="/recruiter" element={<Recruiter />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/community" element={<Community />} />
          <Route path="/certifications" element={<Certifications />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/:slug" element={<NotePage />} />
          <Route path="/cv" element={<CV />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
