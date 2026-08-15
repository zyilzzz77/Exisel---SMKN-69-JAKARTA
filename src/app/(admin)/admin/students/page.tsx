import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin-header";
import { StudentStatusAction } from "@/components/forms/student-status-action";
import { getActiveSessionUser } from "@/lib/auth/authorization";
import {
  STUDENT_STATUSES,
  type StudentStatus,
} from "@/lib/auth/student-status";
import { getPrisma } from "@/lib/database/prisma";
import styles from "./students.module.css";

export const metadata: Metadata = {
  title: "Verifikasi Siswa — Admin EXISEL",
  description: "Periksa dan kelola izin akses akun siswa EXISEL.",
};

const statusLabels: Record<StudentStatus, string> = {
  INCOMPLETE: "Belum melengkapi data",
  PENDING: "Menunggu verifikasi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  SUSPENDED: "Ditangguhkan",
};

const errorMessages: Record<string, string> = {
  invalid_transition: "Perubahan status tersebut tidak diizinkan.",
  invalid_student: "Data siswa tidak valid.",
  invalid_rejection: "Pilih siswa dan isi alasan penolakan minimal 5 karakter.",
  status_changed:
    "Status siswa sudah berubah, kemungkinan diproses admin lain. Data sudah diperbarui.",
};

const auditLabels: Record<string, string> = {
  STUDENT_APPROVED: "Disetujui",
  STUDENT_REJECTED: "Ditolak",
  STUDENT_SUSPENDED: "Ditangguhkan",
  STUDENT_UNSUSPENDED: "Diaktifkan kembali",
};

type StudentsPageProps = {
  searchParams: Promise<{
    status?: string | string[];
    q?: string | string[];
    kelas?: string | string[];
    error?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(value);
}

function initials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "S";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function filterHref(input: {
  status: string;
  q: string;
  className: string;
}) {
  const params = new URLSearchParams();
  params.set("status", input.status);
  if (input.q) params.set("q", input.q);
  if (input.className) params.set("kelas", input.className);
  return `/admin/students?${params.toString()}`;
}

export default async function AdminStudentsPage({
  searchParams,
}: StudentsPageProps) {
  const adminSession = await getActiveSessionUser("ADMIN");
  if (!adminSession) redirect("/admin/login");

  const params = await searchParams;
  const rawStatus = firstParam(params.status)?.toUpperCase();
  const selectedStatus =
    rawStatus === "ALL" ||
    STUDENT_STATUSES.includes(rawStatus as StudentStatus)
      ? (rawStatus as StudentStatus | "ALL")
      : "PENDING";
  const query = (firstParam(params.q) ?? "").trim().slice(0, 80);
  const requestedClass = (firstParam(params.kelas) ?? "").trim().slice(0, 50);
  const error = firstParam(params.error);
  const prisma = getPrisma();

  const [admin, counts, classRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: adminSession.id },
      select: { name: true },
    }),
    prisma.user.groupBy({
      by: ["status"],
      where: { role: "STUDENT" },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", className: { not: null } },
      distinct: ["className"],
      orderBy: { className: "asc" },
      select: { className: true },
    }),
  ]);

  if (!admin) redirect("/admin/login");

  const classOptions = classRows
    .map((row) => row.className)
    .filter((value): value is string => Boolean(value));
  const selectedClass = classOptions.includes(requestedClass)
    ? requestedClass
    : "";

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(selectedStatus === "ALL" ? {} : { status: selectedStatus }),
      ...(selectedClass ? { className: selectedClass } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { nis: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy:
      selectedStatus === "PENDING"
        ? [{ updatedAt: "asc" }, { name: "asc" }]
        : [{ updatedAt: "desc" }, { name: "asc" }],
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      nis: true,
      className: true,
      status: true,
      rejectionReason: true,
      googleId: true,
      createdAt: true,
      updatedAt: true,
      targetAuditLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          action: true,
          createdAt: true,
          admin: { select: { name: true } },
        },
      },
    },
  });

  const countMap = Object.fromEntries(
    STUDENT_STATUSES.map((status) => [status, 0]),
  ) as Record<StudentStatus, number>;
  for (const count of counts) countMap[count.status] = count._count._all;
  const total = Object.values(countMap).reduce((sum, count) => sum + count, 0);

  return (
    <main className={styles.page}>
      <a className="skip-link" href="#student-list">Lewati ke daftar siswa</a>

      <AdminHeader
        activeItem="students"
        adminName={admin.name}
        announcement="Verifikasi identitas & izin akses siswa"
        brandSubtitle="Admin verifikasi siswa"
      />

      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Gerbang akses EXISEL</p>
            <h1>Kenali siswa.<br /><span>Setujui dengan yakin.</span></h1>
            <p>Google membuktikan identitas akun. Admin memastikan Nama, NIS, dan Kelas sebelum fitur siswa dibuka.</p>
          </div>
          <div className={styles.heroStats}>
            <article><span>Menunggu</span><strong>{countMap.PENDING}</strong><small>perlu diperiksa</small></article>
            <article><span>Total siswa</span><strong>{total}</strong><small>semua status</small></article>
          </div>
        </section>

        {error && errorMessages[error] ? (
          <p className={styles.errorNotice} role="alert">{errorMessages[error]}</p>
        ) : null}

        <nav className={styles.statusTabs} aria-label="Filter status siswa">
          <Link className={selectedStatus === "ALL" ? styles.activeTab : ""} href={filterHref({ status: "ALL", q: query, className: selectedClass })}>Semua <span>{total}</span></Link>
          {STUDENT_STATUSES.map((status) => (
            <Link className={selectedStatus === status ? styles.activeTab : ""} href={filterHref({ status, q: query, className: selectedClass })} key={status}>
              {statusLabels[status]} <span>{countMap[status]}</span>
            </Link>
          ))}
        </nav>

        <section className={styles.manager} id="student-list">
          <div className={styles.managerHeading}>
            <div>
              <p className={styles.eyebrow}>Daftar akun siswa</p>
              <h2>{selectedStatus === "ALL" ? "Semua status" : statusLabels[selectedStatus]}</h2>
            </div>
            <span>{students.length} hasil</span>
          </div>

          <form action="/admin/students" className={styles.filters} method="get">
            <input name="status" type="hidden" value={selectedStatus} />
            <label><span>Cari siswa</span><input defaultValue={query} maxLength={80} name="q" placeholder="Nama, email, atau NIS" /></label>
            <label><span>Kelas</span><select defaultValue={selectedClass} name="kelas"><option value="">Semua kelas</option>{classOptions.map((className) => <option key={className} value={className}>{className}</option>)}</select></label>
            <button type="submit">Terapkan filter →</button>
          </form>

          {students.length ? (
            <div className={styles.studentList}>
              {students.map((student) => {
                const lastAudit = student.targetAuditLogs[0];
                return (
                  <article className={styles.studentCard} key={student.id}>
                    <div className={styles.identityRow}>
                      <span className={styles.studentAvatar} aria-hidden="true">{initials(student.name, student.email)}</span>
                      <div className={styles.studentIdentity}>
                        <div><h3>{student.name || "Nama belum dilengkapi"}</h3><span className={`${styles.statusPill} ${styles[`status${student.status}`]}`}>{statusLabels[student.status]}</span></div>
                        <p>{student.email}</p>
                        <small>{student.googleId ? "Google terhubung" : "Akun email/password"}</small>
                      </div>
                    </div>

                    <dl className={styles.studentData}>
                      <div><dt>NIS</dt><dd>{student.nis ?? "—"}</dd></div>
                      <div><dt>Kelas</dt><dd>{student.className ?? "—"}</dd></div>
                      <div><dt>Pembaruan</dt><dd>{formatDate(student.updatedAt)}</dd></div>
                    </dl>

                    {student.rejectionReason ? <p className={styles.rejectionReason}><strong>Catatan admin:</strong> {student.rejectionReason}</p> : null}
                    {lastAudit ? <p className={styles.auditNote}>{auditLabels[lastAudit.action]} oleh {lastAudit.admin.name} · {formatDate(lastAudit.createdAt)}</p> : null}

                    {student.status === "PENDING" ? (
                      <div className={styles.actions}>
                        <StudentStatusAction action="approve" buttonLabel="Setujui siswa" className={styles.approveButton} studentId={student.id} studentName={student.name || student.email} />
                        <StudentStatusAction action="reject" buttonLabel="Tolak / minta perbaikan" className={styles.rejectButton} studentId={student.id} studentName={student.name || student.email} />
                      </div>
                    ) : null}

                    {student.status === "APPROVED" ? (
                      <div className={styles.singleAction}>
                        <StudentStatusAction action="suspend" buttonLabel="Tangguhkan akses" className={styles.suspendButton} studentId={student.id} studentName={student.name || student.email} />
                      </div>
                    ) : null}

                    {student.status === "SUSPENDED" ? (
                      <div className={styles.singleAction}>
                        <StudentStatusAction action="unsuspend" buttonLabel="Aktifkan kembali" className={styles.approveButton} studentId={student.id} studentName={student.name || student.email} />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}><strong>Tidak ada siswa pada filter ini.</strong><p>Ubah status, kata kunci, atau kelas untuk melihat data lain.</p></div>
          )}
        </section>
      </div>
    </main>
  );
}
