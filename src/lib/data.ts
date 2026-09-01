import { readFile, writeFile, rename, mkdir } from "fs/promises";
import path from "path";
import { Mutex } from "async-mutex";

const mutexes = new Map<string, Mutex>();

// Resolved per call rather than captured at module load. The running server
// never changes its working directory, so this is equivalent in production,
// but it keeps the data directory a function of the current environment
// instead of of import order.
function dataDir(): string {
  return path.resolve(process.cwd(), "data");
}

function filePathFor(filename: string): string {
  return path.join(dataDir(), filename);
}

function getMutex(filename: string): Mutex {
  let mutex = mutexes.get(filename);
  if (!mutex) {
    mutex = new Mutex();
    mutexes.set(filename, mutex);
  }
  return mutex;
}

/**
 * A data file exists but does not contain valid JSON.
 *
 * This is deliberately distinct from the file being absent. An absent file is
 * a normal first-run condition and may be replaced by defaults. A file that is
 * present but unreadable holds user work that no longer parses, so it is never
 * overwritten and never silently substituted with empty data.
 */
export class DataFileCorruptError extends Error {
  readonly filename: string;
  readonly filePath: string;

  constructor(filename: string, filePath: string, cause: unknown) {
    super(
      `Data file corrupted: ${filename} is not valid JSON. ` +
        `It was left untouched at ${filePath} so it can be recovered. ` +
        `Repair or move the file aside, then retry.`
    );
    this.name = "DataFileCorruptError";
    this.filename = filename;
    this.filePath = filePath;
    this.cause = cause;
  }
}

const MISSING = Symbol("data-file-missing");

async function ensureDataDir(): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
}

/** Reads and parses a data file. Does not take the lock. */
async function readParsed<T>(filename: string): Promise<T | typeof MISSING> {
  const filePath = filePathFor(filename);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return MISSING;
    throw err;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new DataFileCorruptError(filename, filePath, err);
  }
}

/** Atomically replaces a data file. Does not take the lock. */
async function writeParsed<T>(filename: string, data: T): Promise<void> {
  await ensureDataDir();
  const filePath = filePathFor(filename);
  const tmpPath = `${filePath}.tmp`;
  await writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  await rename(tmpPath, filePath);
}

/**
 * Reads a data file, falling back to `fallback` only when the file does not
 * exist yet. A file that exists but cannot be parsed rejects with
 * {@link DataFileCorruptError} rather than reporting empty data.
 */
export async function readDataSafe<T>(filename: string, fallback: T): Promise<T> {
  const parsed = await readParsed<T>(filename);
  return parsed === MISSING ? fallback : parsed;
}

/**
 * Performs a read, modify and write of a data file while holding that file's
 * lock for the whole operation.
 *
 * This is the only supported way to change persisted state. Reading outside
 * the lock and writing inside it lets two overlapping callers read the same
 * snapshot, at which point the second write silently discards the first one's
 * change while both report success.
 *
 * `mutate` receives the parsed contents and mutates them in place. Its return
 * value is passed back to the caller. The file is persisted after `mutate`
 * resolves, so a mutator that throws leaves the file untouched.
 *
 * `fallback` is a factory, not a value, so each call gets its own object and
 * one caller's mutation cannot leak into another's default.
 */
export async function mutateData<T, R>(
  filename: string,
  fallback: () => T,
  mutate: (data: T) => R | Promise<R>
): Promise<R> {
  return getMutex(filename).runExclusive(async () => {
    const parsed = await readParsed<T>(filename);
    const data = parsed === MISSING ? fallback() : parsed;
    const result = await mutate(data);
    await writeParsed(filename, data);
    return result;
  });
}
