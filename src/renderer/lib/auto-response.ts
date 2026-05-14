export const AUTO_ACTIONS = [
  "Text",
  "Formula",
  "Table",
  "Code",
  "Solve",
  "Image",
  "Color",
  "Translate",
  "Calendar",
] as const;

export type AutoAction = (typeof AUTO_ACTIONS)[number];

export interface AutoCandidate {
  rank: number;
  action: AutoAction;
  confidence: number;
  reason: string;
  result: string;
}

export interface AutoResponse {
  primaryAction: AutoAction;
  candidates: AutoCandidate[];
}

const actionSet = new Set<string>(AUTO_ACTIONS);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isAutoAction = (value: unknown): value is AutoAction =>
  typeof value === "string" && actionSet.has(value);

const toFiniteNumber = (value: unknown): number | null => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const toConfidence = (value: unknown): number => {
  const confidence = toFiniteNumber(value);
  if (confidence === null) return 0;
  return Math.min(1, Math.max(0, confidence));
};

export const normalizeAutoResponse = (value: unknown): AutoResponse | null => {
  if (!isRecord(value) || !Array.isArray(value.candidates)) {
    return null;
  }

  const candidates = value.candidates
    .filter(isRecord)
    .map((candidate): AutoCandidate | null => {
      const rank = toFiniteNumber(candidate.rank);
      const result =
        typeof candidate.result === "string"
          ? candidate.result
          : String(candidate.result ?? "");

      if (rank === null || !isAutoAction(candidate.action) || result.trim() === "") {
        return null;
      }

      return {
        rank,
        action: candidate.action,
        confidence: toConfidence(candidate.confidence),
        reason:
          typeof candidate.reason === "string"
            ? candidate.reason
            : String(candidate.reason ?? ""),
        result,
      };
    })
    .filter((candidate): candidate is AutoCandidate => candidate !== null)
    .sort((a, b) => a.rank - b.rank);

  if (candidates.length === 0) {
    return null;
  }

  const primaryAction =
    isAutoAction(value.primaryAction) &&
    candidates.some((candidate) => candidate.action === value.primaryAction)
      ? value.primaryAction
      : candidates[0].action;

  return { primaryAction, candidates };
};

export const parseAutoResponse = (content: unknown): AutoResponse | null => {
  if (!content) {
    return null;
  }

  if (typeof content !== "string") {
    return normalizeAutoResponse(content);
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonCandidate = (fenceMatch ? fenceMatch[1] : trimmed).trim();
  const start = jsonCandidate.indexOf("{");
  const end = jsonCandidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return null;
  }

  try {
    return normalizeAutoResponse(JSON.parse(jsonCandidate.slice(start, end + 1)));
  } catch {
    return null;
  }
};

export const getAutoPrimaryCandidate = (autoResponse: AutoResponse): AutoCandidate =>
  autoResponse.candidates.find(
    (candidate) => candidate.action === autoResponse.primaryAction
  ) ?? autoResponse.candidates[0];
