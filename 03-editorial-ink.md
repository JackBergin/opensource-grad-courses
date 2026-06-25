# Style 03 — Editorial Ink

> A literary magazine in CSS. Oversized serif display, generous margins, hairline rules, one ink-red accent. Confident, quiet, intelligent.

---

## 1. The feeling in one paragraph

This reads like a well-set print feature. A near-white page, dense black ink, and a **single restrained red** used like an editor's pen. Type does almost all the work: a **high-contrast serif** at large sizes for headlines and pull quotes, a calm humanist sans for running text. Structure comes from **hairline rules**, drop caps, and an asymmetric grid — not boxes or shadows. Whitespace is the most expensive material on the page; spend it freely.

**Do:** big serif headlines, hairline `1px` rules, generous margins, one red accent, small-caps labels, drop caps.
**Don't:** rounded corners, drop shadows, gradients, more than one accent, boxed cards with heavy borders.

---

## 2. Design tokens

```css
:root {
  --bg:    #FBFAF7;   /* paper white */
  --ink:   #14110E;   /* dense black ink */
  --muted: #6B6256;   /* warm gray for captions */
  --rule:  #DAD5CB;   /* hairline color */
  --accent:#B3261E;   /* editor's red — use sparingly */

  --border: 1px solid var(--rule);
  --radius: 0;        /* sharp by default */

  --font-display: "Fraunces", serif;      /* opsz/weight variable serif */
  --font-body:    "Inter", sans-serif;
  --font-label:   "Inter", sans-serif;    /* uppercased, tracked */
}
```

---

## 3. Fonts

```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

| Role | Font | Notes |
|---|---|---|
| Display / quotes | **Fraunces** 700 (+ italic 500) | high optical size, `line-height:1.05`; italic for pull quotes |
| Body | **Inter** 400 | `line-height:1.7`, max ~68ch measure |
| Labels / eyebrows | **Inter** 600 | ALL-CAPS, `letter-spacing:1.5px`, size 12–13px, color `--muted` |

Scale: display ~80px · h1 ~52 · h2 ~32 · body ~18–19 · caption ~14.

---

## 4. Signature rules

1. **Serif carries the page.** Headlines and pull quotes are large Fraunces; everything else stays quiet.
2. **Hairlines, not boxes.** Separate content with `1px solid var(--rule)`. No card borders, no shadows.
3. **One red, used like a pen.** Accent appears on links, a single underline, a lead-in word, a section number. Never fills areas.
4. **Asymmetric measure.** Set body text in a narrow column offset from center; leave a wide margin for notes/labels.
5. **Drop cap or standfirst.** Open major sections with a drop cap or a larger-weight standfirst paragraph.

---

## 5. Component recipes

```css
body { background:var(--bg); color:var(--ink); }
.eyebrow { font-family:var(--font-label); font-weight:600; text-transform:uppercase; letter-spacing:1.5px; font-size:12px; color:var(--muted); }
.headline{ font-family:var(--font-display); font-weight:700; font-size:clamp(40px,7vw,80px); line-height:1.05; letter-spacing:-.01em; }
.lede    { font-family:var(--font-display); font-weight:500; font-size:22px; line-height:1.4; }
.body    { font-family:var(--font-body); font-size:18px; line-height:1.7; max-width:68ch; }
.dropcap::first-letter { font-family:var(--font-display); font-weight:700; float:left; font-size:4.2em; line-height:.8; padding:6px 10px 0 0; color:var(--accent); }
.rule    { border:0; border-top:var(--border); }
.link    { color:var(--accent); text-underline-offset:3px; text-decoration-thickness:1px; }
.pull    { font-family:var(--font-display); font-style:italic; font-weight:500; font-size:28px; line-height:1.35; border-left:2px solid var(--accent); padding-left:20px; }
.btn     { background:var(--ink); color:var(--bg); border:0; padding:14px 26px; font-family:var(--font-label); font-weight:600; letter-spacing:1px; text-transform:uppercase; font-size:13px; cursor:pointer; }
.btn--text { background:none; color:var(--accent); padding:0; }
```

**Layout:** a 12-col grid; body in cols 2–8, marginalia/labels in cols 9–12. Section spacing via large `padding-block` + hairline rules.

---

## 6. Composition cheat

- **Hero:** eyebrow, then a huge Fraunces headline, then a 22px lede. No image needed; the type is the image.
- **Articles/roles:** a hairline rule between each, eyebrow + serif title + sans body; date or label in the right margin.
- **Quote moment:** one `.pull` italic line, red rule on the left.
- **CTA:** a `.btn` in solid ink, or a red `.btn--text` link — restraint reads as confidence.

---

## 7. Prompt to hand the agent

> "Style this site per Editorial Ink: near-white paper, dense black ink, one editor's-red accent used sparingly. Fraunces serif for big headlines and italic pull quotes, Inter for body at a 68ch measure with 1.7 line-height, uppercase tracked Inter eyebrows. Structure with 1px hairline rules and an asymmetric 12-col grid — no boxes, no rounded corners, no shadows, no gradients. Open sections with a drop cap. Spend whitespace generously."
