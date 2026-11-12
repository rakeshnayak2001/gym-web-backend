export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Parse with a zod schema or throw a 400 with readable field errors. */
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    const first = Object.entries(fields)[0];
    throw new HttpError(400, first ? `${first[0]}: ${first[1]}` : 'Invalid request', fields);
  }
  return result.data;
}

/** Start/end of a calendar day given as YYYY-MM-DD, in UTC. */
export function dayRange(isoDay) {
  const start = new Date(`${isoDay}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new HttpError(400, 'Invalid date, expected YYYY-MM-DD');
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export const todayIso = () => new Date().toISOString().slice(0, 10);
