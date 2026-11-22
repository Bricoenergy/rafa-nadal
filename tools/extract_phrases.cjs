// Extracts every English phrase the app can speak, writes tools/phrases.json
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
function literal(name) {
  const i = html.indexOf("const " + name);
  if (i < 0) throw new Error("missing " + name);
  let j = html.indexOf("=", i) + 1;
  while (/\s/.test(html[j])) j++;
  const open = html[j], close = open === "[" ? "]" : "}";
  let depth = 0, k = j, q = null;
  for (; k < html.length; k++) {
    const c = html[k];
    if (q) { if (c === "\\") { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === open || c === "[" || c === "{" || c === "(") depth++;
    else if (c === close || c === "]" || c === "}" || c === ")") { depth--; if (depth === 0) break; }
  }
  const src = html.slice(j, k + 1);
  const stub = new Proxy({}, { has: (_, p) => p !== "Function", get: () => () => "" });
  return new Function("stub", "with(stub){return " + src + "}")(stub);
}
const VOCAB = literal("VOCAB"), DIAGRAMS = literal("DIAGRAMS"), EXPL = literal("EXPL"), COMP = literal("COMP");
const mainForm = en => en.replace(/\s*\(.*\)$/, "").replace(/^to /, "");
const words = new Set(), sentences = new Set();
for (const v of VOCAB) { words.add(v[0]); words.add(mainForm(v[0])); }
for (const d of DIAGRAMS) for (const p of d.points) words.add(p.id);
for (const x of EXPL) { if (x.intro) sentences.add(x.intro); for (const s of x.steps || []) sentences.add(s.en); }
for (const c of COMP) if (c.model) sentences.add(c.model);
const out = { words: [...words].sort(), sentences: [...sentences], vocab_es: VOCAB.map(v => [mainForm(v[0]), v[1]]) };
fs.writeFileSync(path.join(__dirname, "phrases.json"), JSON.stringify(out, null, 1));
console.log(out.words.length, "words,", out.sentences.length, "sentences");
