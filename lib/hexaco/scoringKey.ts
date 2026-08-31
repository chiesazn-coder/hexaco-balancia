import { ScoringKey } from "@/lib/types/hexaco";

export const SCORING_KEY: ScoringKey = {
  "Honesty-Humility": {
    "Sincerity": [{ id: 6, r: true }, { id: 30, r: false }, { id: 54, r: true }, { id: 78, r: false }],
    "Fairness": [{ id: 12, r: true }, { id: 36, r: true }, { id: 60, r: false }, { id: 84, r: true }],
    "Greed-Avoidance": [{ id: 18, r: false }, { id: 42, r: true }, { id: 66, r: true }, { id: 90, r: true }],
    "Modesty": [{ id: 24, r: false }, { id: 48, r: false }, { id: 72, r: true }, { id: 96, r: true }],
  },
  "Emotionality": {
    "Fearfulness": [{ id: 5, r: false }, { id: 29, r: true }, { id: 53, r: false }, { id: 77, r: true }],
    "Anxiety": [{ id: 11, r: false }, { id: 35, r: true }, { id: 59, r: true }, { id: 83, r: false }],
    "Dependence": [{ id: 17, r: false }, { id: 41, r: true }, { id: 65, r: false }, { id: 89, r: true }],
    "Sentimentality": [{ id: 23, r: false }, { id: 47, r: false }, { id: 71, r: false }, { id: 95, r: true }],
  },
  "Extraversion": {
    "Social Self-Esteem": [{ id: 4, r: false }, { id: 28, r: false }, { id: 52, r: true }, { id: 76, r: true }],
    "Social Boldness": [{ id: 10, r: true }, { id: 34, r: false }, { id: 58, r: false }, { id: 82, r: true }],
    "Sociability": [{ id: 16, r: true }, { id: 40, r: false }, { id: 64, r: false }, { id: 88, r: false }],
    "Liveliness": [{ id: 22, r: false }, { id: 46, r: false }, { id: 70, r: true }, { id: 94, r: true }],
  },
  "Agreeableness": {
    "Forgiveness": [{ id: 3, r: false }, { id: 27, r: false }, { id: 51, r: true }, { id: 75, r: true }],
    "Gentleness": [{ id: 9, r: true }, { id: 33, r: false }, { id: 57, r: false }, { id: 81, r: false }],
    "Flexibility": [{ id: 15, r: true }, { id: 39, r: false }, { id: 63, r: true }, { id: 87, r: true }],
    "Patience": [{ id: 21, r: true }, { id: 45, r: false }, { id: 69, r: false }, { id: 93, r: true }],
  },
  "Conscientiousness": {
    "Organization": [{ id: 2, r: false }, { id: 26, r: false }, { id: 50, r: true }, { id: 74, r: true }],
    "Diligence": [{ id: 8, r: false }, { id: 32, r: false }, { id: 56, r: true }, { id: 80, r: true }],
    "Perfectionism": [{ id: 14, r: false }, { id: 38, r: true }, { id: 62, r: false }, { id: 86, r: false }],
    "Prudence": [{ id: 20, r: true }, { id: 44, r: true }, { id: 68, r: false }, { id: 92, r: true }],
  },
  "Openness to Experience": {
    "Aesthetic Appreciation": [{ id: 1, r: true }, { id: 25, r: true }, { id: 49, r: false }, { id: 73, r: false }],
    "Inquisitiveness": [{ id: 7, r: false }, { id: 31, r: false }, { id: 55, r: true }, { id: 79, r: true }],
    "Creativity": [{ id: 13, r: true }, { id: 37, r: false }, { id: 61, r: false }, { id: 85, r: true }],
    "Unconventionality": [{ id: 19, r: true }, { id: 43, r: false }, { id: 67, r: false }, { id: 91, r: true }],
  },
  "Altruism": { "Altruism": [{ id: 97, r: false }, { id: 98, r: false }, { id: 99, r: true }, { id: 100, r: true }] },
};

export const scoringKey = SCORING_KEY;
