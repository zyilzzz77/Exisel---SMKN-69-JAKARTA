import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const sharedHeaderRoutes = [
  "src/app/(admin)/admin/dashboard/page.tsx",
  "src/app/(admin)/admin/laporan/page.tsx",
  "src/app/(admin)/admin/lomba/page.tsx",
  "src/app/(admin)/admin/students/page.tsx",
  "src/app/(admin)/admin/esktrakulikuler/[nama_eskul]/page.tsx",
  "src/components/admin/admin-community-manager.tsx",
];

test("seluruh halaman admin memakai satu komponen header bersama", async () => {
  for (const path of sharedHeaderRoutes) {
    const source = await readFile(path, "utf8");
    assert.match(source, /<AdminHeader\b/, `${path} belum memakai AdminHeader`);
    assert.doesNotMatch(
      source,
      /<AdminNavigation\b/,
      `${path} masih merender navigasi admin secara mandiri`,
    );
  }
});

test("geometri navbar desktop dan mobile ditetapkan secara eksplisit", async () => {
  const css = await readFile("src/components/admin-header.module.css", "utf8");
  assert.match(css, /\.inner\s*\{[\s\S]*?height:\s*86px;/);
  assert.match(css, /@media\s*\(max-width:\s*1080px\)[\s\S]*?\.inner\s*\{[\s\S]*?height:\s*68px;/);
  assert.match(css, /grid-template-columns:\s*210px\s+minmax\(0,\s*1fr\)\s+245px;/);
});
