import * as assert from "assert";
import { parseProblemPage } from "./atcoder";

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
