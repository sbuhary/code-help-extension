import * as path from 'node:path';

export interface Explanation {
  start: number;
  end: number;
  text: string;
}

/** This is a sectioned plain-text format, not Java's escaped Properties syntax. */
export function parseExplanationFile(input: string): { introduction: string; sections: Explanation[] } {
  const result: Explanation[] = [];
  let introduction = '';
  let hasIntroduction = false;
  let current: { start: number; end: number; lines: string[]; introduction?: boolean } | undefined;
  const finish = () => {
    if (!current) { return; }
    // Remove separator blank lines only; preserve indentation and internal paragraphs.
    while (current.lines.length && current.lines[0].trim() === '') { current.lines.shift(); }
    while (current.lines.length && current.lines.at(-1)!.trim() === '') { current.lines.pop(); }
    const text = current.lines.join('\n');
    if (current.introduction) {
      if (!hasIntroduction) { introduction = text; hasIntroduction = true; }
    } else {
      result.push({ start: current.start, end: current.end, text });
    }
  };
  for (const line of input.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/)) {
    const header = /^\s*\[(\d+)(?:-(\d+))?\]\s*$/.exec(line);
    if (/^\s*\[introduction\]\s*$/i.test(line)) {
      finish();
      current = { start: 0, end: 0, lines: [], introduction: true };
    } else if (header) {
      finish();
      const start = Number(header[1]);
      const end = Number(header[2] ?? header[1]);
      current = Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 1 && end >= start
        ? { start, end, lines: [] } : undefined;
    } else if (current) {
      current.lines.push(line);
    }
  }
  finish();
  return { introduction, sections: result };
}

export function parseProperties(input: string): Explanation[] {
  return parseExplanationFile(input).sections;
}

/** Narrowest inclusive range wins; the first section wins equal-width ties. */
export function findExplanation(sections: readonly Explanation[], line: number): Explanation | undefined {
  let best: Explanation | undefined;
  for (const section of sections) {
    if (section.start <= line && line <= section.end &&
        (!best || section.end - section.start < best.end - best.start)) {
      best = section;
    }
  }
  return best;
}

export function companionPath(source: string): string {
  const parsed = path.parse(source);
  return path.join(parsed.dir, `${parsed.name}.properties`);
}
