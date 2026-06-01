// NexFlow Board Presentation — PptxGenJS script
// Run: node build-presentation.js
'use strict';

const pptxgen = require('pptxgenjs');

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '0F172A',
  surface:   '1E293B',
  surface2:  '263448',
  border:    '334155',
  border2:   '475569',
  accent:    '06B6D4',
  accentDim: '0891B2',
  text:      'FFFFFF',
  muted:     'CBD5E1',
  subtle:    '64748B',
  green:     '22C55E',
  amber:     'F59E0B',
  violet:    '818CF8',
  blue:      '60A5FA',
  red:       'EF4444',
};

const mkShadow = () => ({ type: 'outer', blur: 12, offset: 3, angle: 135, color: '000000', opacity: 0.35 });
// Strip alpha suffix from hex color (for line.color — pptxgenjs only accepts 6-char hex)
const sa = (c) => String(c).slice(0, 6);

const mkCardShadow = () => ({ type: 'outer', blur: 8, offset: 2, angle: 135, color: '000000', opacity: 0.4 });

// ─── Pres setup ───────────────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.title  = 'NexFlow — Intelligent Lead Pipeline Management';
pres.author = 'Makka Corp';

const W = 10;   // slide width  (inches)
const H = 5.625; // slide height (inches)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addBg(slide) {
  slide.background = { color: C.bg };
}

// Thin cyan accent bar at top
function addTopBar(slide) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: 0.06,
    fill: { color: C.accent }, line: { color: C.accent },
  });
}

// Slide title + optional subtitle line
function addTitle(slide, title, y = 0.22) {
  slide.addText(title, {
    x: 0.55, y, w: W - 1.1, h: 0.55,
    fontSize: 26, bold: true, color: C.text, fontFace: 'Calibri',
    align: 'left', valign: 'middle', margin: 0,
  });
}

function addSubLabel(slide, text, y = 0.82) {
  slide.addText(text, {
    x: 0.55, y, w: W - 1.1, h: 0.25,
    fontSize: 11, color: C.subtle, fontFace: 'Calibri',
    align: 'left', valign: 'middle', margin: 0,
  });
}

// Card box — sa() strips any appended alpha suffix callers may pass
function addCard(slide, x, y, w, h, opts = {}) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: sa(opts.fill || C.surface) },
    line: { color: sa(opts.border || C.border), pt: 1 },
    shadow: mkCardShadow(),
  });
}

// Accent left stripe on a card
function addCardStripe(slide, x, y, h, color = C.accent) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 0.065, h,
    fill: { color }, line: { color },
  });
}

// Colored icon circle
function addIconCircle(slide, emoji, cx, cy, r, bgColor) {
  slide.addShape(pres.shapes.OVAL, {
    x: cx - r, y: cy - r, w: r * 2, h: r * 2,
    fill: { color: bgColor, transparency: 20 },
    line: { color: bgColor, pt: 1, transparency: 50 },
  });
  slide.addText(emoji, {
    x: cx - r, y: cy - r, w: r * 2, h: r * 2,
    fontSize: r * 26, align: 'center', valign: 'middle', margin: 0,
  });
}

// Divider line
function addDivider(slide, x, y, w, color = C.border) {
  slide.addShape(pres.shapes.LINE, {
    x, y, w, h: 0,
    line: { color: sa(color), pt: 0.75, dashType: 'solid' },
  });
}

// ─── SLIDE 1 — Title ──────────────────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);

  // Glow circles (transparent ovals for depth)
  sl.addShape(pres.shapes.OVAL, {
    x: 2.5, y: -2.5, w: 5, h: 5,
    fill: { color: C.accent, transparency: 88 },
    line: { color: C.accent, transparency: 95 },
  });
  sl.addShape(pres.shapes.OVAL, {
    x: 3.5, y: -1.8, w: 3, h: 3,
    fill: { color: C.accent, transparency: 92 },
    line: { color: C.accent, transparency: 95 },
  });

  // Bottom decorative bar
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: H - 0.08, w: W, h: 0.08,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: H - 0.18, w: W, h: 0.1,
    fill: { color: C.accentDim, transparency: 60 },
    line: { color: C.accentDim, transparency: 60 },
  });

  // Lightning bolt icon circle
  sl.addShape(pres.shapes.OVAL, {
    x: 4.3, y: 0.45, w: 1.4, h: 1.4,
    fill: { color: C.accent, transparency: 15 },
    line: { color: C.accent, pt: 2 },
    shadow: { type: 'outer', blur: 20, offset: 0, angle: 135, color: C.accent, opacity: 0.5 },
  });
  sl.addText('⚡', {
    x: 4.3, y: 0.45, w: 1.4, h: 1.4,
    fontSize: 40, align: 'center', valign: 'middle', margin: 0,
  });

  // NexFlow — main title
  sl.addText('NexFlow', {
    x: 1, y: 2.1, w: 8, h: 1.0,
    fontSize: 64, bold: true, color: C.text, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0,
    charSpacing: 6,
  });

  // Subtitle
  sl.addText('Intelligent Lead Pipeline Management', {
    x: 1, y: 3.18, w: 8, h: 0.55,
    fontSize: 22, color: C.accent, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0,
  });

  // Sub-subtitle
  sl.addText('Makka Corp  ·  Internal Platform  ·  2025', {
    x: 1, y: 3.82, w: 8, h: 0.38,
    fontSize: 13, color: C.muted, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0,
    charSpacing: 2,
  });

  // Entity tags row
  const tags = ['HSL', 'MGL', 'MKL', 'HCL'];
  const tagColors = [C.accent, '818CF8', 'F59E0B', '60A5FA'];
  const tagW = 0.7, tagH = 0.3, startX = (W - tags.length * (tagW + 0.15) + 0.15) / 2;
  tags.forEach((tag, i) => {
    const tx = startX + i * (tagW + 0.15);
    sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: tx, y: 4.35, w: tagW, h: tagH,
      fill: { color: tagColors[i], transparency: 75 },
      line: { color: tagColors[i], pt: 1, transparency: 30 },
      rectRadius: 0.06,
    });
    sl.addText(tag, {
      x: tx, y: 4.35, w: tagW, h: tagH,
      fontSize: 10, bold: true, color: C.text, fontFace: 'Calibri',
      align: 'center', valign: 'middle', margin: 0,
    });
  });
}

// ─── SLIDE 2 — The Challenge ──────────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);
  addTopBar(sl);
  addTitle(sl, 'The Old Way Was Costing Us');

  // Intro line
  sl.addText('Before NexFlow, every entity ran its own Excel sheet — disconnected, untracked, and unreliable.', {
    x: 0.55, y: 0.82, w: W - 1.1, h: 0.32,
    fontSize: 12, color: C.muted, fontFace: 'Calibri', align: 'left', margin: 0,
  });

  const cards = [
    { emoji: '📊', title: 'Excel Chaos', desc: 'Multiple sheets, version conflicts, no real-time visibility across teams', color: C.red },
    { emoji: '🔓', title: 'Lost Leads',  desc: 'No handoff tracking — leads fell through the cracks between marketing and sales', color: C.amber },
    { emoji: '❓', title: 'Zero Accountability', desc: 'No audit trail, no way to know who changed what or when', color: C.red },
    { emoji: '🏢', title: 'Fragmented Data', desc: '4 entities (HSL, MGL, MKL, HCL) with zero unified pipeline view', color: C.amber },
  ];

  const cardW = 4.25, cardH = 1.72;
  const positions = [
    { x: 0.5, y: 1.22 }, { x: 5.2, y: 1.22 },
    { x: 0.5, y: 3.05 }, { x: 5.2, y: 3.05 },
  ];

  cards.forEach((card, i) => {
    const { x, y } = positions[i];
    addCard(sl, x, y, cardW, cardH, { border: card.color + '60' });
    addCardStripe(sl, x, y, cardH, card.color);

    // Icon circle
    addIconCircle(sl, card.emoji, x + 0.42, y + 0.38, 0.28, card.color);

    sl.addText(card.title, {
      x: x + 0.85, y: y + 0.12, w: cardW - 1, h: 0.36,
      fontSize: 14, bold: true, color: C.text, fontFace: 'Calibri',
      align: 'left', valign: 'middle', margin: 0,
    });
    sl.addText(card.desc, {
      x: x + 0.14, y: y + 0.54, w: cardW - 0.28, h: 1.05,
      fontSize: 11.5, color: C.muted, fontFace: 'Calibri',
      align: 'left', valign: 'top', margin: 0, wrap: true,
    });
  });
}

// ─── SLIDE 3 — The Solution ───────────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);
  addTopBar(sl);
  addTitle(sl, 'One Platform. Four Entities. Full Control.');

  // Tagline
  sl.addText('Real-time  ·  Role-based  ·  Mobile-first', {
    x: 0.55, y: 0.83, w: W - 1.1, h: 0.28,
    fontSize: 13, color: C.accent, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0, charSpacing: 1.5,
  });

  // 3 columns
  const cols = [
    {
      icon: '📝', label: 'Marketing', color: C.accent,
      steps: ['New lead entry form', 'Voice dictation support', 'REQ code auto-generated', 'Route to department'],
    },
    {
      icon: '🔄', label: 'Pipeline', color: C.violet,
      steps: ['Lead status tracking', 'WhatsApp handoff card', 'In-app notifications', 'Full audit trail'],
    },
    {
      icon: '💼', label: 'Sales', color: C.green,
      steps: ['Assigned leads queue', 'Sales response fields', 'Status & follow-up', 'Completion notification'],
    },
  ];

  const colW = 2.8, colH = 3.6;
  const startX = (W - cols.length * colW - 0.3 * 2) / 2;

  cols.forEach((col, i) => {
    const x = startX + i * (colW + 0.3);
    const y = 1.2;

    // Card
    addCard(sl, x, y, colW, colH, { fill: C.surface, border: col.color + '50' });

    // Top color bar
    sl.addShape(pres.shapes.RECTANGLE, {
      x, y, w: colW, h: 0.5,
      fill: { color: col.color, transparency: 20 },
      line: { color: col.color, transparency: 20 },
    });

    sl.addText(col.icon + '  ' + col.label, {
      x: x + 0.1, y, w: colW - 0.2, h: 0.5,
      fontSize: 15, bold: true, color: C.text, fontFace: 'Calibri',
      align: 'center', valign: 'middle', margin: 0,
    });

    // Steps
    col.steps.forEach((step, si) => {
      const sy = y + 0.62 + si * 0.72;
      sl.addShape(pres.shapes.OVAL, {
        x: x + 0.18, y: sy + 0.08, w: 0.2, h: 0.2,
        fill: { color: col.color }, line: { color: col.color },
      });
      sl.addText(step, {
        x: x + 0.46, y: sy, w: colW - 0.6, h: 0.38,
        fontSize: 11.5, color: C.muted, fontFace: 'Calibri',
        align: 'left', valign: 'middle', margin: 0,
      });
    });

    // Arrow between columns
    if (i < cols.length - 1) {
      sl.addText('→', {
        x: x + colW + 0.02, y: y + colH / 2 - 0.2, w: 0.26, h: 0.4,
        fontSize: 20, color: C.accent, fontFace: 'Calibri',
        align: 'center', valign: 'middle', margin: 0,
      });
    }
  });

  // Bottom caption
  sl.addText('From first contact to closed deal — every step tracked, every role in control.', {
    x: 0.55, y: 5.05, w: W - 1.1, h: 0.3,
    fontSize: 10.5, color: C.subtle, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0, italic: true,
  });
}

// ─── SLIDE 4 — Role-Based Access ──────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);
  addTopBar(sl);
  addTitle(sl, 'The Right Information, to the Right Person');

  sl.addText('NexFlow enforces role-based access at every layer — from page routing to individual field visibility.', {
    x: 0.55, y: 0.83, w: W - 1.1, h: 0.3,
    fontSize: 12, color: C.muted, fontFace: 'Calibri', align: 'left', margin: 0,
  });

  const roles = [
    {
      icon: '📢', label: 'Marketing', color: C.accent,
      perms: ['Create & submit leads', 'Voice dictation input', 'View own lead history', 'WhatsApp handoff trigger'],
    },
    {
      icon: '💼', label: 'Sales', color: C.green,
      perms: ['See dept-assigned leads only', 'Update sales response', 'Voice dictation support', 'Cannot see marketing data'],
    },
    {
      icon: '📊', label: 'Manager', color: C.blue,
      perms: ['Full pipeline visibility', 'All entities & departments', 'Analytics dashboard', 'Export to Excel'],
    },
    {
      icon: '⚙️', label: 'Super Admin', color: C.violet,
      perms: ['Full system access', 'Configure field permissions', 'Manage users & entities', 'Configure dropdowns'],
    },
  ];

  const cardW = 2.1, cardH = 3.45;
  const gap   = 0.12;
  const totalW = roles.length * cardW + (roles.length - 1) * gap;
  const startX = (W - totalW) / 2;

  roles.forEach((role, i) => {
    const x = startX + i * (cardW + gap);
    const y = 1.2;

    addCard(sl, x, y, cardW, cardH, { fill: C.surface, border: role.color + '60' });

    // Color header
    sl.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: 0.62,
      fill: { color: role.color, transparency: 20 },
      line: { color: role.color, transparency: 20 },
    });
    sl.addText(role.icon + '\n' + role.label, {
      x: x + 0.05, y: y + 0.01, w: cardW - 0.1, h: 0.6,
      fontSize: 13, bold: true, color: C.text, fontFace: 'Calibri',
      align: 'center', valign: 'middle', margin: 0,
    });

    // Divider
    addDivider(sl, x + 0.15, y + 0.66, cardW - 0.3, role.color + '40');

    // Perms
    role.perms.forEach((perm, pi) => {
      const py = y + 0.82 + pi * 0.62;
      sl.addShape(pres.shapes.RECTANGLE, {
        x: x + 0.15, y: py + 0.08, w: 0.12, h: 0.12,
        fill: { color: role.color }, line: { color: role.color },
      });
      sl.addText(perm, {
        x: x + 0.33, y: py, w: cardW - 0.45, h: 0.55,
        fontSize: 10, color: C.muted, fontFace: 'Calibri',
        align: 'left', valign: 'top', wrap: true, margin: 0,
      });
    });
  });
}

// ─── SLIDE 5 — Core Features ──────────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);
  addTopBar(sl);
  addTitle(sl, 'Built for How Your Team Actually Works');

  const features = [
    { icon: '🎙️', title: 'Egyptian Arabic Voice',  desc: 'Dictate notes in Arabic. Whisper AI transcribes instantly — even with mixed Arabic/English.',  color: C.accent  },
    { icon: '⚡', title: 'Quick Lead Access',       desc: 'Enter any REQ code — instantly pull up the full lead without leaving the screen.',              color: C.amber   },
    { icon: '📊', title: 'Live Analytics',          desc: 'KPIs, pipeline charts, source ROI, and sector heatmaps — refreshed in real time.',             color: C.blue    },
    { icon: '🔔', title: 'WhatsApp Integration',    desc: 'Configurable lead cards sent directly to coordinators the moment a lead is forwarded.',         color: C.green   },
    { icon: '🏢', title: 'Multi-Entity Support',    desc: 'HSL · MGL · MKL · HCL — each entity has its own dropdown values, departments, and templates.', color: C.violet  },
    { icon: '🛡️', title: 'Granular Permissions',   desc: 'Field-level access control. Admin sets exactly which role can view or edit each field.',         color: C.red     },
  ];

  const cardW = 2.9, cardH = 1.68;
  const gapX  = 0.2, gapY = 0.2;
  const totalW = 3 * cardW + 2 * gapX;
  const startX = (W - totalW) / 2;
  const startY = 1.1;

  features.forEach((f, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    addCard(sl, x, y, cardW, cardH, { fill: C.surface, border: f.color + '50' });
    addCardStripe(sl, x, y, cardH, f.color);

    sl.addText(f.icon + '  ' + f.title, {
      x: x + 0.14, y: y + 0.1, w: cardW - 0.22, h: 0.42,
      fontSize: 12.5, bold: true, color: C.text, fontFace: 'Calibri',
      align: 'left', valign: 'middle', margin: 0,
    });
    addDivider(sl, x + 0.14, y + 0.54, cardW - 0.28, f.color + '40');
    sl.addText(f.desc, {
      x: x + 0.14, y: y + 0.6, w: cardW - 0.22, h: 0.98,
      fontSize: 10.5, color: C.muted, fontFace: 'Calibri',
      align: 'left', valign: 'top', wrap: true, margin: 0,
    });
  });
}

// ─── SLIDE 6 — REQ Code System ────────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);
  addTopBar(sl);
  addTitle(sl, 'Every Lead is Uniquely Tracked');

  sl.addText('Auto-generated  ·  Searchable  ·  Audit-trailed  ·  Conflict-free under concurrent submissions', {
    x: 0.55, y: 0.84, w: W - 1.1, h: 0.28,
    fontSize: 11, color: C.muted, fontFace: 'Calibri', align: 'center', margin: 0,
  });

  // Big REQ code display
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 1.8, y: 1.28, w: 6.4, h: 1.18,
    fill: { color: C.surface }, line: { color: C.accent, pt: 1.5 },
    shadow: mkShadow(),
  });

  // The code segments with distinct colors
  const segments = [
    { text: 'HSL',  label: 'Entity',    color: C.accent,  w: 0.95 },
    { text: '5',    label: 'Year',      color: C.violet,  w: 0.55 },
    { text: '06',   label: 'Month',     color: C.blue,    w: 0.65 },
    { text: '24',   label: 'Day',       color: C.green,   w: 0.65 },
    { text: '0001', label: 'Sequence',  color: C.amber,   w: 1.02 },
  ];
  const dotW = 0.22;
  const totalCodeW = segments.reduce((s, g) => s + g.w, 0) + (segments.length - 1) * dotW;
  let cx = 1.8 + (6.4 - totalCodeW) / 2;

  segments.forEach((seg, i) => {
    sl.addText(seg.text, {
      x: cx, y: 1.34, w: seg.w, h: 0.65,
      fontSize: 34, bold: true, color: seg.color, fontFace: 'Calibri',
      align: 'center', valign: 'middle', margin: 0,
    });
    sl.addText(seg.label, {
      x: cx, y: 1.96, w: seg.w, h: 0.26,
      fontSize: 9, color: C.subtle, fontFace: 'Calibri',
      align: 'center', valign: 'middle', margin: 0,
    });

    // Bottom color indicator
    sl.addShape(pres.shapes.RECTANGLE, {
      x: cx + 0.06, y: 2.28, w: seg.w - 0.12, h: 0.06,
      fill: { color: seg.color }, line: { color: seg.color },
    });

    if (i < segments.length - 1) {
      sl.addText('·', {
        x: cx + seg.w, y: 1.34, w: dotW, h: 0.65,
        fontSize: 28, color: C.border2, fontFace: 'Calibri',
        align: 'center', valign: 'middle', margin: 0,
      });
    }
    cx += seg.w + dotW;
  });

  // 3 stat cards
  const stats = [
    { val: '4',          label: 'Entities',        sub: 'Each with its own prefix',         color: C.accent },
    { val: 'Atomic',     label: 'Sequence Lock',    sub: 'Concurrent submissions safe',      color: C.green  },
    { val: '∞',          label: 'Audit Trail',      sub: 'Every change logged forever',      color: C.violet },
  ];

  const sCardW = 2.55, sCardH = 1.32;
  const sStartX = (W - 3 * sCardW - 2 * 0.3) / 2;

  // Bottom caption bar (fills empty space below stat cards)
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.15, w: W - 1.0, h: 0.55,
    fill: { color: C.surface }, line: { color: C.border, pt: 0.75 },
  });
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.15, w: 0.06, h: 0.55,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  sl.addText('Every lead entry auto-generates a unique REQ code · Used across all views, exports, WhatsApp cards, and the audit trail', {
    x: 0.68, y: 4.15, w: W - 1.28, h: 0.55,
    fontSize: 11, color: C.muted, fontFace: 'Calibri',
    align: 'left', valign: 'middle', margin: 0, italic: true,
  });

  stats.forEach((s, i) => {
    const x = sStartX + i * (sCardW + 0.3);
    const y = 2.62;
    addCard(sl, x, y, sCardW, sCardH, { fill: C.surface, border: s.color + '50' });
    sl.addText(s.val, {
      x: x + 0.1, y: y + 0.08, w: sCardW - 0.2, h: 0.58,
      fontSize: 26, bold: true, color: s.color, fontFace: 'Calibri',
      align: 'center', valign: 'middle', margin: 0,
    });
    sl.addText(s.label, {
      x: x + 0.1, y: y + 0.64, w: sCardW - 0.2, h: 0.26,
      fontSize: 11, bold: true, color: C.text, fontFace: 'Calibri',
      align: 'center', valign: 'middle', margin: 0,
    });
    sl.addText(s.sub, {
      x: x + 0.1, y: y + 0.88, w: sCardW - 0.2, h: 0.22,
      fontSize: 9, color: C.subtle, fontFace: 'Calibri',
      align: 'center', valign: 'middle', margin: 0,
    });
  });
}

// ─── SLIDE 7 — Analytics ─────────────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);
  addTopBar(sl);
  addTitle(sl, 'From Guesswork to Data-Driven Decisions');

  // 4 KPI cards
  const kpis = [
    { icon: '📈', label: 'Total Leads',      sub: 'All entities combined',       color: C.accent },
    { icon: '🎯', label: 'Conversion Rate',  sub: 'Turned Into Order / Total',   color: C.green  },
    { icon: '⚡', label: 'In Pipeline',      sub: 'Submitted + With Sales',      color: C.amber  },
    { icon: '⏱️', label: 'Avg Response',     sub: 'Marketing to Sales handoff',  color: C.violet },
  ];

  const kW = 2.1, kH = 1.05;
  const kGap = 0.15;
  const kStartX = (W - 4 * kW - 3 * kGap) / 2;

  kpis.forEach((k, i) => {
    const x = kStartX + i * (kW + kGap);
    const y = 1.1;
    addCard(sl, x, y, kW, kH, { fill: C.surface, border: k.color + '50' });

    sl.addShape(pres.shapes.RECTANGLE, {
      x, y, w: kW, h: 0.08,
      fill: { color: k.color }, line: { color: k.color },
    });

    sl.addText(k.icon + '  ' + k.label, {
      x: x + 0.1, y: y + 0.14, w: kW - 0.2, h: 0.4,
      fontSize: 11.5, bold: true, color: C.text, fontFace: 'Calibri',
      align: 'left', valign: 'middle', margin: 0,
    });
    sl.addText(k.sub, {
      x: x + 0.1, y: y + 0.56, w: kW - 0.2, h: 0.38,
      fontSize: 9, color: C.subtle, fontFace: 'Calibri',
      align: 'left', valign: 'top', margin: 0,
    });
  });

  // Charts section
  sl.addText('Available Charts & Reports', {
    x: 0.55, y: 2.35, w: 4.5, h: 0.38,
    fontSize: 14, bold: true, color: C.text, fontFace: 'Calibri',
    align: 'left', valign: 'middle', margin: 0,
  });

  const charts = [
    { icon: '📉', name: 'Lead Volume Timeline', desc: '7D / 30D / 3M / 1Y / All — area chart per entity' },
    { icon: '🏗️', name: 'Pipeline Stages',      desc: 'Draft → Submitted → With Sales → Completed' },
    { icon: '🔗', name: 'Top Lead Sources',      desc: 'Which channels drive the most qualified leads' },
    { icon: '🏭', name: 'Sector Heatmap',        desc: 'Top industries by lead count and conversion' },
    { icon: '🎯', name: 'Status Breakdown',      desc: 'Current request status distribution, color-coded' },
  ];

  charts.forEach((c, i) => {
    const y = 2.82 + i * 0.48;
    sl.addText(c.icon, {
      x: 0.55, y, w: 0.38, h: 0.38,
      fontSize: 15, align: 'center', valign: 'middle', margin: 0,
    });
    sl.addText(c.name, {
      x: 0.98, y: y + 0.02, w: 3.3, h: 0.22,
      fontSize: 11, bold: true, color: C.text, fontFace: 'Calibri',
      align: 'left', valign: 'middle', margin: 0,
    });
    sl.addText(c.desc, {
      x: 0.98, y: y + 0.22, w: 3.3, h: 0.2,
      fontSize: 9.5, color: C.subtle, fontFace: 'Calibri',
      align: 'left', valign: 'middle', margin: 0,
    });
  });

  // Right: mini bar chart illustration
  addCard(sl, 5.4, 2.25, 4.1, 2.95, { fill: C.surface, border: C.border });
  sl.addText('📊  Analytics Dashboard', {
    x: 5.55, y: 2.32, w: 3.8, h: 0.38,
    fontSize: 11, bold: true, color: C.accent, fontFace: 'Calibri',
    align: 'left', valign: 'middle', margin: 0,
  });
  addDivider(sl, 5.55, 2.7, 3.8, C.border);

  // Fake bar chart using shapes
  const barData = [0.6, 0.85, 0.5, 0.95, 0.7, 0.45, 0.8];
  const barColors = [C.accent, C.blue, C.accent, C.green, C.violet, C.amber, C.accent];
  const bW = 0.38, bGap = 0.12, bBaseY = 4.9, bMaxH = 1.6;
  const bStartX = 5.55;
  barData.forEach((h, i) => {
    const bH = h * bMaxH;
    sl.addShape(pres.shapes.RECTANGLE, {
      x: bStartX + i * (bW + bGap), y: bBaseY - bH, w: bW, h: bH,
      fill: { color: barColors[i], transparency: 30 },
      line: { color: barColors[i], transparency: 20 },
    });
  });
  addDivider(sl, 5.55, 4.92, 3.8, C.border);
  sl.addText('Filterable by Entity  ·  Date Range  ·  Exportable to Excel', {
    x: 5.4, y: 5.0, w: 4.1, h: 0.28,
    fontSize: 9, color: C.subtle, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0,
  });
}

// ─── SLIDE 8 — Mobile-First PWA ───────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);
  addTopBar(sl);
  addTitle(sl, 'Works Everywhere Your Team Works');

  sl.addText('Android  ·  iOS  ·  Desktop — One codebase, one experience', {
    x: 0.55, y: 0.84, w: 4.8, h: 0.28,
    fontSize: 13, color: C.accent, fontFace: 'Calibri',
    align: 'left', valign: 'middle', margin: 0, charSpacing: 1,
  });

  // Left: feature list
  const features = [
    { icon: '📲', title: 'Installable on Phone',    desc: 'Add to home screen on iOS & Android — no app store needed' },
    { icon: '📡', title: 'Offline Resilience',       desc: 'Service worker caches the app shell and recent data' },
    { icon: '⬇️', title: 'Bottom Navigation Bar',   desc: 'Touch-optimised tab bar — all key actions one tap away' },
    { icon: '🎙️', title: 'Voice Input on Mobile',   desc: 'Record and transcribe directly from your phone' },
    { icon: '🔔', title: 'Smart Notifications',      desc: 'In-app alerts for lead handoff, sales updates, completions' },
  ];

  features.forEach((f, i) => {
    const y = 1.22 + i * 0.84;
    addCard(sl, 0.5, y, 4.6, 0.72, { fill: C.surface, border: C.border });
    sl.addText(f.icon, {
      x: 0.5, y, w: 0.65, h: 0.72,
      fontSize: 20, align: 'center', valign: 'middle', margin: 0,
    });
    sl.addText(f.title, {
      x: 1.2, y: y + 0.06, w: 3.75, h: 0.28,
      fontSize: 12, bold: true, color: C.text, fontFace: 'Calibri',
      align: 'left', valign: 'middle', margin: 0,
    });
    sl.addText(f.desc, {
      x: 1.2, y: y + 0.36, w: 3.75, h: 0.28,
      fontSize: 9.5, color: C.subtle, fontFace: 'Calibri',
      align: 'left', valign: 'middle', margin: 0,
    });
  });

  // Right: phone mockup frame
  const px = 5.65, py = 1.0, pw = 3.8, ph = 4.35;
  // Phone outline
  sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: px, y: py, w: pw, h: ph,
    fill: { color: C.surface2 }, line: { color: C.accent, pt: 2 },
    shadow: mkShadow(), rectRadius: 0.22,
  });
  // Screen area
  sl.addShape(pres.shapes.RECTANGLE, {
    x: px + 0.16, y: py + 0.38, w: pw - 0.32, h: ph - 0.65,
    fill: { color: C.bg }, line: { color: C.border, pt: 0.5 },
  });
  // Status bar
  sl.addShape(pres.shapes.RECTANGLE, {
    x: px + 0.16, y: py + 0.38, w: pw - 0.32, h: 0.24,
    fill: { color: C.surface }, line: { color: C.surface },
  });
  sl.addText('NexFlow  ⚡', {
    x: px + 0.16, y: py + 0.38, w: pw - 0.32, h: 0.24,
    fontSize: 9, bold: true, color: C.accent, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0,
  });

  // Mock lead cards in phone screen
  const mCards = ['HSL506240001  •  Ahmed Hassan', 'MGL506240002  •  Cairo Steel', 'MKL506240003  •  Delta Group'];
  const mColors = [C.accent, C.green, C.violet];
  mCards.forEach((mc, i) => {
    const cy = py + 0.72 + i * 0.62;
    sl.addShape(pres.shapes.RECTANGLE, {
      x: px + 0.26, y: cy, w: pw - 0.52, h: 0.5,
      fill: { color: C.surface }, line: { color: sa(mColors[i]), pt: 0.75 },
    });
    sl.addShape(pres.shapes.RECTANGLE, {
      x: px + 0.26, y: cy, w: 0.055, h: 0.5,
      fill: { color: mColors[i] }, line: { color: mColors[i] },
    });
    sl.addText(mc, {
      x: px + 0.36, y: cy, w: pw - 0.7, h: 0.5,
      fontSize: 8.5, color: C.text, fontFace: 'Calibri',
      align: 'left', valign: 'middle', margin: 0,
    });
  });

  // Bottom nav bar in phone
  const navY = py + ph - 0.52;
  sl.addShape(pres.shapes.RECTANGLE, {
    x: px + 0.16, y: navY, w: pw - 0.32, h: 0.39,
    fill: { color: C.surface }, line: { color: C.border },
  });
  const navIcons = ['＋', '☰', '⚡', '◻'];
  const nW = (pw - 0.32) / navIcons.length;
  navIcons.forEach((ic, i) => {
    sl.addText(ic, {
      x: px + 0.16 + i * nW, y: navY, w: nW, h: 0.39,
      fontSize: 12, align: 'center', valign: 'middle',
      color: i === 2 ? C.accent : C.subtle, margin: 0,
    });
  });

  // Notch
  sl.addShape(pres.shapes.OVAL, {
    x: px + pw / 2 - 0.22, y: py + 0.1, w: 0.44, h: 0.18,
    fill: { color: C.bg }, line: { color: C.bg },
  });
}

// ─── SLIDE 9 — WhatsApp Lead Card ─────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);
  addTopBar(sl);
  addTitle(sl, 'Instant Lead Handoff via WhatsApp');

  sl.addText('Configurable fields  ·  Per-entity templates  ·  Auto-sent or manual wa.me link', {
    x: 0.55, y: 0.84, w: W - 1.1, h: 0.28,
    fontSize: 12, color: C.muted, fontFace: 'Calibri', align: 'center', margin: 0,
  });

  // Left: how it works
  const steps = [
    { icon: '📝', text: 'Marketing submits lead with all details and routes to a department' },
    { icon: '📤', text: '"Send to Sales" triggers — WhatsApp card auto-generated from template' },
    { icon: '📱', text: 'Coordinator receives the card on WhatsApp instantly' },
    { icon: '✅', text: 'Sales team picks up the lead, updates status, closes the loop' },
  ];

  steps.forEach((s, i) => {
    const y = 1.28 + i * 0.95;
    sl.addShape(pres.shapes.OVAL, {
      x: 0.5, y: y + 0.14, w: 0.42, h: 0.42,
      fill: { color: C.accent, transparency: 20 }, line: { color: C.accent },
    });
    sl.addText(s.icon, {
      x: 0.5, y: y + 0.14, w: 0.42, h: 0.42,
      fontSize: 14, align: 'center', valign: 'middle', margin: 0,
    });
    if (i < steps.length - 1) {
      sl.addShape(pres.shapes.LINE, {
        x: 0.71, y: y + 0.58, w: 0, h: 0.38,
        line: { color: C.border2, pt: 1, dashType: 'dashDot' },
      });
    }
    sl.addText(s.text, {
      x: 1.02, y, w: 3.8, h: 0.72,
      fontSize: 11.5, color: C.muted, fontFace: 'Calibri',
      align: 'left', valign: 'middle', wrap: true, margin: 0,
    });
  });

  // Right: WhatsApp card mockup
  const cx = 5.35, cy = 1.1, cw = 4.15, ch = 4.22;
  sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: cx, y: cy, w: cw, h: ch,
    fill: { color: '0A3D2B' }, line: { color: '25D366', pt: 1.5 },
    shadow: mkShadow(), rectRadius: 0.18,
  });

  // Header bar
  sl.addShape(pres.shapes.RECTANGLE, {
    x: cx, y: cy, w: cw, h: 0.44,
    fill: { color: '075E54' }, line: { color: '075E54' },
  });
  sl.addText('💬  WhatsApp  ·  BU Coordinator', {
    x: cx + 0.1, y: cy, w: cw - 0.2, h: 0.44,
    fontSize: 10, bold: true, color: 'FFFFFF', fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0,
  });

  // Chat bubble
  sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: cx + 0.16, y: cy + 0.54, w: cw - 0.32, h: 3.5,
    fill: { color: '1F2C34' }, line: { color: '2A3942', pt: 0.5 },
    rectRadius: 0.1,
  });

  const cardLines = [
    { t: '🔔  New Lead — HSL506240001',  bold: true,  color: '25D366', size: 10.5 },
    { t: '━━━━━━━━━━━━━━━━━━━━',         bold: false, color: '4A5568', size: 8.5  },
    { t: '📅 24 May 2025  |  MIG-Handling', bold: false, color: 'CBD5E1', size: 9.5 },
    { t: '🏢 Acme Industrial  •  Factory',  bold: false, color: 'CBD5E1', size: 9.5 },
    { t: '📞 Ahmed Hassan  |  +20 100 000 0000', bold: false, color: 'CBD5E1', size: 9   },
    { t: '🌍 Egypt — Cairo',              bold: false, color: 'CBD5E1', size: 9.5 },
    { t: '📋 Request: Conveyor automation', bold: false, color: 'E2E8F0', size: 9.5 },
    { t: '🔗 Source: LinkedIn → Direct Call', bold: false, color: 'CBD5E1', size: 9 },
    { t: '👥 Directed to: Automation Agencies', bold: false, color: 'CBD5E1', size: 9 },
    { t: '━━━━━━━━━━━━━━━━━━━━',         bold: false, color: '4A5568', size: 8.5  },
  ];

  cardLines.forEach((line, i) => {
    sl.addText(line.t, {
      x: cx + 0.26, y: cy + 0.62 + i * 0.31, w: cw - 0.52, h: 0.3,
      fontSize: line.size, bold: line.bold, color: line.color, fontFace: 'Calibri',
      align: 'left', valign: 'middle', margin: 0,
    });
  });
}

// ─── SLIDE 10 — Business Value ────────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);
  addTopBar(sl);
  addTitle(sl, 'The Impact on the Business');

  // 3 large impact cards
  const impacts = [
    {
      icon: '⏱️', color: C.accent,
      title: 'Speed',
      headline: 'Minutes, not days',
      desc: 'Lead entry, routing, and handoff happen within minutes. No more waiting for shared files to sync or emails to be noticed.',
    },
    {
      icon: '👁️', color: C.green,
      title: 'Visibility',
      headline: 'Full pipeline, always',
      desc: 'Managers see all 4 entities in one unified view. Filter by source, status, date, or sector — any time, from any device.',
    },
    {
      icon: '🎯', color: C.violet,
      title: 'Accountability',
      headline: 'Every action traced',
      desc: 'Every field change, every handoff, every status update is logged with user, timestamp, and before/after values.',
    },
  ];

  const iW = 2.8, iH = 2.95;
  const iGap = 0.3;
  const iStartX = (W - 3 * iW - 2 * iGap) / 2;

  impacts.forEach((imp, i) => {
    const x = iStartX + i * (iW + iGap);
    const y = 1.1;

    addCard(sl, x, y, iW, iH, { fill: C.surface, border: imp.color + '60' });

    // Top glow strip
    sl.addShape(pres.shapes.RECTANGLE, {
      x, y, w: iW, h: 0.58,
      fill: { color: imp.color, transparency: 20 },
      line: { color: imp.color, transparency: 20 },
    });

    sl.addText(imp.icon + '  ' + imp.title, {
      x: x + 0.1, y: y + 0.03, w: iW - 0.2, h: 0.52,
      fontSize: 16, bold: true, color: C.text, fontFace: 'Calibri',
      align: 'center', valign: 'middle', margin: 0,
    });

    sl.addText(imp.headline, {
      x: x + 0.1, y: y + 0.7, w: iW - 0.2, h: 0.4,
      fontSize: 14, bold: true, color: imp.color, fontFace: 'Calibri',
      align: 'center', valign: 'middle', margin: 0,
    });
    addDivider(sl, x + 0.2, y + 1.15, iW - 0.4, imp.color + '40');
    sl.addText(imp.desc, {
      x: x + 0.15, y: y + 1.24, w: iW - 0.3, h: 1.55,
      fontSize: 11, color: C.muted, fontFace: 'Calibri',
      align: 'center', valign: 'top', wrap: true, margin: 0,
    });
  });

  // Bottom banner
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.3, w: W - 1.0, h: 0.82,
    fill: { color: C.accent, transparency: 88 },
    line: { color: C.accent, pt: 1 },
  });
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.3, w: 0.055, h: 0.82,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  sl.addText('Replacing 4 separate Excel files — one intelligent, role-aware, mobile-first platform for all of Makka Corp', {
    x: 0.65, y: 4.32, w: W - 1.25, h: 0.78,
    fontSize: 12.5, color: C.text, fontFace: 'Calibri', italic: true,
    align: 'left', valign: 'middle', wrap: true, margin: 0,
  });
}

// ─── SLIDE 11 — Technology ────────────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);
  addTopBar(sl);
  addTitle(sl, 'Built on Modern, Reliable Technology');

  sl.addText('Production-ready  ·  Scalable  ·  Cloud-native  ·  Open for future integrations', {
    x: 0.55, y: 0.84, w: W - 1.1, h: 0.28,
    fontSize: 12, color: C.muted, fontFace: 'Calibri', align: 'center', margin: 0,
  });

  const techs = [
    { icon: '⚡', name: 'Next.js 16',     desc: 'Full-stack React framework\nServer components, App Router',    color: C.text    },
    { icon: '🐘', name: 'PostgreSQL',      desc: 'Relational database\nNeon serverless on Vercel',               color: '336791'  },
    { icon: '🔷', name: 'Prisma ORM',      desc: 'Type-safe DB access\nMigrations & schema management',          color: C.accent  },
    { icon: '🔑', name: 'NextAuth v5',     desc: 'JWT authentication\nRole-based session management',            color: C.violet  },
    { icon: '🎙️', name: 'Groq Whisper',   desc: 'AI speech-to-text\nFree tier · Egyptian Arabic optimised',    color: C.green   },
    { icon: '▲', name: 'Vercel',           desc: 'Zero-config deployment\nEdge network, auto-scaling',           color: C.text    },
  ];

  const tW = 2.8, tH = 1.65;
  const tGap = 0.2;
  const tStartX = (W - 3 * tW - 2 * tGap) / 2;

  techs.forEach((t, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = tStartX + col * (tW + tGap);
    const y = 1.24 + row * (tH + 0.22);

    addCard(sl, x, y, tW, tH, { fill: C.surface, border: C.border });
    addCardStripe(sl, x, y, tH, t.color);

    sl.addText(t.icon + '  ' + t.name, {
      x: x + 0.14, y: y + 0.1, w: tW - 0.22, h: 0.45,
      fontSize: 13, bold: true, color: C.text, fontFace: 'Calibri',
      align: 'left', valign: 'middle', margin: 0,
    });
    addDivider(sl, x + 0.14, y + 0.56, tW - 0.28, C.border);
    sl.addText(t.desc, {
      x: x + 0.14, y: y + 0.64, w: tW - 0.22, h: 0.88,
      fontSize: 10.5, color: C.muted, fontFace: 'Calibri',
      align: 'left', valign: 'top', wrap: true, margin: 0,
    });
  });
}

// ─── SLIDE 12 — Roadmap ───────────────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);
  addTopBar(sl);
  addTitle(sl, "What's Next");

  sl.addText('NexFlow is a living platform — the foundation is shipped, and the roadmap is ambitious.', {
    x: 0.55, y: 0.84, w: W - 1.1, h: 0.28,
    fontSize: 12, color: C.muted, fontFace: 'Calibri', align: 'center', margin: 0,
  });

  // Horizontal timeline line  (moved up from 2.56 → 1.62 to close dead space)
  sl.addShape(pres.shapes.LINE, {
    x: 0.9, y: 1.62, w: W - 1.8, h: 0,
    line: { color: C.border2, pt: 2 },
  });

  const phases = [
    {
      icon: '✅', label: 'Phase 1', period: 'Now — Live',
      color: C.green, dotColor: C.green,
      items: ['Core platform for all 4 entities', 'All 4 roles fully operational', 'Analytics dashboard live', 'PWA — installable on mobile', 'Egyptian Arabic voice input'],
    },
    {
      icon: '🚧', label: 'Phase 2', period: 'Q3 2025',
      color: C.amber, dotColor: C.amber,
      items: ['WhatsApp Business API (auto-send)', 'Person-level lead assignment', 'Lead comments & conversation thread', 'Email backup notifications', 'Advanced export & reporting'],
    },
    {
      icon: '🔮', label: 'Phase 3', period: 'Q4 2025',
      color: C.violet, dotColor: C.violet,
      items: ['AI lead scoring & priority ranking', 'CRM integrations (HubSpot / Zoho)', 'Multi-tenant SaaS (other companies)', 'Predictive pipeline analytics', 'Mobile native apps (React Native)'],
    },
  ];

  const phW = 2.8, phH = 2.95;
  const phGap = 0.3;
  const phStartX = (W - phases.length * phW - (phases.length - 1) * phGap) / 2;

  phases.forEach((ph, i) => {
    const x = phStartX + i * (phW + phGap);
    const dotX = x + phW / 2;

    // Timeline dot (shifted up 0.94" to match new line y=1.62)
    sl.addShape(pres.shapes.OVAL, {
      x: dotX - 0.2, y: 1.42, w: 0.4, h: 0.4,
      fill: { color: ph.dotColor }, line: { color: ph.dotColor },
    });
    sl.addShape(pres.shapes.LINE, {
      x: dotX, y: 1.82, w: 0, h: 0.26,
      line: { color: ph.dotColor, pt: 1.5, dashType: 'solid' },
    });

    // Phase card (shifted up 0.94")
    const cardY = 2.08;
    addCard(sl, x, cardY, phW, phH, { fill: C.surface, border: ph.color + '60' });
    sl.addShape(pres.shapes.RECTANGLE, {
      x, y: cardY, w: phW, h: 0.62,
      fill: { color: ph.color, transparency: 20 },
      line: { color: ph.color, transparency: 20 },
    });
    sl.addText(ph.icon + '  ' + ph.label, {
      x: x + 0.1, y: cardY, w: phW * 0.62, h: 0.62,
      fontSize: 14, bold: true, color: C.text, fontFace: 'Calibri',
      align: 'left', valign: 'middle', margin: 0,
    });
    sl.addText(ph.period, {
      x: x + 0.1, y: cardY, w: phW - 0.2, h: 0.62,
      fontSize: 11, color: ph.color, fontFace: 'Calibri',
      align: 'right', valign: 'middle', margin: 0,
    });

    ph.items.forEach((item, ii) => {
      const iy = cardY + 0.72 + ii * 0.46;
      sl.addShape(pres.shapes.OVAL, {
        x: x + 0.18, y: iy + 0.12, w: 0.14, h: 0.14,
        fill: { color: ph.color }, line: { color: ph.color },
      });
      sl.addText(item, {
        x: x + 0.38, y: iy, w: phW - 0.52, h: 0.42,
        fontSize: 10, color: C.muted, fontFace: 'Calibri',
        align: 'left', valign: 'middle', margin: 0,
      });
    });
  });
}

// ─── SLIDE 13 — Closing ───────────────────────────────────────────────────────
{
  const sl = pres.addSlide();
  addBg(sl);

  // Glow effects
  sl.addShape(pres.shapes.OVAL, {
    x: 1.5, y: -2, w: 7, h: 7,
    fill: { color: C.accent, transparency: 92 },
    line: { color: C.accent, transparency: 96 },
  });
  sl.addShape(pres.shapes.OVAL, {
    x: 3.2, y: -1.2, w: 3.6, h: 3.6,
    fill: { color: C.accent, transparency: 94 },
    line: { color: C.accent, transparency: 96 },
  });

  // Bottom bar
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: H - 0.08, w: W, h: 0.08,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: H - 0.2, w: W, h: 0.12,
    fill: { color: C.accentDim, transparency: 70 },
    line: { color: C.accentDim, transparency: 70 },
  });

  // Lightning bolt circle
  sl.addShape(pres.shapes.OVAL, {
    x: 4.3, y: 0.38, w: 1.4, h: 1.4,
    fill: { color: C.accent, transparency: 15 },
    line: { color: C.accent, pt: 2 },
    shadow: { type: 'outer', blur: 22, offset: 0, angle: 135, color: C.accent, opacity: 0.55 },
  });
  sl.addText('⚡', {
    x: 4.3, y: 0.38, w: 1.4, h: 1.4,
    fontSize: 40, align: 'center', valign: 'middle', margin: 0,
  });

  // Main message
  sl.addText('NexFlow', {
    x: 1, y: 1.95, w: 8, h: 0.85,
    fontSize: 54, bold: true, color: C.text, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0, charSpacing: 5,
  });

  sl.addText('Connecting Marketing to Sales, Across Every Entity', {
    x: 1, y: 2.88, w: 8, h: 0.58,
    fontSize: 18, color: C.accent, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0,
  });

  addDivider(sl, 2.5, 3.58, 5, C.border2);

  sl.addText('Powered by Makka Corp  ·  Internal Platform  ·  Built 2025', {
    x: 1, y: 3.7, w: 8, h: 0.35,
    fontSize: 12, color: C.subtle, fontFace: 'Calibri',
    align: 'center', valign: 'middle', margin: 0, charSpacing: 1,
  });

  // Entity tags
  const tags = [
    { t: 'HSL · MIG Handling',      c: C.accent  },
    { t: 'MGL · MIG Poultry',       c: '818CF8'  },
    { t: 'MKL · EPPS',              c: 'F59E0B'  },
    { t: 'HCL · Conv Components',   c: '60A5FA'  },
  ];
  const tW2 = 1.9, tH2 = 0.32, tGap2 = 0.12;
  const tTotalW = tags.length * tW2 + (tags.length - 1) * tGap2;
  const tSX = (W - tTotalW) / 2;
  tags.forEach((tag, i) => {
    const tx = tSX + i * (tW2 + tGap2);
    sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: tx, y: 4.2, w: tW2, h: tH2,
      fill: { color: tag.c, transparency: 80 },
      line: { color: tag.c, pt: 1, transparency: 40 },
      rectRadius: 0.06,
    });
    sl.addText(tag.t, {
      x: tx, y: 4.2, w: tW2, h: tH2,
      fontSize: 9, color: C.text, fontFace: 'Calibri',
      align: 'center', valign: 'middle', margin: 0,
    });
  });
}

// ─── Write file ───────────────────────────────────────────────────────────────
pres.writeFile({ fileName: 'D:\\Projects\\nexflow\\NexFlow-Presentation.pptx' })
  .then(() => console.log('✅  NexFlow-Presentation.pptx saved'))
  .catch((e) => { console.error('❌  Error:', e); process.exit(1); });
