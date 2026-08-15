import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionStudentStatus,
  getStudentStatusDestination,
} from "./student-status";

test("setiap status siswa diarahkan ke halaman yang tepat", () => {
  assert.equal(getStudentStatusDestination("INCOMPLETE"), "/register/student");
  assert.equal(getStudentStatusDestination("PENDING"), "/pending");
  assert.equal(getStudentStatusDestination("APPROVED"), "/dashboard");
  assert.equal(getStudentStatusDestination("REJECTED"), "/rejected");
  assert.equal(getStudentStatusDestination("SUSPENDED"), "/suspended");
});

test("hanya transisi status yang diizinkan rencana yang diterima", () => {
  assert.equal(canTransitionStudentStatus("INCOMPLETE", "PENDING"), true);
  assert.equal(canTransitionStudentStatus("PENDING", "APPROVED"), true);
  assert.equal(canTransitionStudentStatus("PENDING", "REJECTED"), true);
  assert.equal(canTransitionStudentStatus("REJECTED", "PENDING"), true);
  assert.equal(canTransitionStudentStatus("APPROVED", "SUSPENDED"), true);
  assert.equal(canTransitionStudentStatus("SUSPENDED", "APPROVED"), true);

  assert.equal(canTransitionStudentStatus("INCOMPLETE", "APPROVED"), false);
  assert.equal(canTransitionStudentStatus("REJECTED", "APPROVED"), false);
  assert.equal(canTransitionStudentStatus("SUSPENDED", "PENDING"), false);
});
