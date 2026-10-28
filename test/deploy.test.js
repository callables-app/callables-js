import { test } from "node:test";
import assert from "node:assert/strict";
import { deploy, manifest, registry } from "../dist/index.js";

test("deploy registers a function and builds its manifest entry", async () => {
  registry.clear();
  const report = deploy({
    name: "weekly_report",
    description: "Sales numbers for the last few weeks.",
    input: { type: "object", properties: { team: { type: "string" }, weeks: { type: "integer", default: 1 } }, required: ["team"] },
    output: "markdown",
    secrets: ["CRM_TOKEN"],
    run: ({ team, weeks }) => `# ${team}: ${weeks} week(s)`,
  });

  assert.equal(await report.call({ team: "Sales" }), "# Sales: 1 week(s)");

  const { functions, manifest_version } = manifest();
  assert.equal(manifest_version, 1);
  assert.equal(functions.length, 1);
  assert.equal(functions[0].title, "Weekly report");
  assert.equal(functions[0].output_kind, "markdown");
  assert.deepEqual(functions[0].input_schema["x-order"], ["team", "weeks"]);
  assert.deepEqual(functions[0].secrets, ["CRM_TOKEN"]);
});

test("names must be unique and valid", () => {
  registry.clear();
  deploy({ name: "ping", run: () => "pong" });
  assert.throws(() => deploy({ name: "ping", run: () => "pong" }), /two functions/);
  assert.throws(() => deploy({ name: "bad name", run: () => null }), /isn't a valid name/);
});
