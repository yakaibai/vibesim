import assert from "node:assert/strict";
import { evalExpression } from "../utils/expr.js";
import { exprToLatex, estimateLatexWidth } from "../utils/expr.js";

const near = (actual, expected, tol = 1e-10) => {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `expected ${actual} to be within ${tol} of ${expected}`
  );
};

near(evalExpression("sin(0)", {}), 0);
near(evalExpression("cos(0)", {}), 1);
near(evalExpression("exp(1)", {}), Math.E);
near(evalExpression("sqrt(cos(0))", {}), 1);
near(evalExpression("2*u + sqrt(cos(u))", { u: 0 }), 2);
near(evalExpression("sin(-1)", {}), Math.sin(-1));
near(evalExpression("clamp(2, 0, 1)", {}), 1);
near(evalExpression("clamp(-1, 0, 1)", {}), 0);
near(evalExpression("sinc(0)", {}), 1);
near(evalExpression("sinc(1)", {}), Math.sin(Math.PI) / Math.PI);
near(evalExpression("min(1, 2)", {}), 1);
near(evalExpression("max(1, 2, 3)", {}), 3);

assert.equal(exprToLatex("2*u + sqrt(cos(u))"), "2 u + \\sqrt{\\cos(u)}");
assert.equal(exprToLatex("min(1, 2)"), "\\min(1, 2)");
assert.equal(exprToLatex("sinc(u)"), "\\operatorname{sinc}(u)");

const shortLatex = exprToLatex("u");
const longLatex = exprToLatex("2*u + sqrt(cos(u)) + sinc(u) + clamp(u,0,1)");
const shortWidth = estimateLatexWidth(shortLatex);
const longWidth = estimateLatexWidth(longLatex);
assert.ok(longWidth > shortWidth, "expected longer expressions to produce wider blocks");
assert.ok(shortWidth >= 120, "expected minimum width");

const sinLatex = exprToLatex("sin(u)*u+7");
const sinWidth = estimateLatexWidth(sinLatex);
assert.ok(sinWidth >= 240, "expected sin(u)*u+7 to produce a wide block estimate");
