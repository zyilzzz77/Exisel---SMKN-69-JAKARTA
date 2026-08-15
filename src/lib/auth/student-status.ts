export const STUDENT_STATUSES = [
  "INCOMPLETE",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number];

const STATUS_DESTINATIONS: Record<StudentStatus, string> = {
  INCOMPLETE: "/register/student",
  PENDING: "/pending",
  APPROVED: "/dashboard",
  REJECTED: "/rejected",
  SUSPENDED: "/suspended",
};

const ALLOWED_TRANSITIONS: Record<StudentStatus, readonly StudentStatus[]> = {
  INCOMPLETE: ["PENDING"],
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["SUSPENDED"],
  REJECTED: ["PENDING"],
  SUSPENDED: ["APPROVED"],
};

export function getStudentStatusDestination(status: StudentStatus) {
  return STATUS_DESTINATIONS[status];
}

export function canTransitionStudentStatus(
  from: StudentStatus,
  to: StudentStatus,
) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
