import {
  CreateExpensePayload,
  ExpenseType,
  PaymentMethod,
  PaymentStatus,
} from "@/types";

interface AnalyzeReceiptInput {
  imageBase64: string;
  mimeType: string;
}

export interface ReceiptAnalysisResult {
  extracted: Partial<CreateExpensePayload>;
  confidenceNote: string;
}

interface GeminiGenerateContentResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
}

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export async function analyzeReceiptImageWithGemini(
  input: AnalyzeReceiptInput,
): Promise<ReceiptAnalysisResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_GEMINI_API_KEY. Please configure your Gemini API key.",
    );
  }

  const endpoint = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const prompt = [
    "You are extracting expense data from a receipt image for a mobile expense app.",
    "Return only one JSON object and no markdown.",
    "If a value cannot be found, return null for that field.",
    "Use exactly these keys:",
    "date (YYYY-MM-DD), amount (number), currency (ISO code like USD),",
    "type (one of: Travel, Equipment, Materials, Services, Software/Licenses, Labour costs, Utilities, Miscellaneous),",
    "paymentMethod (one of: Cash, Credit Card, Bank Transfer, Cheque),",
    "claimant (string), paymentStatus (one of: Paid, Pending, Reimbursed),",
    "description (string), location (string), expenseCode (string), confidenceNote (string).",
  ].join(" ");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: input.mimeType,
                data: input.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const reason = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${reason}`);
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;
  const textOutput =
    data.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("\n") ?? "";

  const parsed = parseGeminiJson(textOutput);

  return {
    extracted: {
      date: normalizeDate(parsed.date),
      amount: normalizeAmount(parsed.amount),
      currency: normalizeCurrency(parsed.currency),
      type: normalizeExpenseType(parsed.type),
      paymentMethod: normalizePaymentMethod(parsed.paymentMethod),
      claimant: normalizeText(parsed.claimant),
      paymentStatus: normalizePaymentStatus(parsed.paymentStatus),
      description: normalizeText(parsed.description),
      location: normalizeText(parsed.location),
      expenseCode: normalizeText(parsed.expenseCode),
    },
    confidenceNote:
      normalizeText(parsed.confidenceNote) ||
      "AI extracted data from receipt. Please verify all fields.",
  };
}

function parseGeminiJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      return {};
    }

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const clean = value.trim();
  return clean.length > 0 ? clean : undefined;
}

function normalizeAmount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return undefined;
}

function normalizeCurrency(value: unknown): string | undefined {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }

  return text.toUpperCase().slice(0, 3);
}

function normalizeDate(value: unknown): string | undefined {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeExpenseType(value: unknown): ExpenseType | undefined {
  const text = normalizeText(value)?.toLowerCase();
  if (!text) {
    return undefined;
  }

  const options = Object.values(ExpenseType);
  const exactMatch = options.find((option) => option.toLowerCase() === text);
  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch = options.find((option) =>
    text.includes(option.toLowerCase()),
  );
  if (partialMatch) {
    return partialMatch;
  }

  return undefined;
}

function normalizePaymentMethod(value: unknown): PaymentMethod | undefined {
  const text = normalizeText(value)?.toLowerCase();
  if (!text) {
    return undefined;
  }

  const options = Object.values(PaymentMethod);
  const exactMatch = options.find((option) => option.toLowerCase() === text);
  if (exactMatch) {
    return exactMatch;
  }

  if (text.includes("card")) {
    return PaymentMethod.CREDIT_CARD;
  }
  if (text.includes("transfer")) {
    return PaymentMethod.BANK_TRANSFER;
  }
  if (text.includes("cash")) {
    return PaymentMethod.CASH;
  }
  if (text.includes("cheque") || text.includes("check")) {
    return PaymentMethod.CHEQUE;
  }

  return undefined;
}

function normalizePaymentStatus(value: unknown): PaymentStatus | undefined {
  const text = normalizeText(value)?.toLowerCase();
  if (!text) {
    return undefined;
  }

  const options = Object.values(PaymentStatus);
  const exactMatch = options.find((option) => option.toLowerCase() === text);
  if (exactMatch) {
    return exactMatch;
  }

  if (text.includes("reimburse")) {
    return PaymentStatus.REIMBURSED;
  }
  if (text.includes("pending") || text.includes("unpaid")) {
    return PaymentStatus.PENDING;
  }
  if (text.includes("paid")) {
    return PaymentStatus.PAID;
  }

  return undefined;
}
