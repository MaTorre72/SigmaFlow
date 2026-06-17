import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs/sigmaflow";
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const sheets = {
  jobs: workbook.worksheets.add("jobs"),
  cases: workbook.worksheets.add("cases"),
  config: workbook.worksheets.add("config"),
};

const headerFill = "#146C5F";
const headerFont = { bold: true, color: "#FFFFFF" };
const border = { preset: "all", style: "thin", color: "#D8DEE8" };

const jobHeaders = [
  "job_id",
  "case_id",
  "visit_number",
  "title",
  "status",
  "assignee",
  "tag",
  "size_class",
  "size_points",
  "arrival_ts",
  "start_ts",
  "done_ts",
  "service_time_h",
  "lead_time_h",
  "wait_time_h",
  "is_rework",
  "rework_cause",
  "notes",
];

const caseHeaders = [
  "case_id",
  "title",
  "client",
  "total_visits",
  "is_open",
  "created_ts",
  "closed_ts",
];

const configRows = [
  ["key", "value", "description"],
  ["capacity_hours_day", 6, "Ore/giorno effettive per persona"],
  ["team_size", 4, "Numero di persone attive"],
  ["observation_window_days", 30, "Finestra temporale metriche"],
  ["size_S_hours", 2, "Ore medie attese per taglia S"],
  ["size_M_hours", 6, "Ore medie attese per taglia M"],
  ["size_L_hours", 16, "Ore medie attese per taglia L"],
  ["size_XL_hours", 40, "Ore medie attese per taglia XL"],
];

writeSheet(sheets.jobs, [jobHeaders], "A1:R200");
writeSheet(sheets.cases, [caseHeaders], "A1:G200");
writeSheet(sheets.config, configRows, "A1:C50");

for (const sheet of Object.values(sheets)) {
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = true;
}

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(`${outputDir}/SigmaFlow Database.xlsx`);

function writeSheet(sheet, rows, tableRange) {
  const width = rows[0].length;
  const range = sheet.getRangeByIndexes(0, 0, rows.length, width);
  range.values = rows;
  sheet.getRangeByIndexes(0, 0, 1, width).format = {
    fill: headerFill,
    font: headerFont,
  };
  sheet.getRange(tableRange).format.borders = border;
  sheet.getRangeByIndexes(0, 0, 1, width).format.wrapText = true;
  sheet.getRangeByIndexes(0, 0, Math.max(rows.length, 2), width).format.autofitColumns();
}
