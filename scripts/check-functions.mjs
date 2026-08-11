import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const FUNC_LIMIT = Number(process.env.FUNCTION_LINE_LIMIT ?? 80);
const TSX_FILE_LIMIT = Number(process.env.TSX_FILE_LINE_LIMIT ?? 600);
const ROOT = process.cwd();
const DIRS = ["apps", "packages"];
const IGNORE = new Set(["node_modules", "dist", "out-test", "out", ".turbo", "release"]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    if (IGNORE.has(e)) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

const FunctionKinds = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
  ts.SyntaxKind.Constructor,
]);

function funcName(node) {
  const n = node.name;
  if (n && (ts.isIdentifier(n) || ts.isStringLiteral(n))) return n.text;
  return "<anonymous>";
}

function scanTs(file) {
  const src = readFileSync(file, "utf-8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out = [];
  const visit = (node) => {
    if (FunctionKinds.has(node.kind)) {
      const start = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
      const end = sf.getLineAndCharacterOfPosition(node.getEnd()).line;
      const len = end - start + 1;
      if (len > FUNC_LIMIT) {
        out.push({ name: funcName(node), line: start + 1, len });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

function countLines(file) {
  return readFileSync(file, "utf-8").split("\n").length;
}

const files = DIRS.flatMap((d) => walk(join(ROOT, d)));
const violations = [];

for (const f of files) {
  const rel = relative(ROOT, f);
  if (/\.tsx$/.test(f)) {
    const total = countLines(f);
    if (total > TSX_FILE_LIMIT) {
      violations.push({ file: rel, line: 1, name: "<file>", len: total, kind: "tsx-file" });
    }
  } else {
    for (const o of scanTs(f)) {
      violations.push({ file: rel, ...o, kind: "ts-func" });
    }
  }
}

violations.sort((a, b) => b.len - a.len);

if (violations.length > 0) {
  console.log(`tsx 文件超过 ${TSX_FILE_LIMIT} 行 / ts 函数超过 ${FUNC_LIMIT} 行:`);
  console.log("");
  for (const v of violations) {
    console.log(
      `${v.file}${v.kind === "tsx-file" ? "" : `:${v.line}`}  ${v.name}  (${v.len} ${v.kind === "tsx-file" ? "file lines" : "lines"})`
    );
  }
  console.log("");
  console.log(`Total: ${violations.length} violation(s) in ${files.length} file(s)`);
} else {
  console.log(`All checks passed (tsx <= ${TSX_FILE_LIMIT} lines, ts functions <= ${FUNC_LIMIT} lines, ${files.length} files scanned).`);
}

process.exit(violations.length ? 1 : 0);
