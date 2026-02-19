/**
 * Build-time blog generator
 * Converts content/blog/*.md → dist/blog/<slug>/index.html
 * Generates blog index at dist/blog/index.html
 */

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { marked } from 'marked';

const CONTENT_DIR = 'content/blog';
const OUTPUT_DIR = 'dist/blog';
const SITE_URL = 'https://statpilot.mom';

// Parse YAML-like frontmatter between --- delimiters
function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const meta = {};
  for (const line of match[1].split('\n')) {
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let val = line.slice(sep + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Parse arrays like ["a", "b"]
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    }
    meta[key] = val;
  }
  return { meta, content: match[2] };
}

// Format date as "February 18, 2026"
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Estimate reading time
function readingTime(text) {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 250));
}

// HTML template for a single blog post (matches privacy.html design)
function postTemplate(meta, htmlContent) {
  const title = `${meta.title} — StatPilot`;
  const description = meta.description || '';
  const canonical = `${SITE_URL}/blog/${meta.slug}/`;
  const date = formatDate(meta.date);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonical}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${meta.title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="StatPilot" />
  <meta property="article:published_time" content="${meta.date}" />
  <meta property="article:author" content="${meta.author || 'Marc'}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${meta.title}" />
  <meta name="twitter:description" content="${description}" />

  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      min-height: 100vh;
      background: #0f172a;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      line-height: 1.75;
    }

    .container {
      max-width: 680px;
      margin: 0 auto;
      padding: 3rem 1.5rem 5rem;
    }

    /* Back link */
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      color: #94a3b8;
      font-size: 0.875rem;
      text-decoration: none;
      margin-bottom: 2.5rem;
      transition: color 0.15s;
    }
    .back-link:hover { color: #f8fafc; }
    .back-link svg { flex-shrink: 0; }

    /* Header */
    .header {
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #6366f1;
      margin-bottom: 1rem;
      text-decoration: none;
    }
    .brand-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6366f1;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 0.375rem;
      line-height: 1.3;
    }

    .meta {
      color: #64748b;
      font-size: 0.875rem;
    }

    /* Article content */
    .article h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #f8fafc;
      margin-top: 2.5rem;
      margin-bottom: 0.75rem;
    }

    .article h3 {
      font-size: 1.0625rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-top: 1.75rem;
      margin-bottom: 0.5rem;
    }

    .article p {
      color: #cbd5e1;
      font-size: 0.9375rem;
      margin-bottom: 0.75rem;
    }

    .article ul, .article ol {
      list-style: none;
      padding: 0;
      margin-bottom: 0.75rem;
    }

    .article li {
      color: #cbd5e1;
      font-size: 0.9375rem;
      margin-bottom: 0.5rem;
      padding-left: 1.25rem;
      position: relative;
    }
    .article li::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0.65em;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #6366f1;
      opacity: 0.7;
    }

    .article strong { color: #f8fafc; font-weight: 600; }
    .article em { color: #cbd5e1; font-style: italic; }

    .article a {
      color: #6366f1;
      text-decoration: none;
    }
    .article a:hover { text-decoration: underline; }

    /* Horizontal rules */
    .article hr {
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      margin: 2rem 0;
    }

    /* Tables */
    .article table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0 1.5rem;
      font-size: 0.875rem;
    }
    .article th {
      text-align: left;
      color: #94a3b8;
      font-weight: 500;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      white-space: nowrap;
    }
    .article td {
      color: #cbd5e1;
      padding: 0.625rem 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: top;
    }
    .article tr:last-child td { border-bottom: none; }

    /* Code */
    .article code {
      background: rgba(255, 255, 255, 0.06);
      padding: 0.1em 0.35em;
      border-radius: 4px;
      font-size: 0.875em;
      font-family: "SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace;
    }
    .article pre {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin: 1rem 0;
      overflow-x: auto;
    }
    .article pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      font-size: 0.8125rem;
      line-height: 1.6;
    }

    /* Blockquotes */
    .article blockquote {
      border-left: 3px solid #6366f1;
      padding-left: 1rem;
      margin: 1rem 0;
      color: #94a3b8;
    }

    /* Footer */
    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      color: #64748b;
      font-size: 0.8125rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
    }
    .footer a { color: #6366f1; }

    /* Responsive table scroll */
    .table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    @media (max-width: 480px) {
      .container { padding: 2rem 1rem 4rem; }
      h1 { font-size: 1.375rem; }
      .article table { font-size: 0.8125rem; }
      .article th, .article td { padding: 0.375rem 0.5rem; }
    }
  </style>
</head>
<body>
  <div class="container">

    <a href="/blog" class="back-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      All posts
    </a>

    <div class="header">
      <a href="/" class="brand"><span class="brand-dot"></span>StatPilot</a>
      <h1>${meta.title}</h1>
      <p class="meta">${date} &nbsp;&middot;&nbsp; ${readingTime(htmlContent)} min read &nbsp;&middot;&nbsp; by ${meta.author || 'Marc'}</p>
    </div>

    <div class="article">
      ${htmlContent}
    </div>

    <div class="footer">
      <span>&copy; 2026 Dizid Web Development. All rights reserved.</span>
      <span>
        <a href="/">StatPilot</a>
        &nbsp;&middot;&nbsp;
        <a href="/blog">Blog</a>
        &nbsp;&middot;&nbsp;
        <a href="/privacy">Privacy</a>
      </span>
    </div>

  </div>
</body>
</html>`;
}

// HTML template for the blog index page
function indexTemplate(posts) {
  const postCards = posts.map(p => `
      <a href="/blog/${p.meta.slug}/" class="card">
        <div class="card-date">${formatDate(p.meta.date)}</div>
        <h2 class="card-title">${p.meta.title}</h2>
        <p class="card-desc">${p.meta.description || ''}</p>
        <span class="card-link">Read more &rarr;</span>
      </a>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blog — StatPilot</title>
  <meta name="description" content="Articles about GA4 analytics, multi-property dashboards, and building better analytics workflows." />
  <link rel="canonical" href="${SITE_URL}/blog/" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      min-height: 100vh;
      background: #0f172a;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      line-height: 1.75;
    }

    .container {
      max-width: 680px;
      margin: 0 auto;
      padding: 3rem 1.5rem 5rem;
    }

    /* Back link */
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      color: #94a3b8;
      font-size: 0.875rem;
      text-decoration: none;
      margin-bottom: 2.5rem;
      transition: color 0.15s;
    }
    .back-link:hover { color: #f8fafc; }
    .back-link svg { flex-shrink: 0; }

    /* Header */
    .header {
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #6366f1;
      margin-bottom: 1rem;
      text-decoration: none;
    }
    .brand-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6366f1;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 0.375rem;
    }

    .subtitle {
      color: #64748b;
      font-size: 0.9375rem;
    }

    /* Post cards */
    .cards {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .card {
      display: block;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1.5rem;
      text-decoration: none;
      transition: background 0.15s, border-color 0.15s;
    }
    .card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .card-date {
      color: #64748b;
      font-size: 0.8125rem;
      margin-bottom: 0.5rem;
    }

    .card-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }

    .card-desc {
      color: #94a3b8;
      font-size: 0.875rem;
      margin-bottom: 0.75rem;
      line-height: 1.6;
    }

    .card-link {
      color: #6366f1;
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Footer */
    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      color: #64748b;
      font-size: 0.8125rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
    }
    .footer a { color: #6366f1; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }

    @media (max-width: 480px) {
      .container { padding: 2rem 1rem 4rem; }
      h1 { font-size: 1.375rem; }
      .card { padding: 1.25rem; }
    }
  </style>
</head>
<body>
  <div class="container">

    <a href="/" class="back-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Back to StatPilot
    </a>

    <div class="header">
      <a href="/" class="brand"><span class="brand-dot"></span>StatPilot</a>
      <h1>Blog</h1>
      <p class="subtitle">GA4 analytics, multi-property dashboards, and building better workflows.</p>
    </div>

    <div class="cards">
${postCards}
    </div>

    <div class="footer">
      <span>&copy; 2026 Dizid Web Development. All rights reserved.</span>
      <span>
        <a href="/">StatPilot</a>
        &nbsp;&middot;&nbsp;
        <a href="/privacy">Privacy</a>
        &nbsp;&middot;&nbsp;
        <a href="/terms">Terms</a>
      </span>
    </div>

  </div>
</body>
</html>`;
}

// Wrap tables in a scrollable container for mobile
function wrapTables(html) {
  return html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
}

async function main() {
  // Read all markdown files
  let files;
  try {
    files = (await readdir(CONTENT_DIR)).filter(f => f.endsWith('.md'));
  } catch {
    console.log('No blog posts found in content/blog/ — skipping blog build.');
    return;
  }

  if (files.length === 0) {
    console.log('No blog posts found — skipping blog build.');
    return;
  }

  // Parse all posts
  const posts = [];
  for (const file of files) {
    const raw = await readFile(join(CONTENT_DIR, file), 'utf-8');
    const { meta, content } = parseFrontmatter(raw);

    if (!meta.slug) {
      // Derive slug from filename: 2026-02-18-some-title.md → some-title
      meta.slug = basename(file, '.md').replace(/^\d{4}-\d{2}-\d{2}-/, '');
    }

    // Strip the first H1 from content (we render it in the header)
    const contentWithoutH1 = content.trim().replace(/^#\s+.*\n+/, '');
    const htmlContent = wrapTables(await marked.parse(contentWithoutH1));

    posts.push({ meta, htmlContent, wordCount: content.split(/\s+/).length });
  }

  // Sort by date (newest first)
  posts.sort((a, b) => (b.meta.date || '').localeCompare(a.meta.date || ''));

  // Generate individual post pages
  for (const post of posts) {
    const dir = join(OUTPUT_DIR, post.meta.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), postTemplate(post.meta, post.htmlContent));
    console.log(`  Blog: ${post.meta.slug}/index.html`);
  }

  // Generate index page
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(join(OUTPUT_DIR, 'index.html'), indexTemplate(posts));
  console.log(`  Blog: index.html (${posts.length} post${posts.length === 1 ? '' : 's'})`);
}

main().catch(err => {
  console.error('Blog build failed:', err);
  process.exit(1);
});
