export function cleanHtmlText(text?: string): string {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function normalizeStatus(status?: string): string {
  if (!status) return 'Unknown';
  const s = status.toLowerCase();
  if (s.includes('ongoing') || s.includes('releasing') || s.includes('publishing')) {
    return 'Ongoing';
  }
  if (s.includes('completed') || s.includes('finished') || s.includes('end')) {
    return 'Completed';
  }
  if (s.includes('hiatus') || s.includes('on-hold')) {
    return 'Hiatus';
  }
  if (s.includes('cancel') || s.includes('discontinued')) {
    return 'Cancelled';
  }
  return 'Unknown';
}

export function isDateOrTimeAgo(str: string): boolean {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  const relativeDatePattern =
    /^(?:yesterday|today|just now|(?:an?|\d+)\s*(?:sec|second|min|minute|hour|hr|day|week|month|yr|year)s?(?:\s*,\s*(?:an?|\d+)\s*(?:sec|second|min|minute|hour|hr|day|week|month|yr|year)s?)*(?:\s*ago)?)$/i;
  const standardDatePattern =
    /^(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*,?\s*\d{4})$/i;
  return relativeDatePattern.test(s) || standardDatePattern.test(s);
}

export function extractChapterNumber(
  rawNum: any,
  rawTitle = '',
  rawUrl = ''
): number {
  if (typeof rawNum === 'number' && !isNaN(rawNum) && rawNum >= 0) {
    return rawNum;
  }
  if (typeof rawNum === 'string') {
    const trimmed = rawNum.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(trimmed)) {
      const parsed = parseFloat(trimmed);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  if (rawTitle && !isDateOrTimeAgo(rawTitle)) {
    const titleMatch = rawTitle.match(/(?:chapter|ch\.?|episode|ep\.?)\s*(\d+(?:\.\d+)?)/i);
    if (titleMatch) {
      const parsed = parseFloat(titleMatch[1]);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  if (rawUrl && !/[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawUrl)) {
    const urlMatch = rawUrl.match(/(?:chapter|ch)[-_/](\d+(?:\.\d+)?)(?:[^\da-f]|$)/i);
    if (urlMatch) {
      const parsed = parseFloat(urlMatch[1]);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  return 0;
}

export function cleanChapterTitle(rawTitle: string, num: number | string): string {
  if (!rawTitle) return `Chapter ${num}`;
  const firstLine = rawTitle.split('\n')[0].replace(/\s+/g, ' ').trim();
  if (!firstLine || isDateOrTimeAgo(firstLine)) {
    return `Chapter ${num}`;
  }

  if (/^\d+(?:\.\d+)?$/.test(firstLine)) {
    return `Chapter ${firstLine}`;
  }

  if (
    !/^(?:chapter|ch\.?|ep\.?|episode)\s*\d+/i.test(firstLine) &&
    !/^(?:prologue|epilogue|extra|oneshot|special)/i.test(firstLine)
  ) {
    return `Chapter ${num}: ${firstLine}`;
  }

  return firstLine;
}
