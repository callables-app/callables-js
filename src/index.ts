/** Callables for TypeScript. Early preview: functions can be described and run locally, not deployed yet. */

export const VERSION = "0.0.1";
export const MANIFEST_VERSION = 1; // the same manifest format as the Python SDK

/** How the launcher shows the result: markdown (a string), table (a list of records), kv (one record), file, none or json. */
export type OutputKind = "markdown" | "table" | "kv" | "file" | "none" | "json";

/** A JSON Schema for the inputs: an object whose properties become the form's fields. */
export interface InputSchema {
  type: "object";
  properties: Record<string, Record<string, unknown>>;
  required?: string[];
  [key: string]: unknown;
}

export interface DeployOptions<I, O> {
  /** Identity on the platform. Changing it creates a new function. */
  name: string;
  /** Heading people see (defaults to the name as a sentence, e.g. "Weekly report"). */
  title?: string;
  /** One line shown on the card. */
  description?: string;
  /** The form's fields. Leave it out for a function without inputs. */
  input?: InputSchema;
  /** How the result is shown (default json). */
  output?: OutputKind;
  /** Environment variable names injected at run time; values are set in the web app. */
  secrets?: string[];
  /** Cron expression in UTC (e.g. "0 9 * * MON"). Every input needs a default. */
  schedule?: string;
  /** Seconds before the run is stopped (default 300, platform maximum 900). */
  timeout?: number;
  run: (input: I) => O | Promise<O>;
}

export interface DeployedFunction<I = Record<string, unknown>, O = unknown> {
  readonly name: string;
  readonly options: DeployOptions<I, O>;
  /** Call it directly, e.g. in a test: inputs missing from `input` get their schema defaults. */
  call(input?: Partial<I>): Promise<O>;
}

/** Every deploy() lands here; manifest() reads it. */
export const registry = new Map<string, DeployedFunction<any, any>>();

const NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/** Deploy a function to Callables: teammates run it from a web form built from its input schema. */
export function deploy<I = Record<string, unknown>, O = unknown>(options: DeployOptions<I, O>): DeployedFunction<I, O> {
  if (!NAME.test(options.name)) throw new Error(`deploy: '${options.name}' isn't a valid name; use letters, digits, _ and -`);
  if (registry.has(options.name)) throw new Error(`deploy: two functions are deployed as '${options.name}'`);
  const fn: DeployedFunction<I, O> = {
    name: options.name,
    options,
    async call(input = {}) {
      return options.run({ ...defaults(options.input), ...input } as I);
    },
  };
  registry.set(options.name, fn);
  return fn;
}

function defaults(schema?: InputSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema?.properties ?? {})) if ("default" in prop) out[key] = prop.default;
  return out;
}

function titleOf(name: string): string {
  const words = name.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/** What the platform deploys, in the Python SDK's manifest format. */
export function manifest() {
  const functions = [...registry.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, options: o }) => ({
      name,
      entrypoint: name,
      title: o.title ?? titleOf(name),
      description: o.description ?? null,
      input_schema: { title: name, ...(o.input ?? { type: "object", properties: {} }), "x-order": Object.keys(o.input?.properties ?? {}) },
      output_kind: o.output ?? "json",
      secrets: o.secrets ?? [],
      schedule: o.schedule ?? null,
      timeout: o.timeout ?? 300,
      group: null,
      action: name,
      next: [],
    }));
  return { manifest_version: MANIFEST_VERSION, sdk_version: VERSION, language: "typescript", functions, errors: [] };
}
