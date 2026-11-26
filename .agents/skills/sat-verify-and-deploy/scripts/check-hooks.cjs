/**
 * Static TypeScript AST scanner for React Rules-of-Hooks violations across app/ and components/.
 * Detects any `use*()` hook called after a component-level early return or inside conditionals/loops.
 */
const ts = require("typescript");
const fs = require("fs");
const path = require("path");

function walkTsx(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!["node_modules", ".next", ".git"].includes(entry)) {
        results.push(...walkTsx(full));
      }
    } else if (/\.tsx$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

const files = [...walkTsx("app"), ...walkTsx("components")];
const issues = [];

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function checkComponentBody(name, body) {
    if (!body || !ts.isBlock(body)) return;
    let seenReturn = false;
    let firstReturnLine = 0;

    function hasDirectReturn(node) {
      if (ts.isReturnStatement(node)) return true;
      if (ts.isFunctionLike(node)) return false;
      let found = false;
      ts.forEachChild(node, (child) => {
        if (hasDirectReturn(child)) found = true;
      });
      return found;
    }

    function findHooks(node, inConditional) {
      if (ts.isFunctionLike(node)) return;
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        let callee = "";
        if (ts.isIdentifier(expr)) {
          callee = expr.text;
        } else if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)) {
          callee = expr.name.text;
        }
        if (/^use[A-Z]/.test(callee)) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          if (seenReturn) {
            issues.push(
              `${file}:${line} [${name}] ${callee}() called after early return at line ${firstReturnLine}`
            );
          } else if (inConditional) {
            issues.push(
              `${file}:${line} [${name}] ${callee}() called inside conditional or loop`
            );
          }
        }
      }
      const nextConditional =
        inConditional ||
        ts.isIfStatement(node) ||
        ts.isConditionalExpression(node) ||
        ts.isForStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isSwitchStatement(node) ||
        (ts.isBinaryExpression(node) &&
          (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            node.operatorToken.kind === ts.SyntaxKind.BarBarToken));

      ts.forEachChild(node, (child) => findHooks(child, nextConditional));
    }

    for (const stmt of body.statements) {
      findHooks(stmt, false);
      if (!seenReturn && hasDirectReturn(stmt)) {
        seenReturn = true;
        firstReturnLine = sf.getLineAndCharacterOfPosition(stmt.getStart()).line + 1;
      }
    }
  }

  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]|^use[A-Z]/.test(node.name.text)) {
      checkComponentBody(node.name.text, node.body);
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      /^[A-Z]|^use[A-Z]/.test(node.name.text) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      checkComponentBody(node.name.text, node.initializer.body);
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
}

if (issues.length > 0) {
  console.error(`React Rules-of-Hooks check FAILED (${issues.length} violation(s)):`);
  for (const issue of issues) {
    console.error(` - ${issue}`);
  }
  process.exit(1);
}

console.log(`React Rules-of-Hooks check PASSED (${files.length} TSX files, 0 violations)`);
