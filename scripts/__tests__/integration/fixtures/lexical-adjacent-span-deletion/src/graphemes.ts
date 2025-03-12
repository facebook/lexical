let segmenter: Intl.Segmenter | undefined;

export function countGraphemes(src: string): number {
  const segmenter = getSegmenter();
  if (segmenter) {
    const segmentIterator = segmenter.segment(src);
    return [...segmentIterator].length;
  }

  // For browsers that don't support Intl.Segmenter, just return the number of
  // codepoints.
  //
  // The alternative is to conditionally import something like graphemer:
  //
  //   https://github.com/flmnt/graphemer
  //
  // But that either swells the bundle a _lot_, makes this async (which
  // complicates all the call sites), or, if we return a dummy value after
  // triggering the async load, makes the result unpredictable (which
  // complicates our tests).
  return [...src].length;
}

export function splitGraphemes(src: string): Array<string> {
  const segmenter = getSegmenter();
  if (segmenter) {
    const segmentIterator = segmenter.segment(src);
    return [...segmentIterator].map((s) => s.segment);
  }

  // As above, fall back to splitting by codepoint.
  return [...src];
}

// Includes both the start and endpoints
export function getGraphemeBoundaries(src: string): Array<number> {
  if (!src.length) {
    return [];
  }

  const segmenter = getSegmenter();
  if (segmenter) {
    const segmentIterator = segmenter.segment(src);
    const boundaries = [...segmentIterator].map((s) => s.index);
    boundaries.push(src.length);
    return boundaries;
  }

  return [...src].reduce<number[]>(
    (points, str) => {
      points.push((points.at(-1) || 0) + str.length);
      return points;
    },
    [0]
  );
}

function getSegmenter(): Intl.Segmenter | undefined {
  if (!segmenter && 'Segmenter' in Intl) {
    segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  }

  return segmenter;
}
