import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { getCategoryBySlug, SUPPORT_CATEGORIES } from "@/lib/support-content";
import SupportContactForm from "./ContactForm";
import logoImage from "@assets/Live_(1500_x_500_px)_(2)_1780520244305.png";

export default function SupportCategory() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const category = getCategoryBySlug(slug);
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  // Open article from URL hash on load
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setOpenSlug(hash);
      // Scroll to it after a short delay to let layout settle
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, []);

  if (!category) {
    return (
      <div className="support-root" style={{ fontFamily: "'Poppins', sans-serif", background: "#030a14", minHeight: "100vh", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🤷</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Category not found</div>
        <Link href="/support" style={{ color: "#34d399", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>← Back to support home</Link>
      </div>
    );
  }

  const toggle = (slug: string) => setOpenSlug(prev => (prev === slug ? null : slug));

  return (
    <div className="support-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
        .support-root {
          font-family: 'Poppins', sans-serif;
          background: #030a14;
          min-height: 100vh;
          color: white;
        }
        .support-nav {
          padding: 14px 48px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: sticky; top: 0; z-index: 50;
          background: rgba(3,10,20,0.95); backdrop-filter: blur(12px);
        }
        .support-nav-logo { height: 30px; object-fit: contain; }
        .support-back-link {
          font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5);
          text-decoration: none; display: flex; align-items: center; gap: 6px;
          transition: color 0.15s;
        }
        .support-back-link:hover { color: #34d399; }
        .support-breadcrumb {
          max-width: 720px; margin: 0 auto; padding: 20px 48px 0;
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: rgba(255,255,255,0.35);
        }
        .support-breadcrumb a { color: rgba(255,255,255,0.35); text-decoration: none; transition: color 0.15s; }
        .support-breadcrumb a:hover { color: #34d399; }
        .support-breadcrumb-sep { opacity: 0.3; }
        .support-category-header {
          max-width: 720px; margin: 0 auto; padding: 28px 48px 40px;
        }
        .support-category-icon { font-size: 36px; margin-bottom: 12px; }
        .support-category-title { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 8px; }
        .support-category-desc { font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.6; }
        .support-articles {
          max-width: 720px; margin: 0 auto; padding: 0 48px 64px;
        }
        .support-accordion {
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; margin-bottom: 10px;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .support-accordion.open { border-color: rgba(52,211,153,0.25); }
        .support-accordion-trigger {
          width: 100%; background: rgba(255,255,255,0.025); border: none; cursor: pointer;
          padding: 18px 22px; display: flex; align-items: center; justify-content: space-between;
          gap: 16px; text-align: left; transition: background 0.15s;
        }
        .support-accordion-trigger:hover { background: rgba(255,255,255,0.04); }
        .support-accordion.open .support-accordion-trigger { background: rgba(52,211,153,0.05); }
        .support-accordion-question {
          font-size: 14px; font-weight: 600; color: white; line-height: 1.45; flex: 1;
        }
        .support-accordion-chevron {
          flex-shrink: 0; width: 20px; height: 20px;
          border-radius: 50%; background: rgba(255,255,255,0.05);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; color: rgba(255,255,255,0.4);
          transition: transform 0.2s, background 0.2s, color 0.2s;
        }
        .support-accordion.open .support-accordion-chevron {
          transform: rotate(180deg); background: rgba(52,211,153,0.15); color: #34d399;
        }
        .support-accordion-body {
          padding: 0 22px 20px;
          font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.75;
          background: rgba(52,211,153,0.02);
          border-top: 1px solid rgba(52,211,153,0.1);
          padding-top: 18px;
        }
        .support-other-cats {
          max-width: 720px; margin: 0 auto; padding: 0 48px 64px;
          border-top: 1px solid rgba(255,255,255,0.05); padding-top: 40px;
        }
        .support-other-cats-title {
          font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.35);
          letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px;
        }
        .support-other-cat-link {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5);
          text-decoration: none; padding: 6px 12px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.07); margin: 0 8px 8px 0;
          transition: color 0.15s, border-color 0.15s;
        }
        .support-other-cat-link:hover { color: #34d399; border-color: rgba(52,211,153,0.25); }

        @media (max-width: 768px) {
          .support-nav { padding: 12px 20px; }
          .support-breadcrumb, .support-category-header, .support-articles, .support-other-cats { padding-left: 20px; padding-right: 20px; }
        }
      `}</style>

      {/* Nav */}
      <nav className="support-nav">
        <img src={logoImage} alt="LiveSwell" className="support-nav-logo" />
        <a href="https://liveswell.io" className="support-back-link">← Back to app</a>
      </nav>

      {/* Breadcrumb */}
      <div className="support-breadcrumb">
        <Link href="/support">Support</Link>
        <span className="support-breadcrumb-sep">›</span>
        <span style={{ color: "rgba(255,255,255,0.65)" }}>{category.title}</span>
      </div>

      {/* Category header */}
      <div className="support-category-header">
        <div className="support-category-icon">{category.icon}</div>
        <div className="support-category-title">{category.title}</div>
        <div className="support-category-desc">{category.description}</div>
      </div>

      {/* Accordions */}
      <div className="support-articles">
        {category.articles.map(article => {
          const isOpen = openSlug === article.slug;
          return (
            <div
              key={article.slug}
              id={article.slug}
              className={`support-accordion${isOpen ? " open" : ""}`}
            >
              <button
                className="support-accordion-trigger"
                onClick={() => toggle(article.slug)}
                aria-expanded={isOpen}
              >
                <span className="support-accordion-question">{article.question}</span>
                <span className="support-accordion-chevron">▾</span>
              </button>
              {isOpen && (
                <div className="support-accordion-body">
                  {article.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Other categories */}
      <div className="support-other-cats">
        <div className="support-other-cats-title">Other categories</div>
        {SUPPORT_CATEGORIES.filter(c => c.slug !== slug).map(c => (
          <Link key={c.slug} href={`/support/category/${c.slug}`} className="support-other-cat-link">
            {c.icon} {c.title}
          </Link>
        ))}
      </div>

      <SupportContactForm />
    </div>
  );
}
