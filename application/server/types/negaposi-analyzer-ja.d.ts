declare module "negaposi-analyzer-ja" {
  function analyze(tokens: import("kuromoji").IpadicFeatures[], options?: Record<string, unknown>): number;
  export default analyze;
}
