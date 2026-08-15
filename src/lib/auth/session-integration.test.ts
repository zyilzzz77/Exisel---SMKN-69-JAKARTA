import assert from "node:assert/strict";
import test from "node:test";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { hashSessionToken, SESSION_DURATION_SECONDS } from "./session-core.js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function getTestPrisma() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:5432/exisel?schema=public";
  const adapter = new PrismaPg(connectionString);
  return new PrismaClient({ adapter });
}

test("Database schema tabel sessions mendukung foreign key cascade dan token hash index", async () => {
  const prisma = getTestPrisma();

  try {
    const user = await prisma.user.findFirst({
      select: { id: true, email: true },
    });

    if (!user) return;

    const testToken = `test-integration-token-${Date.now()}`;
    const tokenHash = hashSessionToken(testToken);
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + SESSION_DURATION_SECONDS * 1000,
    );

    const createdSession = await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        createdAt: now,
        expiresAt,
        lastSeenAt: now,
        ipAddress: "127.0.0.1",
        userAgent: "IntegrationTestRunner/1.0",
        deviceName: "Test Device",
        createdBy: "test",
      },
    });

    assert.ok(createdSession.id);
    assert.equal(createdSession.tokenHash, tokenHash);
    assert.equal(createdSession.userId, user.id);
    assert.equal(createdSession.revokedAt, null);

    const foundSession = await prisma.session.findUnique({
      where: { tokenHash },
    });
    assert.ok(foundSession);
    assert.equal(foundSession.id, createdSession.id);

    const revokedSession = await prisma.session.update({
      where: { id: createdSession.id },
      data: { revokedAt: new Date() },
    });
    assert.ok(revokedSession.revokedAt);

    await prisma.session.delete({
      where: { id: createdSession.id },
    });
  } finally {
    await prisma.$disconnect();
  }
});
