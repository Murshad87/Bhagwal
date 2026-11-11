"use strict";

const DATA_URL = "./quran-data.json";
const AUDIO_EDITION = "ar.abdurrahmaansudais";
const API_BASE = "https://api.alquran.cloud/v1";

const surahSelect = document.getElementById("surahSelect");
const paraSelect = document.getElementById("paraSelect");
const ayahList = document.getElementById("ayahList");
const audio = document.getElementById("quranAudio");
const errorBox = document.getElementById("quranError");

let quranData = null;
let currentSurah = null;
let audioAyahs = [];
let audioIndex = 0;
let audioSurahNumber = null;

function showError(message) {
  errorBox.textContent = message;
}

function clearError() {
  errorBox.textContent = "";
}

function renderSurah(surahNumber, scrollToAyah = 1) {
  const surah = quranData.surahs[surahNumber - 1];
  if (!surah) return;

  currentSurah = surah;
  surahSelect.value = String(surahNumber);

  document.getElementById("surahTitle").textContent =
    `${surah.arabicName} — ${surah.englishName}`;

  document.getElementById("surahInfo").textContent =
    `${surah.ayahCount} آیات · Surah ${surah.number}`;

  ayahList.replaceChildren();

  surah.ayahs.forEach((ayah) => {
    const card = document.createElement("article");
    card.className = "ayah-card";
    card.id = `ayah-${ayah.number}`;

    const number = document.createElement("span");
    number.className = "ayah-number";
    number.textContent = `Ayah ${ayah.number} · Para ${ayah.juz}`;

    const arabic = document.createElement("p");
    arabic.className = "arabic";
    arabic.lang = "ar";
    arabic.textContent = ayah.arabic;

    const translation = document.createElement("p");
    translation.className = "translation";
    translation.lang = "ur";
    translation.textContent = ayah.translation;

    const play = document.createElement("button");
    play.className = "ayah-play";
    play.type = "button";
    play.textContent = "▶ آیت سنیں";
    play.addEventListener("click", () => playAyah(ayah.number));

    card.append(number, arabic, translation, play);
    ayahList.append(card);
  });

  if (scrollToAyah > 1) {
    requestAnimationFrame(() => {
      document.getElementById(`ayah-${scrollToAyah}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function markActiveAyah(number) {
  document.querySelectorAll(".ayah-card.active").forEach((card) => {
    card.classList.remove("active");
  });

  const card = document.getElementById(`ayah-${number}`);
  if (card) {
    card.classList.add("active");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

async function loadAudioForSurah(surahNumber) {
  if (audioSurahNumber === surahNumber && audioAyahs.length) return;

  document.getElementById("playerStatus").textContent =
    "تلاوت کی آڈیو لوڈ ہو رہی ہے...";

  const response = await fetch(
    `${API_BASE}/surah/${surahNumber}/${AUDIO_EDITION}`
  );

  if (!response.ok) throw new Error("Audio information could not be loaded.");

  const result = await response.json();
  if (result.code !== 200 || !result.data?.ayahs?.length) {
    throw new Error("Audio is not available for this Surah.");
  }

  audioAyahs = result.data.ayahs;
  audioSurahNumber = surahNumber;
}

async function playAyah(ayahNumber) {
  try {
    clearError();
    await loadAudioForSurah(currentSurah.number);

    audioIndex = ayahNumber - 1;
    const selected = audioAyahs[audioIndex];

    if (!selected?.audio) throw new Error("This Ayah audio is unavailable.");

    audio.src = selected.audio;
    markActiveAyah(ayahNumber);
    document.getElementById("playerSurah").textContent =
      `${currentSurah.englishName} · آیت ${ayahNumber}`;
    document.getElementById("playerStatus").textContent =
      "Sheikh Abdurrahmaan As-Sudais";

    await audio.play();
  } catch (error) {
    showError(error.message || "آڈیو چلانے میں مسئلہ پیش آیا۔");
  }
}

audio.addEventListener("ended", async () => {
  if (!currentSurah || audioIndex >= audioAyahs.length - 1) {
    document.getElementById("playerStatus").textContent = "سورت مکمل ہوگئی";
    return;
  }

  audioIndex += 1;
  const next = audioAyahs[audioIndex];

  if (next?.audio) {
    audio.src = next.audio;
    markActiveAyah(audioIndex + 1);
    document.getElementById("playerSurah").textContent =
      `${currentSurah.englishName} · آیت ${audioIndex + 1}`;
    try {
      await audio.play();
    } catch {
      document.getElementById("playerStatus").textContent =
        "اگلی آیت چلانے کے لیے Play دبائیں۔";
    }
  }
});

document.getElementById("playSurah").addEventListener("click", () => {
  if (audio.src && !audio.paused) {
    audio.pause();
  } else if (audio.src && audio.currentTime > 0) {
    audio.play().catch(() => showError("آڈیو دوبارہ چلانے میں مسئلہ ہے۔"));
  } else {
    playAyah(1);
  }
});

document.getElementById("nextAyah").addEventListener("click", () => {
  if (currentSurah && audioIndex < currentSurah.ayahCount - 1) {
    playAyah(audioIndex + 2);
  }
});

document.getElementById("previousAyah").addEventListener("click", () => {
  if (currentSurah && audioIndex > 0) {
    playAyah(audioIndex);
  }
});

surahSelect.addEventListener("change", () => {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  audioSurahNumber = null;
  audioAyahs = [];
  renderSurah(Number(surahSelect.value));
});

paraSelect.addEventListener("change", () => {
  const juz = Number(paraSelect.value);
  if (!juz) return;

  const targetSurah = quranData.surahs.find((surah) =>
    surah.ayahs.some((ayah) => ayah.juz === juz)
  );

  if (!targetSurah) return;

  const targetAyah = targetSurah.ayahs.find((ayah) => ayah.juz === juz);
  audio.pause();
  renderSurah(targetSurah.number, targetAyah.number);
  paraSelect.value = String(juz);
});

async function initialiseQuran() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Quran text file could not be loaded.");

    quranData = await response.json();

    if (quranData.surahs?.length !== 114) {
      throw new Error("Quran data is incomplete.");
    }

    surahSelect.replaceChildren();

    quranData.surahs.forEach((surah) => {
      const option = document.createElement("option");
      option.value = surah.number;
      option.textContent =
        `${surah.number}. ${surah.englishName} — ${surah.arabicName}`;
      surahSelect.append(option);
    });

    paraSelect.replaceChildren();
    for (let i = 1; i <= 30; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `پارہ ${i} / Para ${i}`;
      paraSelect.append(option);
    }

    renderSurah(1);
    document.getElementById("playerStatus").textContent =
      "Sheikh Abdurrahmaan As-Sudais";
  } catch (error) {
    showError(error.message || "قرآن لوڈ کرنے میں مسئلہ پیش آیا۔");
    ayahList.textContent = "قرآن کا ڈیٹا لوڈ نہیں ہوسکا۔";
  }
}

initialiseQuran();
