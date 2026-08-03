import { useState, useMemo } from "react";
import { Link } from "wouter";
import { SUPPORT_CATEGORIES, getAllArticles } from "@/lib/support-content";
import SupportContactForm from "./ContactForm";
import logoImage from "@assets/Live_(1500_x_500_px)_(2)_1780520244305.png";

export default function SupportHome() {
  const [query, setQuery] = useState("");

  const allArticles = useMemo(() => getAllArticles(), []);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return allArticles.filter(
      a =>
        a.question.toLowerCase().includes(q) ||
        a.answer.toLowerCase().includes(q)
    );
  }, [query, allArticles]);

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
        .support-hero {
          padding: 56px 48px 48px;
          max-width: 800px; margin: 0 auto; text-align: center;
        }
        .support-hero h1 { font-size: 38px; font-weight: 900; letter-spacing: -0.8px; margin: 0 0 12px; }
        .support-hero p { font-size: 16px; color: rgba(255,255,255,0.45); margin: 0 0 32px; line-height: 1.6; }
        .support-search {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 14px 20px; max-width: 560px; margin: 0 auto;
          transition: border-color 0.2s;
        }
        .support-search:focus-within { border-color: rgba(52,211,153,0.4); }
        .support-search input {
          flex: 1; background: transparent; border: none; outline: none;
          color: white; font-family: inherit; font-size: 15px;
        }
        .support-search input::placeholder { color: rgba(255,255,255,0.3); }

        .support-categories {
          max-width: 1000px; margin: 0 auto; padding: 8px 48px 64px;
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
        }
        .support-cat-card {
          background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 28px 24px; text-decoration: none; color: white;
          transition: border-color 0.2s, background 0.2s; display: block;
        }
        .support-cat-card:hover { border-color: rgba(52,211,153,0.3); background: rgba(52,211,153,0.04); }
        .support-cat-icon { font-size: 28px; margin-bottom: 14px; }
        .support-cat-title { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
        .support-cat-desc { font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.5; margin-bottom: 14px; }
        .support-cat-count { font-size: 11px; font-weight: 600; color: #34d399; }

        .support-search-results {
          max-width: 700px; margin: 0 auto; padding: 0 48px 64px;
        }
        .support-search-heading {
          font-size: 13px; color: rgba(255,255,255,0.35); font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 16px;
        }
        .support-result-item {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; padding: 16px 20px; margin-bottom: 10px; text-decoration: none; color: white;
          display: block; transition: border-color 0.15s, background 0.15s;
        }
        .support-result-item:hover { border-color: rgba(52,211,153,0.25); background: rgba(52,211,153,0.03); }
        .support-result-category { font-size: 10px; color: #34d399; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px; }
        .support-result-question { font-size: 14px; font-weight: 600; }
        .support-no-results { text-align: center; color: rgba(255,255,255,0.3); font-size: 14px; padding: 32px 0; }

        @media (max-width: 768px) {
          .support-nav { padding: 12px 20px; }
          .support-hero { padding: 40px 20px 32px; }
          .support-hero h1 { font-size: 28px; }
          .support-categories { grid-template-columns: 1fr; padding: 8px 20px 48px; }
          .support-search-results { padding: 0 20px 48px; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .support-categories { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      {/* Nav */}
      <nav className="support-nav">
        <img src={logoImage} alt="LiveSwell" className="support-nav-logo" />
        <a href="/" className="support-back-link">
          ← Back to app
        </a>
      </nav>

      {/* Hero + Search */}
      <div className="support-hero">
        <h1>How can we help?</h1>
        <p>Find answers about surf conditions, alerts, and your account.</p>
        <div className="support-search">
          <span style={{ fontSize: 18, opacity: 0.4 }}>🔍</span>
          <input
            type="text"
            placeholder="Search help articles…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Search results or category grid */}
      {searchResults !== null ? (
        <div className="support-search-results">
          {searchResults.length === 0 ? (
            <div className="support-no-results">
              No articles match "{query}". Try different keywords or browse a category below.
            </div>
          ) : (
            <>
              <div className="support-search-heading">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{query}"
              </div>
              {searchResults.map(article => (
                <Link
                  key={`${article.categorySlug}-${article.slug}`}
                  href={`/support/category/${article.categorySlug}#${article.slug}`}
                  className="support-result-item"
                >
                  <div className="support-result-category">{article.categoryTitle}</div>
                  <div className="support-result-question">{article.question}</div>
                </Link>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="support-categories">
          {SUPPORT_CATEGORIES.map(cat => (
            <Link key={cat.slug} href={`/support/category/${cat.slug}`} className="support-cat-card">
              <div className="support-cat-icon">{cat.icon}</div>
              <div className="support-cat-title">{cat.title}</div>
              <div className="support-cat-desc">{cat.description}</div>
              <div className="support-cat-count">
                {cat.articles.length} article{cat.articles.length !== 1 ? "s" : ""}
              </div>
            </Link>
          ))}
        </div>
      )}

      <SupportContactForm />
    </div>
  );
}
