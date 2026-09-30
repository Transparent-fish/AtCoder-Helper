import * as assert from "assert";
import { buildTranslateBody, parseTranslateResponse } from "./tools/ai";

interface ParsedBody {
    model: string;
    temperature: number;
    stream: boolean;
    messages: Array<{ role: string; content: string }>;
}

const body = JSON.parse(buildTranslateBody("hello", "ZH", "deepseek-chat")) as ParsedBody;
assert.strictEqual(body.model, "deepseek-chat", "model should be passed through");
assert.strictEqual(body.stream, false, "stream should be false");
assert.strictEqual(body.temperature, 0, "temperature should be 0");
assert.strictEqual(body.messages.length, 2, "should contain system + user messages");
assert.strictEqual(body.messages[0].role, "system", "first message should be system");
assert.ok(body.messages[0].content.includes("Simplified Chinese"), "system prompt should target Chinese");
assert.strictEqual(body.messages[1].role, "user", "second message should be user");
assert.strictEqual(body.messages[1].content, "hello", "user content should be the input text");
console.log("ai buildTranslateBody test passed");

const success = JSON.stringify({ choices: [{ message: { content: "你好" } }] });
assert.strictEqual(parseTranslateResponse(success), "你好", "should extract message content");
console.log("ai parseTranslateResponse success test passed");

const errorBody = JSON.stringify({ error: { message: "invalid key" } });
assert.strictEqual(parseTranslateResponse(errorBody), null, "error body should yield null");
assert.strictEqual(parseTranslateResponse("not json"), null, "invalid json should yield null");
assert.strictEqual(parseTranslateResponse(""), null, "empty body should yield null");
console.log("ai parseTranslateResponse failure test passed");
