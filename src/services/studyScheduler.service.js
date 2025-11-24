// src/services/studyScheduler.service.js
import Event from "../models/Event.js";
import User from "../models/User.js";

/**
 * Помощни функции за работа с време
 */
function parseHHMMToMinutes(s) {
  // s = "08:30"
  const [hh, mm] = s.split(":").map(Number);
  return hh * 60 + mm;
}
function minutesToTimeString(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Връща масив от свободни слотове [{start: Date, end: Date}] между now и eventDate,
 * като изважда от тях всички лични и учебни събития (блокирани) на потребителя
 */
async function computeFreeSlots(userId, startDate, endDate) {
  // вземи събития, които се припокриват с периода
  const events = await Event.find({
    user: userId,
    $or: [
      { startDate: { $lte: endDate, $gte: startDate } },
      { endDate: { $lte: endDate, $gte: startDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
    ],
  }).sort({ startDate: 1 });

  const slots = [{ start: new Date(startDate), end: new Date(endDate) }];

  // Изваждаме всеки евент от основния слот лист
  for (const ev of events) {
    const evStart = new Date(ev.startDate);
    const evEnd = new Date(ev.endDate);
    const newSlots = [];

    for (const s of slots) {
      // няма припокриване
      if (evEnd <= s.start || evStart >= s.end) {
        newSlots.push(s);
        continue;
      }
      // припокриване - разделяме/скъсяваме
      if (evStart > s.start) {
        newSlots.push({ start: s.start, end: evStart });
      }
      if (evEnd < s.end) {
        newSlots.push({ start: evEnd, end: s.end });
      }
    }
    slots.length = 0;
    slots.push(...newSlots);
  }

  return slots;
}

/**
 * Намира свободни слотове КАТО ДЕНСКИ интервали съобразно studyWindow на потребителя.
 * Връща масив от слотове (start Date, end Date) само в studyWindow всеки ден.
 */
function splitSlotsByDailyWindow(slots, user) {
  const out = [];

  const studyStartMin = parseHHMMToMinutes(
    user.studyWindowStart || user.wakeTime || "08:00"
  );
  const studyEndMin = parseHHMMToMinutes(
    user.studyWindowEnd || user.sleepTime || "22:00"
  );

  for (const s of slots) {
    let cur = new Date(s.start);
    // floor to start of day
    while (cur < s.end) {
      const dayStart = new Date(cur);
      dayStart.setHours(0, 0, 0, 0);

      // compute study window for this day
      const windowStart = new Date(dayStart.getTime() + studyStartMin * 60000);
      const windowEnd = new Date(dayStart.getTime() + studyEndMin * 60000);

      // compute overlap between s and [windowStart, windowEnd]
      const start = s.start > windowStart ? s.start : windowStart;
      const end = s.end < windowEnd ? s.end : windowEnd;

      if (end > start) {
        out.push({ start: new Date(start), end: new Date(end) });
      }

      // move to next day
      cur = new Date(dayStart.getTime() + 24 * 60 * 60000);
    }
  }
  // sort
  out.sort((a, b) => a.start - b.start);
  return out;
}

/**
 * Разделя един свободен слот на сесии с ограничение preferredMin/Max длъжност
 * връща масив от сесии {start, end}
 */
function splitSlotToSessions(slot, minMinutes, maxMinutes) {
  const durationMin = Math.floor((slot.end - slot.start) / 60000);
  const sessions = [];

  if (durationMin <= 0) return sessions;

  // ако slot може да е само една сесия и попада в лимитите -> една
  if (durationMin <= maxMinutes) {
    sessions.push({ start: slot.start, end: slot.end });
    return sessions;
  }

  // иначе - опитваме да резнем няколко сесии от него всяка максимум maxMinutes
  let curStart = new Date(slot.start);
  while (true) {
    const curEndTime = new Date(curStart.getTime() + maxMinutes * 60000);
    if (curEndTime < slot.end) {
      sessions.push({ start: new Date(curStart), end: new Date(curEndTime) });
      // малка пауза (5 минути) между сесиите
      curStart = new Date(curEndTime.getTime() + 5 * 60000);
    } else {
      // последна сесия - ако е достатъчно дълга
      const lastDuration = Math.floor((slot.end - curStart) / 60000);
      if (lastDuration >= minMinutes) {
        sessions.push({ start: new Date(curStart), end: new Date(slot.end) });
      }
      break;
    }
    // safety break
    if (curStart >= slot.end) break;
  }

  return sessions;
}

/**
 * Основен генератор на учебен график
 * event: Event mongoose obj (with totalPages, startDate as exam date or event date)
 * userId: owner
 *
 * Връща: sessions [{start, end, pagesFrom, pagesTo, note}]
 */
export async function generateAdaptiveStudyPlan(event, userId) {
  const now = new Date();
  const eventDate = new Date(event.date);

  // safety: ако event е в миналото -> празно
  if (eventDate <= now || !event.totalPages) {
    return { eventId: event._id, sessions: [] };
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // 1) компресирай период на планиране - от днес до ден преди eventDate (не в деня)
  const planningEnd = new Date(eventDate);
  planningEnd.setDate(planningEnd.getDate()); // включително предния ден? тук включваме до eventDate - 1 час
  // ще позволим учене и в същия ден, но преди началото на събитието; оставяме това поведение, тъй като event може да е full-day
  const planningStart = new Date(now);

  // 2) намери всички събития в периода (за да ги блокираш)
  const freeSlotsRaw = await computeFreeSlots(
    userId,
    planningStart,
    planningEnd
  );

  // 3) филтрирай слотовете за дневния studyWindow
  const daySlots = splitSlotsByDailyWindow(freeSlotsRaw, user);

  // 4) превърни всеки daySlot в малки сесии според preferredMin/Max
  let candidateSessions = [];
  const minM = user.preferredMinSessionMinutes || 30;
  const maxM = user.preferredMaxSessionMinutes || 120;

  for (const slot of daySlots) {
    const parts = splitSlotToSessions(slot, minM, maxM);
    candidateSessions.push(...parts);
  }

  // Ако няма candidate sessions -> пробвай принудително да създадеш кратки 30-мин сутрин/вечер (fallback)
  if (candidateSessions.length === 0) {
    // опит за fallback в рамките на studyWindow на следващите дни
    const fallbackSlots = [];
    let d = new Date(planningStart);
    while (d <= planningEnd && fallbackSlots.length < 7) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const ws = parseHHMMToMinutes(user.studyWindowStart || "08:00");
      const s = new Date(dayStart.getTime() + ws * 60000);
      const e = new Date(s.getTime() + 60 * 60000); // 1h fallback
      if (s > now) fallbackSlots.push({ start: s, end: e });
      d.setDate(d.getDate() + 1);
    }
    for (const s of fallbackSlots) {
      candidateSessions.push(...splitSlotToSessions(s, minM, maxM));
    }
  }

  // 5) Разпределяне на страниците по candidateSessions (първичен pass)
  const totalPages = event.totalPages;
  const primarySessionsCount = candidateSessions.length;

  if (primarySessionsCount === 0) {
    return { eventId: event._id, sessions: [] };
  }

  // Изчисли обем страници/минути: предпочитаме да разпределим страниците пропорционално на времетраенето на сесията
  const durations = candidateSessions.map((s) =>
    Math.max(1, Math.floor((s.end - s.start) / 60000))
  );
  const totalMinutes = durations.reduce((a, b) => a + b, 0);

  // pages per minute heuristic (колко страници на минута - груба оценка)
  // тук използваме 0.5 страници/минута като базова стойност (можеш да коригираш)
  const pagesPerMinute = Math.max(
    0.2,
    Math.min(2.0, totalPages / Math.max(60, totalMinutes))
  );

  // Присвояване
  let assigned = [];
  let pageCursor = 1;
  for (let i = 0; i < candidateSessions.length; i++) {
    const s = candidateSessions[i];
    const mins = durations[i];
    // pages for this session proportionally
    let pagesFloat = Math.round(mins * pagesPerMinute);
    if (pagesFloat < 1) pagesFloat = 1;
    // ensure we don't overflow
    if (pageCursor + pagesFloat - 1 > totalPages) {
      pagesFloat = totalPages - pageCursor + 1;
    }
    const pFrom = pageCursor;
    const pTo = pageCursor + pagesFloat - 1;
    assigned.push({
      start: s.start,
      end: s.end,
      pagesFrom: pFrom,
      pagesTo: pTo,
      note: "Initial study",
    });
    pageCursor = pTo + 1;
    if (pageCursor > totalPages) break;
  }

  // Ако не сме разпределили всички страници (pageCursor <= totalPages) -> добавяме допълнителни сесии в най-ранните възможни слотове (drop-in)
  if (pageCursor <= totalPages) {
    // добави още сесии, опитвайки да разширим наличните
    for (
      let i = 0;
      i < candidateSessions.length && pageCursor <= totalPages;
      i++
    ) {
      const s = candidateSessions[i];
      // увеличим pagesTo ако има място (след current pagesTo)
      const extra = Math.min(10, totalPages - pageCursor + 1);
      assigned.push({
        start: new Date(s.end.getTime()), // опитваме веднага след текущата сесия (не идеално)
        end: new Date(s.end.getTime() + Math.min(60, extra * 2) * 60000),
        pagesFrom: pageCursor,
        pagesTo: Math.min(totalPages, pageCursor + extra - 1),
        note: "Extra study (fill gap)",
      });
      pageCursor += extra;
    }
  }

  // 6) Добавяне на повторения (spaced repetition) - за първоначално изучените блокове
  // Примерни интервали (в дни): 2, 4, 7
  const reviewIntervals = [2, 4, 7];
  const reviews = [];

  // За всеки initial session създаваме опит за review сесиите за pagesFrom-pagesTo
  for (const s of assigned) {
    for (let ri = 0; ri < reviewIntervals.length; ri++) {
      const reviewDay = reviewIntervals[ri];
      let desiredStart = addDays(s.start, reviewDay);
      // Търсим свободен слот на същия ден или най-близкия следващ
      // (тук просто намираме първия candidateSessions slot >= desiredStart)
      const slot = candidateSessions.find((cs) => cs.start >= desiredStart);
      if (slot) {
        reviews.push({
          start: slot.start,
          end: slot.end,
          pagesFrom: s.pagesFrom,
          pagesTo: s.pagesTo,
          note: `Review +${reviewDay}d`,
        });
      } else {
        // ако няма такъв слот, пробваме да сложим review преди event (на последния възможен ден)
        const lastSlot = candidateSessions[candidateSessions.length - 1];
        if (lastSlot && lastSlot.start < eventDate) {
          reviews.push({
            start: lastSlot.start,
            end: lastSlot.end,
            pagesFrom: s.pagesFrom,
            pagesTo: s.pagesTo,
            note: `Review (fallback +${reviewDay}d)`,
          });
        }
      }
    }
  }

  // Сливане на initial assigned и reviews и сортиране
  const resultSessions = [...assigned, ...reviews];
  resultSessions.sort((a, b) => new Date(a.start) - new Date(b.start));

  // Trim pages bounds if they overflow
  for (const rs of resultSessions) {
    if (rs.pagesTo > totalPages) rs.pagesTo = totalPages;
    if (rs.pagesFrom < 1) rs.pagesFrom = 1;
  }

  return {
    eventId: event._id,
    userId,
    eventDate: event.date,
    sessions: resultSessions.map((s) => ({
      start: s.start,
      end: s.end,
      pagesFrom: s.pagesFrom,
      pagesTo: s.pagesTo,
      note: s.note,
    })),
  };
}
