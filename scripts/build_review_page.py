"""
Build a local HTML page for reviewing the 56 tentative TMDB matches.

Each row shows the S&S film info next to the TMDB candidate, with a poster
thumbnail and a direct TMDB link. Click "Approve" or "Reject" to record
the decision in a downloaded JSON file.

The page does NOT modify data/tmdb_matches.json directly. After review,
the script `apply_review_decisions.py` consumes the saved decisions.

Output: data/review.html
Open: just double-click the file in your file explorer.
"""

from __future__ import annotations

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REVIEW_JSON = ROOT / "data" / "tmdb_review.json"
OUT_HTML = ROOT / "data" / "review.html"
TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w342"


def render_card(item, idx):
    cand = item["candidate"]
    poster = f'<img src="{TMDB_IMG_BASE}{cand["poster_path"]}" alt="poster">' if cand.get("poster_path") else '<div class="no-img">no poster</div>'
    ss_dirs = ", ".join(item["ss_directors"])
    return f"""
    <div class="card" data-idx="{idx}" data-key="{item['ss_key']}" data-tmdb-id="{cand['tmdb_id']}" data-media-type="{cand['media_type']}">
      <div class="poster">{poster}</div>
      <div class="info">
        <div class="row"><span class="label">Sight &amp; Sound:</span> <strong>{html.escape(item['ss_title'])}</strong> ({item['ss_year']})</div>
        <div class="row"><span class="label">Director(s):</span> {html.escape(ss_dirs)}</div>
        <hr>
        <div class="row"><span class="label">TMDB candidate:</span> <strong>{html.escape(cand['title'] or '')}</strong> ({cand['year']}) <span class="meta">[{cand['media_type']}]</span></div>
        <div class="row"><span class="label">Title similarity:</span> {cand['title_similarity']}</div>
        <div class="row"><a href="{cand['tmdb_url']}" target="_blank" rel="noopener">Open TMDB page →</a></div>
      </div>
      <div class="actions">
        <button class="btn approve" onclick="decide({idx}, 'approve')">✓ Approve</button>
        <button class="btn reject" onclick="decide({idx}, 'reject')">✗ Reject</button>
        <div class="status" id="status-{idx}"></div>
      </div>
    </div>
    """


def main():
    with REVIEW_JSON.open(encoding="utf-8") as f:
        items = json.load(f)

    cards_html = "\n".join(render_card(it, i) for i, it in enumerate(items))
    items_json = json.dumps(items, ensure_ascii=False)

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>TMDB Match Review — {len(items)} films</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 20px auto; padding: 0 20px; background: #f9fafb; color: #111827; }}
    h1 {{ font-size: 24px; margin-bottom: 8px; }}
    .summary {{ background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 16px; }}
    .summary button {{ padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }}
    .summary button:hover {{ background: #1d4ed8; }}
    .summary .counts {{ margin-top: 8px; font-size: 14px; color: #4b5563; }}
    .card {{ display: flex; gap: 16px; background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 12px; }}
    .poster img {{ width: 120px; height: auto; border-radius: 4px; display: block; }}
    .poster .no-img {{ width: 120px; height: 180px; background: #e5e7eb; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 12px; border-radius: 4px; }}
    .info {{ flex: 1; }}
    .info .row {{ margin: 4px 0; font-size: 14px; }}
    .info .label {{ color: #6b7280; font-size: 12px; text-transform: uppercase; }}
    .info hr {{ border: none; border-top: 1px solid #e5e7eb; margin: 8px 0; }}
    .info .meta {{ color: #6b7280; font-size: 12px; }}
    .actions {{ display: flex; flex-direction: column; gap: 8px; min-width: 110px; }}
    .btn {{ padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }}
    .approve {{ background: #10b981; color: white; }}
    .approve:hover {{ background: #059669; }}
    .reject {{ background: #ef4444; color: white; }}
    .reject:hover {{ background: #dc2626; }}
    .status {{ font-size: 12px; text-align: center; color: #6b7280; }}
    .card.approved {{ border-left: 4px solid #10b981; }}
    .card.rejected {{ border-left: 4px solid #ef4444; opacity: 0.6; }}
    a {{ color: #2563eb; text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
  </style>
</head>
<body>
  <h1>TMDB Match Review — {len(items)} films</h1>
  <div class="summary">
    <button onclick="downloadDecisions()">⬇ Download decisions JSON</button>
    <div class="counts">
      <span id="approved-count">0</span> approved · <span id="rejected-count">0</span> rejected · <span id="pending-count">{len(items)}</span> pending
    </div>
    <p style="font-size: 13px; color: #4b5563; margin-top: 8px;">
      Click ✓ to approve a match, ✗ to reject. When done, click "Download decisions JSON" — save it to <code>data/review_decisions.json</code>, then run <code>python scripts/apply_review_decisions.py</code>.
    </p>
  </div>
  {cards_html}

  <script>
    const items = {items_json};
    const decisions = {{}};

    function decide(idx, choice) {{
      decisions[idx] = choice;
      const card = document.querySelector(`.card[data-idx="${{idx}}"]`);
      const status = document.getElementById(`status-${{idx}}`);
      card.classList.remove('approved', 'rejected');
      card.classList.add(choice === 'approve' ? 'approved' : 'rejected');
      status.textContent = choice === 'approve' ? '✓ approved' : '✗ rejected';
      updateCounts();
    }}

    function updateCounts() {{
      const approved = Object.values(decisions).filter(v => v === 'approve').length;
      const rejected = Object.values(decisions).filter(v => v === 'reject').length;
      document.getElementById('approved-count').textContent = approved;
      document.getElementById('rejected-count').textContent = rejected;
      document.getElementById('pending-count').textContent = items.length - approved - rejected;
    }}

    function downloadDecisions() {{
      const out = items.map((it, idx) => ({{
        ss_key: it.ss_key,
        ss_title: it.ss_title,
        decision: decisions[idx] || 'pending',
        candidate: it.candidate,
      }}));
      const blob = new Blob([JSON.stringify(out, null, 2)], {{ type: 'application/json' }});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'review_decisions.json';
      a.click();
      URL.revokeObjectURL(url);
    }}
  </script>
</body>
</html>
"""

    OUT_HTML.write_text(page, encoding="utf-8")
    print(f"Wrote {OUT_HTML.relative_to(ROOT)}")
    print(f"Open in browser: file:///{OUT_HTML.as_posix()}")


if __name__ == "__main__":
    main()
