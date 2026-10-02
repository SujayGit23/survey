/**
 * generateSurveyPDF.ts
 * Client-side PDF generator for Kolaba Cloud AI Engineering Colleges Survey.
 * Produces a branded summary PDF of all answered questions and chosen options.
 */

import { SurveyPathStep } from "@/types/survey";
import { RespondentType } from "@/types/survey";
import { PERSONA_INFO } from "@/lib/survey-data";

export interface PDFSurveyData {
  respondentType: RespondentType;
  name: string;
  college: string;
  submissionId: string;
  surveyPath: SurveyPathStep[];
  answers: Record<string, any>;
}

/** Returns a human-readable label for an answer value */
function formatAnswerValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    return val
      .map((v, i) => (typeof v === "string" ? `${i + 1}. ${v}` : String(v)))
      .join("\n");
  }
  if (typeof val === "object") {
    // Composite / contact object
    return Object.entries(val)
      .filter(([k, v]) => v !== undefined && v !== null && v !== "" && k !== "consent")
      .map(([k, v]) => {
        const key = k
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        if (Array.isArray(v)) return `${key}: ${v.join(", ")}`;
        if (typeof v === "object") return `${key}: ${JSON.stringify(v)}`;
        return `${key}: ${v}`;
      })
      .join("\n");
  }
  return String(val);
}

/** Splits a string into lines that fit within maxWidth using jsPDF's splitTextToSize */
function splitLines(doc: any, text: string, maxWidth: number): string[] {
  const result: string[] = [];
  for (const rawLine of text.split("\n")) {
    const wrapped = doc.splitTextToSize(rawLine, maxWidth);
    result.push(...wrapped);
  }
  return result;
}

export async function generateAndDownloadSurveyPDF(data: PDFSurveyData): Promise<void> {
  // Dynamically import jsPDF to keep this client-side only
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // ---- Page constants ----
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN_L = 48;
  const MARGIN_R = 48;
  const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
  const MARGIN_BOTTOM = 60;

  // ---- Colours ----
  const DARK_NAVY: [number, number, number] = [11, 19, 43];
  const TEAL: [number, number, number] = [13, 148, 136];
  const LIGHT_GREY: [number, number, number] = [248, 250, 252];
  const MID_GREY: [number, number, number] = [100, 116, 139];
  const DARK_GREY: [number, number, number] = [30, 41, 59];
  const DIVIDER: [number, number, number] = [226, 232, 240];
  const TEAL_LIGHT_BG: [number, number, number] = [240, 253, 250];
  const TEAL_BORDER: [number, number, number] = [153, 246, 228];
  const TEAL_BRIGHT: [number, number, number] = [94, 234, 212];

  const personaMeta = PERSONA_INFO[data.respondentType];
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  let y = 48;
  let pageNum = 1;

  // ==============================
  // HELPER: Add new page if needed
  // ==============================
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > PAGE_H - MARGIN_BOTTOM) {
      doc.addPage();
      pageNum++;
      y = 48;
      // Thin top stripe on continuation pages
      doc.setFillColor(...DARK_NAVY);
      doc.rect(0, 0, PAGE_W, 6, "F");
      y = 24;
    }
  };

  // ==============================
  // COVER HEADER STRIPE
  // ==============================
  doc.setFillColor(...DARK_NAVY);
  doc.rect(0, 0, PAGE_W, 100, "F");

  // Small teal accent line at bottom of header
  doc.setFillColor(...TEAL);
  doc.rect(0, 98, PAGE_W, 2, "F");

  // Brand name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("KOLABA CLOUD AI", MARGIN_L, 34);

  // Sub brand
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEAL_BRIGHT);
  doc.text("Engineering Colleges AI Survey — Response Summary", MARGIN_L, 48);

  // Role badge right-aligned
  const badge = personaMeta?.badge || "Survey";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...TEAL_BRIGHT);
  doc.text(badge.toUpperCase(), PAGE_W - MARGIN_R, 34, { align: "right" });

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("Survey Response Certificate", MARGIN_L, 78);

  y = 118;

  // ==============================
  // RESPONDENT INFO CARD
  // ==============================
  const INFO_H = 84;
  doc.setFillColor(...LIGHT_GREY);
  doc.setDrawColor(...DIVIDER);
  doc.roundedRect(MARGIN_L, y, CONTENT_W, INFO_H, 6, 6, "FD");

  // Teal left accent bar
  doc.setFillColor(...TEAL);
  doc.rect(MARGIN_L, y, 4, INFO_H, "F");

  const infoX = MARGIN_L + 18;
  let infoY = y + 18;
  const col2X = infoX + 210;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK_NAVY);
  doc.text("Respondent Details", infoX, infoY);

  infoY += 18;
  // Row 1 labels
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MID_GREY);
  doc.text("NAME", infoX, infoY);
  doc.text("ROLE", col2X, infoY);

  infoY += 11;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK_GREY);
  doc.text(data.name || "Anonymous Respondent", infoX, infoY);
  doc.text(personaMeta?.label || data.respondentType, col2X, infoY);

  infoY += 18;
  // Row 2 labels
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MID_GREY);
  doc.text("INSTITUTION", infoX, infoY);
  doc.text("DATE SUBMITTED", col2X, infoY);

  infoY += 11;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK_GREY);
  const collegeLines = doc.splitTextToSize(data.college || "—", 195);
  doc.text(collegeLines, infoX, infoY);
  doc.text(today, col2X, infoY);

  y += INFO_H + 22;

  // ==============================
  // SECTION HEADING
  // ==============================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...DARK_NAVY);
  doc.text("Your Survey Responses", MARGIN_L, y);

  y += 5;
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(2);
  doc.line(MARGIN_L, y, MARGIN_L + 130, y);
  doc.setLineWidth(0.5);

  y += 18;

  // ==============================
  // RENDER EACH ANSWERED QUESTION
  // ==============================
  const answered = data.surveyPath.filter(
    (s) => s.rawAnswer !== undefined && s.rawAnswer !== null
  );

  answered.forEach((step) => {
    const answerText = formatAnswerValue(step.rawAnswer);
    const answerLines = splitLines(doc, answerText, CONTENT_W - 30);
    const titleLines = splitLines(doc, step.questionTitle, CONTENT_W - 30);

    // Estimate card height
    const BADGE_ROW_H = 22;
    const TITLE_LINE_H = 13;
    const DIVIDER_SPACE = 14;
    const LABEL_H = 13;
    const ANSWER_LINE_H = 13;
    const PAD_TOP = 12;
    const PAD_BOT = 14;

    const cardH =
      PAD_TOP +
      BADGE_ROW_H +
      titleLines.length * TITLE_LINE_H +
      DIVIDER_SPACE +
      LABEL_H +
      answerLines.length * ANSWER_LINE_H +
      PAD_BOT;

    checkPageBreak(cardH + 12);

    // Card background
    doc.setFillColor(...LIGHT_GREY);
    doc.setDrawColor(...DIVIDER);
    doc.roundedRect(MARGIN_L, y, CONTENT_W, cardH, 5, 5, "FD");

    let cardY = y + PAD_TOP;

    // Step number badge
    doc.setFillColor(...DARK_NAVY);
    doc.roundedRect(MARGIN_L + 12, cardY - 8, 30, 15, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`Q${step.stepNumber}`, MARGIN_L + 27, cardY + 2, { align: "center" });

    // Question ID tag
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...TEAL);
    doc.text(step.questionId.toUpperCase(), MARGIN_L + 48, cardY + 2);

    cardY += BADGE_ROW_H;

    // Question title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_NAVY);
    doc.text(titleLines, MARGIN_L + 12, cardY);
    cardY += titleLines.length * TITLE_LINE_H + 6;

    // Thin divider
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_L + 12, cardY, MARGIN_L + CONTENT_W - 12, cardY);
    cardY += 8;

    // "Selected Answer" label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...TEAL);
    doc.text("SELECTED ANSWER", MARGIN_L + 12, cardY);
    cardY += LABEL_H;

    // Answer text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GREY);
    doc.text(answerLines, MARGIN_L + 12, cardY);

    y += cardH + 10;
  });

  // ==============================
  // SUBMISSION ID FOOTER BLOCK
  // ==============================
  checkPageBreak(60);
  y += 8;
  doc.setFillColor(...TEAL_LIGHT_BG);
  doc.setDrawColor(...TEAL_BORDER);
  doc.roundedRect(MARGIN_L, y, CONTENT_W, 48, 5, 5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...TEAL);
  doc.text("SUBMISSION REFERENCE ID", MARGIN_L + 14, y + 15);

  doc.setFont("courier", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK_GREY);
  doc.text(data.submissionId, MARGIN_L + 14, y + 29);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MID_GREY);
  doc.text(
    "Responses are encrypted and used solely for academic research by Kolaba Cloud AI.",
    MARGIN_L + 14,
    y + 42
  );

  // ==============================
  // PAGE FOOTER (all pages)
  // ==============================
  const totalPages: number = (doc as any).internal?.getNumberOfPages?.() ?? pageNum;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...DARK_NAVY);
    doc.rect(0, PAGE_H - 26, PAGE_W, 26, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 160, 180);
    doc.text(
      "© Kolaba Cloud AI  ·  Engineering Colleges Survey  ·  India",
      MARGIN_L,
      PAGE_H - 10
    );
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN_R, PAGE_H - 10, {
      align: "right",
    });
  }

  // ==============================
  // DOWNLOAD
  // ==============================
  const safeName = (data.name || "respondent")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 30);
  const filename = `kolaba_survey_${data.respondentType}_${safeName}.pdf`;
  doc.save(filename);
}
