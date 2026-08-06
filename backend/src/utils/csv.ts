/** Quotes a field (doubling inner quotes) only when it contains a comma, quote, or newline — otherwise left as plain text. */
function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Builds a CSV document (CRLF line endings) from rows of arbitrary cell values. Rows may have uneven lengths (e.g. a title row followed by a header row). */
export function toCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}
