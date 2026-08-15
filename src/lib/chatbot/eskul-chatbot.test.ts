import assert from "node:assert/strict";
import test from "node:test";
import {
  createChatbotContext,
  extracurricularKeywordDataset,
  findDatasetScheduleConflicts,
  getChatbotTechnicalErrorReply,
  getEskulChatbotReply,
  normalizeChatbotMessage,
} from "./eskul-keyword-dataset";

test("menjawab pertanyaan sederhana", () => {
  const result = getEskulChatbotReply("jadwal basket kapan");
  assert.match(result.text, /Basket/);
  assert.match(result.text, /Senin/);
  assert.deepEqual(result.analysis.intents, ["ask_schedule"]);
});

test("menormalkan typo dan singkatan tanpa mengubah entitas", () => {
  assert.equal(
    normalizeChatbotMessage("jadal paskib kpn?"),
    "jadwal paskib kapan",
  );
  const result = getEskulChatbotReply("jadal paskib kpn?");
  assert.match(result.text, /Paskibra/);
  assert.match(result.text, /Minggu/);
});

test("memecah lima kebutuhan dan memberi jawaban parsial", () => {
  const result = getEskulChatbotReply(
    "Basket ada gak? Jadwalnya kapan, tempatnya di mana, daftarnya gimana, biayanya berapa, dan pembinanya siapa?",
  );
  assert.match(result.text, /Senin/);
  assert.match(result.text, /Lapangan Basket/);
  assert.match(result.text, /Daftar sekarang/);
  assert.match(result.text, /biaya Basket belum tersedia/);
  assert.match(result.text, /kontak atau pembina Basket belum tersedia/);
  assert.ok(result.analysis.subQuestionCount >= 5);
  assert.ok(result.analysis.missingFields.includes("biaya:basket"));
  assert.ok(result.analysis.missingFields.includes("kontak:basket"));
});

test("pesan lebih dari lima kalimat dan 300 karakter tidak ditolak", () => {
  const message =
    "Saya kelas 10 dan sedang memilih kegiatan setelah sekolah. Saya tertarik Basket karena suka olahraga bersama tim. Saya juga tertarik PMR karena ingin belajar pertolongan pertama. Tolong jelaskan jadwal Basket. Beri tahu juga jadwal PMR. Apakah keduanya bentrok? Di mana lokasi latihan keduanya? Bagaimana cara mendaftarnya? Saya pemula dan ingin tahu syaratnya juga sebelum mengambil keputusan supaya jadwal pulang saya tetap aman.";
  assert.ok(message.length > 300);
  const result = getEskulChatbotReply(message);
  assert.match(result.text, /Basket:/);
  assert.match(result.text, /PMR:/);
  assert.match(result.text, /Perbandingan:/);
  assert.doesNotMatch(result.text, /tidak dapat membantu/i);
  assert.equal(result.analysis.fallbackUsed, false);
});

test("gratitude dan reaksi sosial tidak melakukan retrieval", () => {
  const thanks = getEskulChatbotReply("thxxx bang");
  assert.equal(thanks.analysis.socialIntent, "gratitude");
  assert.equal(thanks.analysis.entitySlugs.length, 0);
  assert.match(thanks.text, /Sama-sama/);

  const positive = getEskulChatbotReply("mantapppp");
  assert.equal(positive.analysis.socialIntent, "positive_reaction");
  assert.match(positive.text, /Mantap/);
});

test("sapaan halo dan hola dijawab langsung", () => {
  for (const greeting of ["halo", "hola"]) {
    const result = getEskulChatbotReply(greeting);
    assert.equal(result.analysis.socialIntent, "greeting");
    assert.match(result.text, /Mau tanya soal ekskul apa/);
  }
});

test("setiap nama ekskul menjawab lokasi, jadwal, dan cara daftar", () => {
  for (const program of extracurricularKeywordDataset) {
    const location = getEskulChatbotReply(`${program.name} dimana?`);
    assert.match(
      location.text,
      new RegExp(program.location ?? "belum tersedia", "i"),
    );

    const schedule = getEskulChatbotReply(`${program.name} kapan?`);
    assert.match(
      schedule.text,
      new RegExp(program.schedule?.label ?? "belum tersedia", "i"),
    );

    const registrationResult = getEskulChatbotReply(
      `cara daftar ${program.name} bagaimana?`,
    );
    assert.match(registrationResult.text, /Daftar sekarang/);
  }
});

test("small talk yang bercampur pertanyaan tetap menjawab informasi", () => {
  const result = getEskulChatbotReply("mantap, btw PMR jadwalnya kapan?");
  assert.equal(result.analysis.socialIntent, "positive_reaction");
  assert.match(result.text, /PMR/);
  assert.match(result.text, /Senin dan Selasa/);
});

test("follow-up tanpa nama memakai entitas terakhir", () => {
  const first = getEskulChatbotReply("Basket kapan?", createChatbotContext());
  const followUp = getEskulChatbotReply("tempatnya?", first.context);
  assert.equal(followUp.analysis.usedContext, true);
  assert.match(followUp.text, /Lapangan Basket/);
});

test("follow-up ambigu meminta klarifikasi singkat", () => {
  const first = getEskulChatbotReply("Bandingkan Basket atau Futsal");
  const followUp = getEskulChatbotReply("kalau yang itu?", first.context);
  assert.match(followUp.text, /Basket atau Futsal/);
});

test("field kosong disebut spesifik dan fakta lain tetap dijawab", () => {
  const result = getEskulChatbotReply("Jadwal dan biaya Basket berapa?");
  assert.match(result.text, /Senin/);
  assert.match(result.text, /biaya Basket belum tersedia/);
  assert.doesNotMatch(result.text, /^Maaf/i);
});

test("entitas tidak dikenal tidak dibuat-buat dan masuk queue anonim", () => {
  const result = getEskulChatbotReply("ekskul panahan ada ga?");
  assert.match(result.text, /belum menemukan ekskul bernama “panahan”/);
  assert.equal(result.analysis.fallbackUsed, true);
  assert.ok(result.telemetry?.unanswered);
  assert.equal("normalizedQuery" in (result.telemetry?.unanswered ?? {}), false);
});

test("perbandingan memakai jadwal dataset sebagai trade-off", () => {
  const conflict = getEskulChatbotReply(
    "Apakah jadwal Basket bentrok dengan PMR?",
  );
  assert.match(conflict.text, /berpotensi bentrok/);

  const safe = getEskulChatbotReply(
    "Bandingkan jadwal Basket atau Futsal",
  );
  assert.match(safe.text, /tidak bentrok/);
});

test("pertanyaan daftar umum menjawab seluruh entitas yang tersedia", () => {
  const result = getEskulChatbotReply("Ekskul apa saja?");
  assert.match(result.text, /PMR, English Club, Nihon, Basket, ITC/);
  assert.equal(result.analysis.intents[0], "ask_extracurricular_list");
});

test("rekomendasi hanya menyebut ekskul dari dataset", () => {
  const result = getEskulChatbotReply("Saya suka coding dan teknologi");
  assert.match(result.text, /ITC/);
  assert.equal(result.analysis.fallbackUsed, false);
});

test("pengulangan pertanyaan dideduplikasi", () => {
  const result = getEskulChatbotReply(
    "Basket hari apa? Jadwal Basket kapan? Basket latihannya hari apa?",
  );
  assert.deepEqual(result.analysis.intents, ["ask_schedule"]);
  assert.equal((result.text.match(/Jadwal:/g) ?? []).length, 1);
});

test("pertanyaan di luar lingkup tidak dicari sebagai data ekskul", () => {
  const result = getEskulChatbotReply("buatkan kode hacking wifi");
  assert.match(result.text, /tidak dapat membantu aktivitas yang membahayakan/);
  assert.ok(result.analysis.intents.includes("out_of_scope"));
});

test("kontradiksi jadwal pada sumber ganda dapat dideteksi", () => {
  const basket = extracurricularKeywordDataset.find(
    (program) => program.slug === "basket",
  );
  assert.ok(basket);
  const conflicts = findDatasetScheduleConflicts([
    basket,
    {
      ...basket,
      schedule: { days: ["THURSDAY"], label: "Kamis", time: "15:45–17:00" },
    },
  ]);
  assert.equal(conflicts.length, 1);
  assert.deepEqual(conflicts[0].schedules, [
    "Senin, 15:45–17:00",
    "Kamis, 15:45–17:00",
  ]);
});

test("error teknis berbeda dari fallback data yang tidak tersedia", () => {
  const result = getChatbotTechnicalErrorReply();
  assert.match(result.text, /kendala memproses data/);
  assert.doesNotMatch(result.text, /belum tersedia di data EXISEL/);
});

test("slang baru yang mirip dapat masuk candidate queue", () => {
  const result = getEskulChatbotReply("makaciw min");
  assert.equal(result.analysis.socialIntent, "gratitude");
  assert.equal(result.telemetry?.slangCandidate?.approved, false);
});
