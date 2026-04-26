import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const featureItems = [
  {
    eyebrow: "Live chat",
    title: "Room-first collaboration",
    description: "Spin up focused spaces for projects, classes, or teams and keep every thread in context.",
  },
  {
    eyebrow: "Execution",
    title: "Tasks beside the conversation",
    description: "Track work with lightweight boards so planning and delivery stay in the same flow.",
  },
  {
    eyebrow: "Shared context",
    title: "Resources that stay discoverable",
    description: "Keep links, files, and references tied to the room where they actually matter.",
  },
];

const flowSteps = [
  {
    title: "Join your workspace",
    text: "Sign in, create a room, or enter with a shared code in a couple of clicks.",
  },
  {
    title: "Move the work forward",
    text: "Chat live, pin the important bits, and turn decisions into tasks without leaving the room.",
  },
  {
    title: "Stay aligned",
    text: "Unread indicators, presence, and shared resources keep everyone caught up fast.",
  },
];

const previewMetrics = [
  { label: "Rooms", value: "12" },
  { label: "Live updates", value: "98" },
  { label: "Tasks moved", value: "24" },
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-kicker">WorkspaceOne</p>
          <h1>One calm workspace for chat, tasks, and team momentum.</h1>
          <p className="landing-tagline">
            Built for fast-moving groups who want communication and execution to live in the same place.
          </p>
          <p className="landing-hero-description">
            Create rooms, assign work, share resources, and keep everyone in sync with a cleaner workflow than juggling separate tools.
          </p>

          <div className="landing-cta-row">
            <Link href="/register" className="landing-cta landing-cta-primary">
              Start Free
            </Link>
            <Link href="/login" className="landing-cta landing-cta-secondary">
              Sign In
            </Link>
          </div>

          <div className="landing-proof-row" aria-label="Workspace highlights">
            {previewMetrics.map((item) => (
              <article key={item.label} className="landing-proof-pill">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="landing-hero-visual" aria-label="Workspace preview">
          <div className="hero-window hero-window-main">
            <div className="hero-window-bar">
              <span className="ui-dot" />
              <span className="ui-dot" />
              <span className="ui-dot" />
              <p>Team workspace</p>
            </div>

            <div className="hero-dashboard-grid">
              <aside className="hero-side-panel">
                <div className="hero-side-chip hero-side-chip-active">Product Sprint</div>
                <div className="hero-side-chip">Design Review</div>
                <div className="hero-side-chip">Launch Ops</div>
              </aside>

              <section className="hero-chat-panel">
                <div className="hero-chat-topline">
                  <div>
                    <h3>Design Review</h3>
                    <p>6 members online</p>
                  </div>
                  <div className="hero-status-pill">Live</div>
                </div>

                <div className="hero-chat-stream">
                  <div className="hero-message hero-message-left">
                    <span className="hero-message-name">Anaya</span>
                    <p>Updated the onboarding flow. Ready for review.</p>
                  </div>
                  <div className="hero-message hero-message-right">
                    <span className="hero-message-name">You</span>
                    <p>Pinned. I converted the changes into tasks for the team.</p>
                  </div>
                  <div className="hero-message hero-message-left hero-message-accent">
                    <span className="hero-message-name">Announcement</span>
                    <p>Final review window closes at 5:30 PM.</p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="hero-window hero-window-floating">
            <div className="hero-task-card">
              <span className="hero-task-kicker">In progress</span>
              <strong>Refine room navigation</strong>
              <p>3 subtasks completed today</p>
            </div>
            <div className="hero-mini-chart" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>Why teams stick with it</h2>
          <p>Less bouncing between tools, more clarity inside the work itself.</p>
        </div>
        <div className="landing-feature-grid">
          {featureItems.map((item) => (
            <article key={item.title} className="landing-feature-card">
              <p className="landing-feature-eyebrow">{item.eyebrow}</p>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>How it flows</h2>
          <p>From sign-in to aligned execution in a few natural steps.</p>
        </div>
        <div className="landing-steps" aria-label="Workflow steps">
          {flowSteps.map((step, index) => (
            <article key={step.title} className="landing-step-card">
              <span className="landing-step-number">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-compact">
        <div className="landing-section-head">
          <h2>Everything stays connected</h2>
          <p>Unread updates, pinned messages, tasks, and files all live inside the same room context.</p>
        </div>
        <div className="landing-preview-grid">
          <article className="ui-card ui-card-dashboard" aria-label="Dashboard preview">
            <header>
              <span className="ui-dot" />
              <span className="ui-dot" />
              <span className="ui-dot" />
              <p>Dashboard</p>
            </header>
            <div className="ui-dashboard-layout">
              <div className="ui-panel ui-panel-tall" />
              <div className="ui-panel" />
              <div className="ui-panel" />
              <div className="ui-panel ui-panel-wide" />
            </div>
          </article>

          <article className="ui-card ui-card-chat" aria-label="Chat interface preview">
            <header>
              <span className="ui-dot" />
              <span className="ui-dot" />
              <span className="ui-dot" />
              <p>Live Chat</p>
            </header>
            <div className="ui-chat-bubbles">
              <span className="bubble left" />
              <span className="bubble right" />
              <span className="bubble left accent" />
              <span className="bubble right" />
            </div>
          </article>

          <article className="ui-card ui-card-task" aria-label="Task board preview">
            <header>
              <span className="ui-dot" />
              <span className="ui-dot" />
              <span className="ui-dot" />
              <p>Task Board</p>
            </header>
            <div className="ui-task-layout">
              <div className="task-col">
                <span />
                <span />
              </div>
              <div className="task-col">
                <span />
                <span />
                <span />
              </div>
              <div className="task-col">
                <span />
              </div>
            </div>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <p>Designed for modern team coordination without the usual visual noise.</p>
        <nav aria-label="Footer links">
          <a href="https://github.com/" target="_blank" rel="noreferrer">
            GitHub Repository
          </a>
          <a href="mailto:hello@chatworkspace.app">Contact</a>
          <a href="https://github.com/#readme" target="_blank" rel="noreferrer">
            Project Details
          </a>
        </nav>
      </footer>
    </main>
  );
}
