import { buildZip } from "./zip-writer.ts";
import { HWPX_CONTAINER_RDF, HWPX_CONTAINER_XML, HWPX_CONTENT_HPF, HWPX_FIRST_PARAGRAPH, HWPX_HEADER_XML, HWPX_MANIFEST_XML, HWPX_MIMETYPE, HWPX_SECTION_OPEN_TAG, HWPX_SETTINGS_XML, HWPX_VERSION_XML } from "./hwpx-template.ts";
import type { LessonPlanData, LessonPlanOverview } from "./lesson-plan-generator.ts";

const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Adds a bold title style (7), a bold table-header style (8), a solid-border
 * borderFill (3), and a centered paragraph style (20) to the skeleton's header.xml,
 * bumping each refList's itemCnt to match. All ids are chosen to avoid the ranges
 * already used by the skeleton (charPr 0-6, paraPr 0-19, borderFill 1-2). */
function withExtraStyles(headerXml: string): string {
  const borderFill = `<hh:borderFill id="3" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/><hh:leftBorder type="SOLID" width="0.1 mm" color="#000000"/><hh:rightBorder type="SOLID" width="0.1 mm" color="#000000"/><hh:topBorder type="SOLID" width="0.1 mm" color="#000000"/><hh:bottomBorder type="SOLID" width="0.1 mm" color="#000000"/><hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/></hh:borderFill>`;
  const charPrTitle = `<hh:charPr id="7" height="1600" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2"><hh:bold/><hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/><hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/><hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:underline type="NONE" shape="SOLID" color="#000000"/><hh:strikeout shape="NONE" color="#000000"/><hh:outline type="NONE"/><hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/></hh:charPr>`;
  const charPrBold = `<hh:charPr id="8" height="1000" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2"><hh:bold/><hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/><hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/><hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/><hh:underline type="NONE" shape="SOLID" color="#000000"/><hh:strikeout shape="NONE" color="#000000"/><hh:outline type="NONE"/><hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/></hh:charPr>`;
  const paraPrCenter = `<hh:paraPr id="20" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0" textDir="LTR"><hh:align horizontal="CENTER" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/><hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/><hh:autoSpacing eAsianEng="0" eAsianNum="0"/><hh:margin><hc:intent value="0" unit="HWPUNIT"/><hc:left value="0" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="0" unit="HWPUNIT"/><hc:next value="60" unit="HWPUNIT"/></hh:margin><hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/><hh:border borderFillIDRef="1" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/></hh:paraPr>`;
  return headerXml
    .replace('<hh:borderFills itemCnt="2">', '<hh:borderFills itemCnt="3">')
    .replace("</hh:borderFills>", `${borderFill}</hh:borderFills>`)
    .replace('<hh:charProperties itemCnt="7">', '<hh:charProperties itemCnt="9">')
    .replace("</hh:charProperties>", `${charPrTitle}${charPrBold}</hh:charProperties>`)
    .replace('<hh:paraProperties itemCnt="20">', '<hh:paraProperties itemCnt="21">')
    .replace("</hh:paraProperties>", `${paraPrCenter}</hh:paraProperties>`);
}

let idSeq = 1000;
const nextId = () => idSeq++;

function paragraph(text: string, paraPrIDRef = 0, charPrIDRef = 0, horzsize = 40000): string {
  const run = text ? `<hp:t>${esc(text)}</hp:t>` : "<hp:t/>";
  return `<hp:p id="${nextId()}" paraPrIDRef="${paraPrIDRef}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${charPrIDRef}">${run}</hp:run><hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="${horzsize}" flags="393216"/></hp:linesegarray></hp:p>`;
}

function tableCell(lines: string[], width: number, height: number, colAddr: number, rowAddr: number, headerCell: boolean): string {
  const body = (lines.length ? lines : [""]).map(line => paragraph(line, 20, headerCell ? 8 : 0, Math.max(1000, width - 400))).join("");
  return `<hp:tc name="" header="${headerCell ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="3"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${body}</hp:subList><hp:cellAddr colAddr="${colAddr}" rowAddr="${rowAddr}"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${width}" height="${height}"/><hp:cellMargin left="200" right="200" top="141" bottom="141"/></hp:tc>`;
}

/** A table anchored as an inline character inside its own paragraph, matching the
 * pattern HWPX uses for in-flow tables (hp:pos treatAsChar="1"). */
function table(rows: string[][][], widths: number[], headerRows = 0, rowHeight = 3200): string {
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const totalHeight = rowHeight * rows.length;
  const trs = rows.map((row, r) => `<hp:tr>${row.map((cellLines, c) => tableCell(cellLines, widths[c], rowHeight, c, r, r < headerRows)).join("")}</hp:tr>`).join("");
  const tblId = nextId();
  return `<hp:p id="${nextId()}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0"><hp:tbl id="${tblId}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${rows.length}" colCnt="${widths.length}" cellSpacing="0" borderFillIDRef="1" noAdjust="0"><hp:sz width="${totalWidth}" widthRelTo="ABSOLUTE" height="${totalHeight}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="283"/><hp:inMargin left="141" right="141" top="141" bottom="141"/>${trs}</hp:tbl></hp:run><hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="${totalHeight}" textheight="${totalHeight}" baseline="0" spacing="0" horzpos="0" horzsize="${totalWidth}" flags="393216"/></hp:linesegarray></hp:p>`;
}

const CONTENT_WIDTH = 42520;

function buildSection0Xml(result: LessonPlanData & { overview: LessonPlanOverview }, durationMinutes: number): string {
  idSeq = 1000;
  const metaWidths = [6300, 15160, 6300, 14760];
  const flowWidths = [6000, 9000, 17520, 10000];
  const evalWidths = [6300, 6300, 6300, 23620];
  const parts: string[] = [HWPX_FIRST_PARAGRAPH];

  parts.push(paragraph(result.title, 20, 7, CONTENT_WIDTH));
  parts.push(paragraph("국어과 교수·학습 과정안", 20, 0, CONTENT_WIDTH));
  parts.push(paragraph("", 0, 0, CONTENT_WIDTH));
  parts.push(table([
    [["학년·교과"], [`${result.overview.grade} ${result.overview.subject}`], ["차시"], [result.overview.session]],
    [["단원"], [result.overview.unit], ["수업 시간"], [`${durationMinutes}분`]],
    [["차시 주제"], [result.overview.topic], ["교과서"], [result.overview.textbook]],
    [["성취기준"], [result.overview.achievementStandard], ["수업 유형"], [result.lessonType]],
  ], metaWidths));

  parts.push(paragraph("", 0, 0, CONTENT_WIDTH));
  parts.push(paragraph("학습 목표", 0, 8, CONTENT_WIDTH));
  for (const goal of result.learningObjectives) parts.push(paragraph(`- ${goal}`, 0, 0, CONTENT_WIDTH));

  parts.push(paragraph("", 0, 0, CONTENT_WIDTH));
  parts.push(paragraph("준비물", 0, 8, CONTENT_WIDTH));
  parts.push(paragraph(`교사: ${result.teacherMaterials.join(", ")}`, 0, 0, CONTENT_WIDTH));
  parts.push(paragraph(`학생: ${result.studentMaterials.join(", ")}`, 0, 0, CONTENT_WIDTH));

  parts.push(paragraph("", 0, 0, CONTENT_WIDTH));
  parts.push(paragraph("수업 흐름", 0, 8, CONTENT_WIDTH));
  parts.push(table([
    [["단계(시간)"], ["학습 내용"], ["교수·학습 활동"], ["자료 및 유의점"]],
    ...result.lessonStages.map(stage => [
      [`${stage.stage}`, `(${stage.minutes}분)`],
      [stage.learningContent],
      [...stage.teacherActivities, ...stage.studentActivities],
      stage.materialsAndNotes,
    ]),
  ], flowWidths, 1, 4200));
  parts.push(paragraph(`총 수업 시간: ${result.lessonStages.reduce((a, b) => a + b.minutes, 0)}분`, 0, 0, CONTENT_WIDTH));

  parts.push(paragraph("", 0, 0, CONTENT_WIDTH));
  parts.push(paragraph("평가 계획", 0, 8, CONTENT_WIDTH));
  parts.push(table([
    [["평가 내용"], result.assessment.content, [""], [""]],
    [["평가 방법"], result.assessment.method, [""], [""]],
    [["관찰 행동"], result.assessment.observableBehaviors, [""], [""]],
    [["평가 기준"], ["상"], [result.assessment.criteria.high], [""]],
    [[""], ["중"], [result.assessment.criteria.medium], [""]],
    [[""], ["하"], [result.assessment.criteria.low], [""]],
  ], evalWidths));

  parts.push(paragraph("", 0, 0, CONTENT_WIDTH));
  parts.push(paragraph("수준별 지원", 0, 8, CONTENT_WIDTH));
  for (const item of result.levelSupport) parts.push(paragraph(`${item.level}: ${item.support.join(", ")}`, 0, 0, CONTENT_WIDTH));

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>${HWPX_SECTION_OPEN_TAG}${parts.join("")}</hs:sec>`;
}

/** Builds a real .hwpx (Hangul word processor) file for the given lesson plan,
 * based on a verified-working HWPX skeleton so it opens directly in 한글(HWP). */
export function buildLessonPlanHwpx(result: LessonPlanData & { overview: LessonPlanOverview }, durationMinutes: number): Uint8Array {
  const encoder = new TextEncoder();
  const contentHpf = HWPX_CONTENT_HPF.replace("<opf:title/>", `<opf:title>${esc(result.title)}</opf:title>`);
  const entries = [
    { name: "mimetype", data: encoder.encode(HWPX_MIMETYPE) },
    { name: "version.xml", data: encoder.encode(HWPX_VERSION_XML) },
    { name: "Contents/header.xml", data: encoder.encode(withExtraStyles(HWPX_HEADER_XML)) },
    { name: "Contents/section0.xml", data: encoder.encode(buildSection0Xml(result, durationMinutes)) },
    { name: "Preview/PrvText.txt", data: encoder.encode(result.title) },
    { name: "settings.xml", data: encoder.encode(HWPX_SETTINGS_XML) },
    { name: "META-INF/container.rdf", data: encoder.encode(HWPX_CONTAINER_RDF) },
    { name: "Contents/content.hpf", data: encoder.encode(contentHpf) },
    { name: "META-INF/container.xml", data: encoder.encode(HWPX_CONTAINER_XML) },
    { name: "META-INF/manifest.xml", data: encoder.encode(HWPX_MANIFEST_XML) },
  ];
  return buildZip(entries);
}
