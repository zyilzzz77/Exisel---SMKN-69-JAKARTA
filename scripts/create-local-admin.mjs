import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hash } from "argon2";
import { config } from "dotenv";
import pg from "pg";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const credentialsDirectory = path.join(projectRoot, "private");
const credentialsPath = path.join(
  credentialsDirectory,
  "admin-initial-credentials.txt",
);
const adminEmail = "guru@exisel.local";

config({ path: path.join(projectRoot, ".env.local") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum tersedia di .env.local.");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const existingAdmin = await pool.query(
    `SELECT id FROM users WHERE email = $1 AND role = 'ADMIN' LIMIT 1`,
    [adminEmail],
  );
  let credentialsAvailable = false;

  try {
    await readFile(credentialsPath, "utf8");
    credentialsAvailable = true;
  } catch {
    credentialsAvailable = false;
  }

  if (existingAdmin.rowCount && credentialsAvailable) {
    process.stdout.write(
      "Akun admin/guru lokal sudah siap; file kredensial tetap dipertahankan.\n",
    );
  } else {
    const initialPassword = randomBytes(18).toString("base64url");
    const passwordHash = await hash(initialPassword, {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    await pool.query(
      `INSERT INTO users (
        id, email, nis, name, password_hash, role, class_name,
        is_active, must_change_password, created_at, updated_at
      ) VALUES ($1, $2, NULL, $3, $4, 'ADMIN', NULL, TRUE, FALSE, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = 'ADMIN',
        nis = NULL,
        class_name = NULL,
        is_active = TRUE,
        must_change_password = FALSE,
        updated_at = NOW()`,
      [randomUUID(), adminEmail, "Admin Guru EXISEL", passwordHash],
    );

    await mkdir(credentialsDirectory, { recursive: true });
    await writeFile(
      credentialsPath,
      [
        "KREDENSIAL ADMIN/GURU EXISEL (LOKAL)",
        "=====================================",
        "URL      : http://localhost:3000/admin/login",
        `Email    : ${adminEmail}`,
        `Password : ${initialPassword}`,
        "",
        "Simpan file ini secara privat. Jangan commit atau membagikannya.",
        "Ganti password sebelum akun dipakai pada lingkungan produksi.",
        "",
      ].join("\n"),
      { encoding: "utf8", mode: 0o600 },
    );

    process.stdout.write(
      "Akun admin/guru lokal dibuat; kredensial disimpan di private/admin-initial-credentials.txt.\n",
    );
  }
} finally {
  await pool.end();
}
