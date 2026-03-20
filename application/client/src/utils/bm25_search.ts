import { BM25 } from "bayesian-bm25";
import _ from "lodash";

const STOP_WORDS = new Set([
  "は", "が", "の", "を", "に", "で", "と", "も", "や", "か",
  "から", "まで", "より", "へ", "な", "だ", "です", "ます",
  "た", "て", "ない", "れる", "られる", "する", "ある", "いる",
  "なる", "できる", "よう", "こと", "もの", "ため", "さ", "み",
]);

const segmenter = new Intl.Segmenter("ja", { granularity: "word" });

/**
 * Intl.Segmenter で内容語トークンを抽出
 */
export function extractTokens(text: string): string[] {
  return Array.from(segmenter.segment(text))
    .filter((s) => s.isWordLike && !STOP_WORDS.has(s.segment))
    .map((s) => s.segment.toLowerCase());
}

/**
 * BM25で候補をスコアリングして、クエリと類似度の高い上位10件を返す
 */
export function filterSuggestionsBM25(
  candidates: string[],
  queryTokens: string[],
): string[] {
  if (queryTokens.length === 0) return [];

  const bm25 = new BM25({ k1: 1.2, b: 0.75 });

  const tokenizedCandidates = candidates.map((c) => extractTokens(c));
  bm25.index(tokenizedCandidates);

  const results = _.zipWith(candidates, bm25.getScores(queryTokens), (text, score) => {
    return { text, score };
  });

  // スコアが高い（＝類似度が高い）ものが下に来るように、上位10件を取得する
  return _(results)
    .filter((s) => s.score > 0)
    .sortBy(["score"])
    .slice(-10)
    .map((s) => s.text)
    .value();
}
