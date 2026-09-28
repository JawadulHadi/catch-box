export type FieldSuggestion = {
  field: string;
  value: string | null;
  evidence: string;
  confidence: "high" | "medium" | "low";
};
