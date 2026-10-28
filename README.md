# Callables for TypeScript

> **Early preview.** You can describe functions and run them locally, but the platform doesn't deploy TypeScript yet. For production use, see the [Python SDK](https://github.com/callables-app/callables-python).

[Callables](https://callables.app) turns functions into tools your team can run: a web form, schedules and run history, from code you push to GitHub.

```bash
npm install callables
```

```ts
import { deploy } from "callables";

export const weeklyReport = deploy({
  name: "weekly_report",
  description: "Sales numbers for the last few weeks.",
  input: {
    type: "object",
    properties: { team: { type: "string" }, weeks: { type: "integer", default: 1 } },
    required: ["team"],
  },
  output: "markdown",
  secrets: ["CRM_TOKEN"],
  run: async ({ team, weeks }: { team: string; weeks: number }) => `# ${team}: last ${weeks} week(s)`,
});

await weeklyReport.call({ team: "Sales" }); // run it locally
```

`input` is a JSON Schema whose properties become the form's fields. `output` says how the result is shown: `markdown`, `table`, `kv`, `file`, `none` or `json` (the default).

## License

Apache-2.0. See [LICENSE](LICENSE). Copyright 2026 Nomial. "Callables" is a trademark of Nomial and is not covered by the license.
