import * as assert from "assert";
import { parseProblemPage } from "./atcoder";
import { setSessionCookie, getSessionCookie } from "./tools/fetch";

const sampleHtml = `
<html>
  <head><title>A - Sample</title></head>
  <body>
    <div class="part">
      <section>
        <h3>Sample Input 1</h3>
        <pre>3\n1 2 3</pre>
      </section>
      <section>
        <h3>Sample Output 1</h3>
        <pre>6</pre>
      </section>
    </div>
  </body>
</html>`;

const result = parseProblemPage(sampleHtml, "https://atcoder.jp/contests/abc345/tasks/abc345_a");
assert.strictEqual(result.title, "A - Sample");
assert.deepStrictEqual(result.samples, [{ index: 1, input: "3\n1 2 3", output: "6" }]);
console.log("atcoder parser test passed");

const htmlWithMath = `
<html>
  <head><title>B - Math Test</title></head>
  <body>
    <span class="lang-en">
      <h3>Problem Statement</h3>
      <p>Given \\(N\\) and \\(K\\), calculate <var>N</var> + <var>K</var>.</p>
      <h3>Constraints</h3>
      <ul><li><var>1 \\leq N \\leq 10^5</var></li></ul>
    </span>
  </body>
</html>`;

const mathResult = parseProblemPage(htmlWithMath, "https://atcoder.jp/contests/abc345/tasks/abc345_b");
assert.ok(mathResult.statement.includes("<p>"), "should have <p> tags preserved");
assert.ok(mathResult.statement.includes('class="katex"'), "should have KaTeX rendered math");
assert.ok(mathResult.constraints.includes("<ul>"), "should have <ul> tags preserved");
assert.ok(mathResult.constraints.includes('class="katex"'), "should have math rendered");
console.log("HTML/LaTeX rendering test passed");

// Cookie tests
assert.strictEqual(getSessionCookie(), "", "default cookie should be empty");
setSessionCookie("REVEL_SESSION=test123");
assert.strictEqual(getSessionCookie(), "REVEL_SESSION=test123", "cookie should be set");
setSessionCookie("");
assert.strictEqual(getSessionCookie(), "", "cookie should be cleared");
console.log("Cookie test passed");
