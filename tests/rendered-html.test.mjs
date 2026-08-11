import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function getWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders the teacher assistant dashboard", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>다솜쌤 \| AI 교사 도우미<\/title>/);
  assert.match(html, /다솜쌤/);
});

test("renders the message generator route", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("http://localhost/messages", { headers: { accept: "text/html" } }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /메시지 생성기/);
  assert.match(html, /입력 내용은 저장하지 않아요/);
});

test("rejects an incomplete message request before calling AI", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/messages/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageType: "문의 답변" }),
    }),
    env,
    context,
  );

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.error, "필수 입력값을 확인해 주세요.");
  assert.ok(payload.fields.facts);
  assert.ok(payload.fields.request);
});

test("keeps message privacy and writing rules in the server service", async () => {
  const [service, rules, route] = await Promise.all([
    readFile(new URL("../app/lib/ai-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/message-generator.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/messages/generate/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(service, /process\.env\.OPENAI_API_KEY/);
  assert.match(service, /store:\s*false/);
  assert.doesNotMatch(service + route, /console\.(log|info|debug)/);
  assert.match(rules, /입력된 사실만 사용/);
  assert.match(rules, /다른 학생의 이름이나 정보를 포함하지 마세요/);
  assert.match(rules, /2~3문장/);
  assert.match(rules, /5~7문장/);
});
