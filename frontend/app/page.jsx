import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const featureItems = [
  {
    title: "Room-Based Collaboration",
    description:
      "Create focused spaces for each project, class, or team and keep conversations organized.",
  },
  {
    title: "Real-Time Messaging",
    description:
      "Exchange updates instantly with live delivery, replies, pinned messages, and announcements.",
  },
  {
    title: "Task Tracking Board",
    description:
      "Manage work with Trello-style task cards and move progress from pending to complete.",
  },
  {
    title: "Resource Sharing",
    description:
      "Share links, files, and useful references in one room-level resource hub.",
  },
  {
    title: "Live Member Presence",
    description:
      "See who is online in each room and collaborate with better timing.",
  },
];

const flowSteps = [
  {
    title: "Login",
    text: "Sign in securely with your account to access your workspace.",
  },
  {
    title: "Create/Join Room",
    text: "Start a new room or enter with a room code to connect with your team.",
  },
  {
    title: "Collaborate",
    text: "Chat, assign tasks, and share resources in real time from one place.",
  },
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="landing-page">
      <section className="landing-hero">
        <p className="landing-kicker">Chat Application</p>
        <h1>The Unified Workspace for Team Collaboration.</h1>
        <p className="landing-tagline">
          Organize communication, manage tasks, and share resources in one
          platform.
        </p>
        <p className="landing-hero-description">
          WorkspaceOne brings room-based chat, task management, file sharing,
          and member presence into a single platform designed for structured
          team collaboration.
        </p>

        <div className="landing-cta-row">
          <Link href="/register" className="landing-cta landing-cta-primary">
            Get Started
          </Link>
          <Link href="/login" className="landing-cta landing-cta-secondary">
            Sign In
          </Link>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>Feature Overview</h2>
          <p>Everything teams need to communicate, plan, and execute.</p>
        </div>
        <div className="landing-feature-grid">
          {featureItems.map((item) => (
            <article key={item.title} className="landing-feature-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>How It Works</h2>
          <p>From sign-in to team delivery in three simple steps.</p>
        </div>
        <div className="landing-steps" aria-label="Workflow steps">
          {flowSteps.map((step, index) => (
            <article key={step.title} className="landing-step-card">
              <span className="landing-step-number">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              {index !== flowSteps.length - 1 ? (
                <span className="landing-step-arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>UI Preview</h2>
          <p>A quick look at the dashboard, chat view, and task board.</p>
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
              <div className="ui-panel" />
              <div className="ui-panel" />
              <div className="ui-panel" />
              <div className="ui-panel" />
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
              <span className="bubble left" />
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
        <p>Built for modern team communication and coordination.</p>
        <nav aria-label="Footer links">
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
          >
            GitHub Repository
          </a>
          <a href="mailto:hello@chatworkspace.app">Contact</a>
          <a
            href="https://github.com/#readme"
            target="_blank"
            rel="noreferrer"
          >
            Project Details
          </a>
        </nav>
      </footer>
    </main>
  );
}