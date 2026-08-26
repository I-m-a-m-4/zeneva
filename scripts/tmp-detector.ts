/**
 * Checks that translated screens stay translated — `npm run test:i18n`.
 *
 * A user picked Korean, the sidebar switched to Korean, and the whole page body
 * next to it stayed English. The cause was not a broken translation system: it
 * was that most pages never called `t()` at all. So the risk this guard exists
 * to catch is not "a locale is missing a key" — `tsc` already catches that,
 * because every catalog is `const xx: Messages = typeof en` and a new key in
 * `en.ts` makes the other ten type errors until they have it. Parity is
 * deliberately NOT re-checked here.
 *
 * The two things the compiler cannot see:
 *
 *   1. A file that already imports `useI18n` gaining a fresh English literal.
 *      This is the common regression — somebody adds a button to a page that is
 *      otherwise fully wired, and it is English in eleven languages.
 *   2. A file that is supposed to be translated silently losing its `useI18n`
 *      import (or a batch's file never getting one). REQUIRED_COVERAGE grows as
 *      each batch lands, so the guard tightens with the work instead of failing
 *      on day one against surfaces nobody has reached yet.
 *
 * Detection is done over the real TypeScript AST (`ts.createSourceFile`), not
 * regexes. A regex scanner over TSX cannot tell `Array<string>` from a JSX text
 * node, or `a > b` from a closing tag, and a guard that reports false positives
 * gets switched off — at which point it protects nothing. The AST gives exact
 * `JsxText` nodes and exact attribute values, so every finding below is real.
 *
 * Must be `.ts`, never `.mts`: there is no `"type": "module"` in this repo, so
 * `src/**` compiles to CJS and a true-ESM importer fails named-import interop
 * (see the rating, import, launch-funnel and catalog-state harnesses, which all
 * hit this).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

let pass = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    pass++;
  } else {
    failures.push(`${name}${detail === undefined ? '' : ` — got ${JSON.stringify(detail)}`}`);
  }
}

// ---------------------------------------------------------------------------
// What is out of scope, and why each one.

const SKIP_DIRS = [
  // shadcn primitives — no product copy, and upstream churn would fight us.
  path.join('src', 'components', 'ui'),
  // Platform-owner surfaces. Explicitly out of scope: one person reads them,
  // and that person wrote them.
  path.join('src', 'components', 'admin'),
  path.join('src', 'app', 'admin-imamshaffy'),
  // Catalogs are the translations. Scanning them would flag every value.
  path.join('src', 'lib', 'i18n'),
];

/**
 * `loading.tsx` / `skeleton.tsx` are server components and cannot reach
 * `useI18n`; CLAUDE.md forbids copy in them for exactly that reason, so there
 * is nothing here to translate and nothing to check.
 */
const SKIP_FILE_PATTERNS = [/\.test\.[jt]sx?$/, /(^|[\\/])(loading|skeleton)\.tsx$/, /\.d\.ts$/];

function skipped(rel: string): boolean {
  if (SKIP_DIRS.some(d => rel === d || rel.startsWith(d + path.sep))) return true;
  return SKIP_FILE_PATTERNS.some(p => p.test(rel));
}

function walkDir(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(ROOT, abs);
    if (entry.isDirectory()) {
      if (!skipped(rel)) walkDir(abs, out);
    } else if (/\.tsx?$/.test(entry.name) && !skipped(rel)) {
      out.push(abs);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// What counts as user-visible.

/**
 * Attributes that render to the screen or to a screen reader. An allow-list,
 * not a deny-list: the overwhelming majority of JSX attributes carry class
 * names, ids, routes, variant tokens and event handlers, so listing what to
 * flag is both shorter and safe when a new attribute appears.
 */
const VISIBLE_ATTRS = new Set([
  'placeholder',
  'title',
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'alt',
  'label',
  'description',
  'emptyMessage',
  'tooltip',
  'confirmText',
  'cancelText',
  /*
   * This app's own copy-bearing props. `title` alone is not enough: `PageTitle`
   * takes `title` **and** `subtitle`, so the guard passed every page header in the
   * app while flagging only its first half — and `FeatureGate`'s two props are the
   * upgrade pitch, which is the last thing that should be reaching a Korean shop in
   * English. Found by hand-reading the reports page after the detector called it
   * clean at 49 findings when it had 58.
   *
   * An allow-list has to be widened deliberately, so: grep for `="[A-Z]…"` on any
   * new component prop that renders text before adding it to a batch.
   */
  'subtitle',
  'featureName',
  'featureDescription',
  'hint',
  'heading',
  'emptyText',
  'empty',
  'body',
]);

/**
 * Object-literal keys that reach the screen. `toast({ title, description })` is
 * the big one — a toast is copy, and it is the single most common place an
 * English string survives a translation pass because it is not in the markup.
 *
 * `body` is deliberately **not** here, though it is in VISIBLE_ATTRS above.
 * `{ title, body }` is the shape of a notification *document* — `notification-rules.ts`
 * builds them to be written to Firestore, and per the pattern the rest of this
 * codebase already follows (`BulkSkip.code`, `MatchExplanationCode`) a stored record
 * keeps its English and carries a code alongside. Flagging it here would demand the
 * wrong fix.
 */
const VISIBLE_KEYS = new Set(['title', 'description', 'label', 'placeholder', 'subtitle']);

/**
 * Not translated on purpose, per the extraction rules: brand and product names,
 * platform names, currency/unit symbols, and `N/A` (which has its own key,
 * `inventory.notAvailable`, and is deliberately left as the literal glyph in
 * table cells). Matched against the whole trimmed string, case-sensitively —
 * "Google" alone is a brand, "Google blocked the popup" is a sentence.
 */
const ALLOWED_LITERALS = new Set([
  'Zeneva',
  'Zen AI',
  'Zeneva Premium',
  'Google',
  'Google Play',
  'Microsoft Store',
  'Apple',
  'App Store',
  'WhatsApp',
  'Gmail',
  'SMS',
  'PDF',
  'CSV',
  'XLSX',
  'Excel',
  'SKU',
  'POS',
  'AI',
  'N/A',
  'NGN',
  'USD',
  'kg',
  'g',
  'ml',
  'cl',
  'L',
  'x',
  'v',
  'e.g.',
  'OK',
]);

/** A string with no letters at all is a number, a symbol or a format token. */
function hasLetters(s: string): boolean {
  return /[A-Za-z]{2,}/.test(s);
}

function isUserVisibleText(raw: string): boolean {
  const s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return false;
  if (!hasLetters(s)) return false;
  if (ALLOWED_LITERALS.has(s)) return false;
  // A bare interpolation or an entity is not authored copy.
  if (/^(\{[^}]*\}|&[a-z]+;|&#\d+;)$/.test(s)) return false;
  return true;
}

/**
 * Strings that never reach a user, however English they look. Developer channels
 * are deliberately left in English: a `console.error` is read by whoever is
 * debugging, and an internal `throw` is caught and replaced by a translated
 * toast at the boundary — translating either would make a bug report arrive in
 * a language the person reading it may not have.
 */
function inDeveloperChannel(node: ts.Node): boolean {
  for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
    if (ts.isCallExpression(p)) {
      const target = p.expression.getText();
      if (/^console\./.test(target)) return true;
      if (/^(reportAnomaly|logErrorToFirestore)$/.test(target)) return true;
    }
    if (ts.isNewExpression(p) && p.expression.getText() === 'Error') return true;
    if (ts.isThrowStatement(p)) return true;
    // Import/export specifiers and module paths.
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
    // Next `metadata` exports are search-engine copy on server components,
    // which cannot reach `useI18n` at all.
    if (ts.isVariableDeclaration(p) && p.name.getText() === 'metadata') return true;
  }
  return false;
}

type Finding = { line: number; kind: string; text: string };

/**
 * Escape hatch: an `i18n-exempt` comment. Needed because some English literals
 * are correct English in every language — the Nigerian bank list on the settings
 * page is `{ label: 'Access Bank', value: '044' }` twenty-odd times over, and
 * "Access Bank" is the institution's name, not copy. Without a way to say so,
 * the only ways to get that page green would be to translate proper nouns or to
 * drop `label` from VISIBLE_KEYS — and dropping it would blind the guard to every
 * real `label="Save"` in the app.
 *
 * Deliberately an inline comment rather than a path list in this file: the
 * exemption sits next to the thing it exempts, where the person editing that line
 * sees it and a reviewer can judge the reason. A list here is invisible from the
 * code it silences, which is how allow-lists rot.
 *
 * Three placements, cheapest first:
 *   `label: 'Access Bank', // i18n-exempt — bank name`   same line
 *   `// i18n-exempt` on the line directly above a single literal
 *   `// i18n-exempt` above a `const`/`let` statement, which covers the whole
 *   declaration — one comment for an entire data array.
 *
 * The reason may run to several lines; the marker carries across its own comment
 * block so what matters is the block sitting above the node, not the marker word
 * being on the last line of it.
 *
 * There is no file-level or directory-level form on purpose. Whole-file
 * suppression is indistinguishable from never having wired the file up, which is
 * the exact failure this guard exists to catch.
 */
function exemptMarkerLines(source: string): Set<number> {
  const lines = new Set<number>();
  const all = source.split(/\r\n|\r|\n/);

  all.forEach((text, i) => {
    if (!/(\/\/|\/\*|\*)\s*i18n-exempt\b/.test(text)) return;
    lines.add(i + 1);

    // A marker's justification usually runs past one line, and the node it covers
    // sits below the *last* line of that comment block — so `line - 1` in isExempt
    // would land inside the reason text and miss. Extend the marker forward over
    // the contiguous comment lines that follow it. Anything that is not a comment
    // stops the run, so a marker can never reach past its own block.
    for (let j = i + 1; j < all.length; j++) {
      if (!/^\s*(\/\/|\*|\/\*)/.test(all[j])) break;
      lines.add(j + 1);
    }
  });

  return lines;
}

/** The outermost statement a node sits in, so a marker above it covers all of it. */
function enclosingStatement(node: ts.Node): ts.Node | undefined {
  let found: ts.Node | undefined;
  for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
    if (ts.isVariableStatement(p) || ts.isExpressionStatement(p)) found = p;
  }
  return found;
}

function isExempt(node: ts.Node, sf: ts.SourceFile, markers: Set<number>): boolean {
  if (markers.size === 0) return false;
  const lineOf = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const line = lineOf(node);
  if (markers.has(line) || markers.has(line - 1)) return true;
  const stmt = enclosingStatement(node);
  if (stmt) {
    const stmtLine = lineOf(stmt);
    if (markers.has(stmtLine - 1) || markers.has(stmtLine)) return true;
  }
  return false;
}

function scanSource(source: string, abs = 'synthetic.tsx'): Finding[] {
  const sf = ts.createSourceFile(abs, source, ts.ScriptTarget.Latest, /* setParentNodes */ true, ts.ScriptKind.TSX);
  const markers = exemptMarkerLines(source);
  const findings: Finding[] = [];

  const at = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const record = (node: ts.Node, kind: string, text: string) => {
    if (isExempt(node, sf, markers)) return;
    findings.push({ line: at(node), kind, text: text.replace(/\s+/g, ' ').trim().slice(0, 72) });
  };

  const visit = (node: ts.Node): void => {
    // 1. Bare text between tags: <p>Save Product</p>
    if (ts.isJsxText(node)) {
      if (isUserVisibleText(node.text)) record(node, 'jsx-text', node.text);
    }

    // 2. A visible attribute given a literal: placeholder="Search products"
    else if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf);
      const init = node.initializer;
      if (VISIBLE_ATTRS.has(name) && init) {
        if (ts.isStringLiteral(init) && isUserVisibleText(init.text)) {
          record(node, `attr:${name}`, init.text);
        } else if (
          init &&
          ts.isJsxExpression(init) &&
          init.expression &&
          (ts.isStringLiteral(init.expression) || ts.isNoSubstitutionTemplateLiteral(init.expression)) &&
          isUserVisibleText(init.expression.text)
        ) {
          record(node, `attr:${name}`, init.expression.text);
        }
      }
    }

    // 3. A visible object key given a literal: toast({ title: 'Saved' })
    else if (ts.isPropertyAssignment(node)) {
      const key = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : null;
      const val = node.initializer;
      if (
        key &&
        VISIBLE_KEYS.has(key) &&
        (ts.isStringLiteral(val) || ts.isNoSubstitutionTemplateLiteral(val)) &&
        isUserVisibleText(val.text) &&
        !inDeveloperChannel(node)
      ) {
        record(node, `key:${key}`, val.text);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

function scanFile(abs: string): Finding[] {
  return scanSource(fs.readFileSync(abs, 'utf8'), abs);
}

// ---------------------------------------------------------------------------

export { scanFile };
