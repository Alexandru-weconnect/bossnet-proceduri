import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { Readable } from "node:stream";
import ExcelJS, { type CellValue, type Worksheet } from "exceljs";
import JSZip from "jszip";
import pg, { type PoolClient } from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_OWNER_URL ?? process.env.DATABASE_URL;
const workbookArgument = process.argv[2];

if (!databaseUrl) throw new Error("DATABASE_OWNER_URL sau DATABASE_URL este obligatoriu");
if (!workbookArgument) throw new Error("Utilizare: npm run import:organization -- /cale/export.xlsx");

const workbookPath = resolve(workbookArgument);

function text(value: CellValue | undefined | null): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value) return String(value.result ?? "").trim();
  }
  return String(value).trim();
}

function integer(value: CellValue | undefined | null, label: string): number {
  const parsed = Number(text(value));
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${label} nu este un ID valid`);
  return parsed;
}

function records(sheet: Worksheet) {
  const headerRow = sheet.getRow(4);
  const headers = Array.from({ length: sheet.columnCount }, (_, index) => text(headerRow.getCell(index + 1).value));
  const output: Array<Record<string, CellValue | null>> = [];

  for (let rowNumber = 5; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (!row.hasValues) continue;
    const record: Record<string, CellValue | null> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = row.getCell(index + 1).value;
    });
    output.push(record);
  }
  return output;
}

function requireSheet(workbook: ExcelJS.Workbook, name: string): Worksheet {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) throw new Error(`Lipsește foaia ${name}`);
  return sheet;
}

async function workbookWithoutPresentationMetadata(bytes: Buffer): Promise<Buffer> {
  const archive = await JSZip.loadAsync(bytes);
  const relationshipFiles = Object.values(archive.files).filter(
    (entry) => !entry.dir && /^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/.test(entry.name),
  );

  for (const entry of relationshipFiles) {
    const relationships = await entry.async("string");
    const dataOnlyRelationships = relationships.replace(
      /<Relationship\b[^>]*\bType="[^"]*\/(?:comments|vmlDrawing|table)"[^>]*\/>/g,
      "",
    );
    archive.file(entry.name, dataOnlyRelationships);
  }

  return archive.generateAsync({ type: "nodebuffer" });
}

function personReference(value: CellValue | null, userByName: Map<string, string>): string | null {
  const name = text(value);
  if (!name || name === "—" || name === "-") return null;
  const normalizedName = name.toLocaleLowerCase("ro-RO");
  const exactId = userByName.get(normalizedName);
  if (exactId) return exactId;

  const annotatedMatches = [...userByName.entries()].filter(
    ([candidate]) => normalizedName.startsWith(`${candidate} (`) && normalizedName.endsWith(")"),
  );
  const annotatedId = annotatedMatches[0]?.[1];
  if (annotatedMatches.length === 1 && annotatedId) return annotatedId;

  throw new Error(`Referință utilizator necunoscută în workbook`);
}

async function upsertUsers(client: PoolClient, sourceRows: Array<Record<string, CellValue | null>>) {
  const bySourceId = new Map<number, string>();
  const byName = new Map<string, string>();

  for (const row of sourceRows) {
    const sourceId = integer(row.ID, "ID utilizator");
    const email = text(row.Email).toLowerCase();
    const rawPhone = text(row.Telefon).replace(/\D/g, "");
    const systemRole = text(row["Rol sistem"]).toLowerCase();
    const status = text(row.Status).toLocaleLowerCase("ro-RO") === "activ" ? "active" : "inactive";

    if (!/^[^@\s]+@bossnet\.ro$/i.test(email)) throw new Error("Workbook-ul conține un email din afara bossnet.ro");
    if (!/^[1-9]\d{7,14}$/.test(rawPhone)) throw new Error("Workbook-ul conține un telefon invalid");
    if (!new Set(["admin", "editor"]).has(systemRole)) throw new Error("Workbook-ul conține un rol sistem necunoscut");

    const result = await client.query<{ id: string }>(
      `insert into bossnet.app_users (
         source_user_id, username, display_name, job_title, email, phone_e164,
         system_role, status, hierarchy_level, organizational_role, updated_at
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
       on conflict (source_user_id) do update set
         username = excluded.username,
         display_name = excluded.display_name,
         job_title = excluded.job_title,
         email = excluded.email,
         phone_e164 = excluded.phone_e164,
         system_role = excluded.system_role,
         status = excluded.status,
         hierarchy_level = excluded.hierarchy_level,
         organizational_role = excluded.organizational_role,
         updated_at = now()
       returning id::text`,
      [
        sourceId,
        text(row.Username),
        text(row.Nume),
        text(row["Funcție"]) || null,
        email,
        `+${rawPhone}`,
        systemRole,
        status,
        integer(row["Nivel ierarhic"], "Nivel ierarhic"),
        text(row["Rol organizațional"]) || null,
      ],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error("Utilizatorul nu a putut fi importat");
    const normalizedName = text(row.Nume).toLocaleLowerCase("ro-RO");
    if (byName.has(normalizedName)) throw new Error("Numele utilizatorilor trebuie să fie unice pentru importul ierarhiei");
    bySourceId.set(sourceId, id);
    byName.set(normalizedName, id);
  }

  for (const row of sourceRows) {
    const userId = bySourceId.get(integer(row.ID, "ID utilizator"));
    const managerId = personReference(row["Manager direct"], byName);
    await client.query(
      "update bossnet.app_users set manager_user_id = $1, updated_at = now() where id = $2",
      [managerId, userId],
    );
  }

  return { byName, bySourceId };
}

async function upsertDepartments(
  client: PoolClient,
  sourceRows: Array<Record<string, CellValue | null>>,
  userByName: Map<string, string>,
) {
  const bySourceId = new Map<number, string>();
  for (const row of sourceRows) {
    const sourceId = integer(row.ID, "ID departament");
    const result = await client.query<{ id: string }>(
      `insert into bossnet.departments (
         source_department_id, name, manager_user_id, operational_supervisor_user_id, updated_at
       ) values ($1, $2, $3, $4, now())
       on conflict (source_department_id) do update set
         name = excluded.name,
         manager_user_id = excluded.manager_user_id,
         operational_supervisor_user_id = excluded.operational_supervisor_user_id,
         updated_at = now()
       returning id::text`,
      [
        sourceId,
        text(row.Departament),
        personReference(row["Manager explicit în DB"], userByName),
        personReference(row["Supervizor operațional"], userByName),
      ],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error("Departamentul nu a putut fi importat");
    bySourceId.set(sourceId, id);
  }
  return bySourceId;
}

async function replaceMemberships(
  client: PoolClient,
  sourceRows: Array<Record<string, CellValue | null>>,
  departmentBySourceId: Map<number, string>,
  userBySourceId: Map<number, string>,
) {
  await client.query("delete from bossnet.department_memberships");
  for (const row of sourceRows) {
    const departmentId = departmentBySourceId.get(integer(row["ID departament"], "ID departament apartenență"));
    const userId = userBySourceId.get(integer(row["ID utilizator"], "ID utilizator apartenență"));
    if (!departmentId || !userId) throw new Error("Apartenența indică un utilizator sau departament necunoscut");
    const role = text(row["Rol în departament"]);
    await client.query(
      `insert into bossnet.department_memberships (department_id, user_id, role, is_manager)
       values ($1, $2, $3, $4)`,
      [departmentId, userId, role, role.toLocaleLowerCase("ro-RO").includes("manager")],
    );
  }
}

const bytes = await readFile(workbookPath);
const checksum = createHash("sha256").update(bytes).digest("hex");
const workbook = new ExcelJS.Workbook();
const workbookBytes = await workbookWithoutPresentationMetadata(bytes);
await workbook.xlsx.read(Readable.from(workbookBytes), {
  ignoreNodes: ["legacyDrawing", "tableParts"],
});

const userRows = records(requireSheet(workbook, "Utilizatori"));
const departmentRows = records(requireSheet(workbook, "Departamente"));
const membershipRows = records(requireSheet(workbook, "Apartenențe"));

const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();

try {
  await client.query("begin");
  const users = await upsertUsers(client, userRows);
  const departments = await upsertDepartments(client, departmentRows, users.byName);
  await replaceMemberships(client, membershipRows, departments, users.bySourceId);
  await client.query(
    `insert into bossnet.organization_imports (source_name, source_sha256, row_counts)
     values ($1, $2, $3::jsonb)
     on conflict (source_sha256) do update set
       source_name = excluded.source_name,
       row_counts = excluded.row_counts,
       imported_at = now()`,
    [
      basename(workbookPath),
      checksum,
      JSON.stringify({ departments: departmentRows.length, memberships: membershipRows.length, users: userRows.length }),
    ],
  );
  await client.query("commit");
  console.log(JSON.stringify({
    checksum: checksum.slice(0, 12),
    departments: departmentRows.length,
    memberships: membershipRows.length,
    users: userRows.length,
  }));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
