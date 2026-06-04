// src/services/studyScheduler.service.js
import Event from "../models/Event.js";
import User from "../models/User.js";
import StudyPlan from "../models/StudyPlan.js";

function parseHHMMToMinutes(value) {
  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }

  if (typeof value === "string") {
    const [hh, mm] = value.split(":").map(Number);
    return hh * 60 + mm;
  }

  throw new Error("Invalid time format for parseHHMMToMinutes");
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

function getStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getEventTimeOnDate(eventDate, timeValue) {
  if (!timeValue) return null;

  const minutes = parseHHMMToMinutes(timeValue);

  const result = new Date(eventDate);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  result.setHours(hours, mins, 0, 0);

  return result;
}

async function computeFreeSlots(userId, startDate, endDate) {
  const rangeStart = getStartOfDay(startDate);
  const rangeEnd = getEndOfDay(endDate);

  const events = await Event.find({
    user: userId,
    date: {
      $gte: rangeStart,
      $lte: rangeEnd,
    },
  });

  const slots = [{ start: new Date(startDate), end: new Date(endDate) }];

  for (const ev of events) {
    const evDate = new Date(ev.date);
    evDate.setHours(0, 0, 0, 0);

    const evStart = getEventTimeOnDate(evDate, ev.startTime);
    const evEnd = getEventTimeOnDate(evDate, ev.endTime);

    const newSlots = [];

    for (const s of slots) {
      if (evEnd <= s.start || evStart >= s.end) {
        newSlots.push(s);
        continue;
      }

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

function splitSlotsByDailyWindow(slots, user) {
  const out = [];

  const studyStartMin = parseHHMMToMinutes(
    user.studyWindowStart || user.wakeTime || "08:00",
  );
  const studyEndMin = parseHHMMToMinutes(
    user.studyWindowEnd || user.sleepTime || "22:00",
  );

  for (const s of slots) {
    let cur = new Date(s.start);
    while (cur < s.end) {
      const dayStart = new Date(cur);
      dayStart.setHours(0, 0, 0, 0);

      const windowStart = new Date(dayStart.getTime() + studyStartMin * 60000);
      const windowEnd = new Date(dayStart.getTime() + studyEndMin * 60000);

      const start = s.start > windowStart ? s.start : windowStart;
      const end = s.end < windowEnd ? s.end : windowEnd;

      if (end > start) {
        out.push({ start: new Date(start), end: new Date(end) });
      }

      cur = new Date(dayStart.getTime() + 24 * 60 * 60000);
    }
  }
  // sort
  out.sort((a, b) => a.start - b.start);
  return out;
}

function splitSlotToSessions(slot, minMinutes, maxMinutes) {
  const durationMin = Math.floor((slot.end - slot.start) / 60000);
  const sessions = [];

  if (durationMin <= 0) return sessions;

  if (durationMin <= maxMinutes) {
    sessions.push({ start: slot.start, end: slot.end });
    return sessions;
  }

  let curStart = new Date(slot.start);
  while (true) {
    const curEndTime = new Date(curStart.getTime() + maxMinutes * 60000);
    if (curEndTime < slot.end) {
      sessions.push({ start: new Date(curStart), end: new Date(curEndTime) });
      curStart = new Date(curEndTime.getTime() + 5 * 60000);
    } else {
      const lastDuration = Math.floor((slot.end - curStart) / 60000);
      if (lastDuration >= minMinutes) {
        sessions.push({ start: new Date(curStart), end: new Date(slot.end) });
      }
      break;
    }
    if (curStart >= slot.end) break;
  }

  return sessions;
}

function findNextAvailableSlot(
  desiredStart,
  freeSlots,
  occupied,
  minDurationMinutes = 30,
) {
  for (const slot of freeSlots) {
    const overlaps = occupied.some(
      (occ) => slot.start < occ.end && slot.end > occ.start,
    );
    if (overlaps) continue;

    const start = slot.start > desiredStart ? slot.start : desiredStart;
    const end = slot.end;

    if ((end - start) / 60000 >= minDurationMinutes) {
      return { start, end };
    }
  }
  return null;
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

  if (eventDate <= now || !event.totalPages) {
    return { eventId: event._id, sessions: [] };
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // компресирай период на планиране - от днес до ден преди eventDate
  const planningEnd = new Date(eventDate);
  planningEnd.setDate(planningEnd.getDate() - 1);
  const planningStart = new Date(now);

  // намери всички събития в периода (за да ги блокираш)
  let freeSlotsRaw = await computeFreeSlots(userId, planningStart, planningEnd);

  // филтрирай слотовете за дневния studyWindow
  const allFreeSlots = splitSlotsByDailyWindow(freeSlotsRaw, user);
  const daySlots = allFreeSlots;

  // превърни всеки daySlot в малки сесии според preferredMin/Max
  let candidateSessions = [];
  const minM = user.preferredMinSessionMinutes || 30;
  const maxM = user.preferredMaxSessionMinutes || 120;

  for (const slot of daySlots) {
    const parts = splitSlotToSessions(slot, minM, maxM);
    candidateSessions.push(...parts);
  }

  // Ако няма candidate sessions -> пробвай принудително да създадеш кратки 30-мин (fallback)
  if (candidateSessions.length === 0) {
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

  // Разпределяне на страниците по candidateSessions
  const totalPages = event.totalPages;
  const primarySessionsCount = candidateSessions.length;

  if (primarySessionsCount === 0) {
    return { eventId: event._id, sessions: [] };
  }

  // Изчисли обем страници/минути
  const durations = candidateSessions.map((s) =>
    Math.max(1, Math.floor((s.end - s.start) / 60000)),
  );
  const totalMinutes = durations.reduce((a, b) => a + b, 0);

  let floatPages = durations.map((d) => (d / totalMinutes) * totalPages);

  const pagesPerMinute = Math.max(
    0.2,
    Math.min(2.0, totalPages / Math.max(60, totalMinutes)),
  );

  // Присвояване
  let assigned = [];
  let pageCursor = 1;
  for (let i = 0; i < candidateSessions.length; i++) {
    const s = candidateSessions[i];
    const mins = durations[i];
    let pagesForSession = Math.round(floatPages[i]);
    if (pagesForSession < 1) pagesForSession = 1;
    if (pageCursor + pagesForSession - 1 > totalPages) {
      pagesForSession = totalPages - pageCursor + 1;
    }

    assigned.push({
      start: candidateSessions[i].start,
      end: candidateSessions[i].end,
      pagesFrom: pageCursor,
      pagesTo: pageCursor + pagesForSession - 1,
      note: "Initial study",
    });

    pageCursor += pagesForSession;

    if (pageCursor > totalPages) break;
  }

  // Merge tiny sessions if they are below minPagesPerSession
  const minPagesPerSession = 5;

  for (let i = 0; i < assigned.length; i++) {
    const sessionPages = assigned[i].pagesTo - assigned[i].pagesFrom + 1;

    if (sessionPages < minPagesPerSession) {
      if (i + 1 < assigned.length) {
        assigned[i + 1].pagesFrom = assigned[i].pagesFrom;
        assigned.splice(i, 1);
        i--;
      }
    }
  }

  // Добавяне на повторения (spaced repetition)
  const reviewIntervals = [2, 4, 7];
  const reviews = [];
  const occupied = assigned.map((s) => ({ start: s.start, end: s.end }));

  for (const s of assigned) {
    for (const interval of reviewIntervals) {
      const desiredStart = addDays(s.start, interval);

      let slot = findNextAvailableSlot(
        desiredStart,
        allFreeSlots,
        occupied,
        minM,
      );

      if (!slot) {
        slot = allFreeSlots
          .slice()
          .sort((a, b) => a.start - b.start)
          .find(
            (cs) =>
              cs.start < eventDate &&
              (cs.end - cs.start) / 60000 >= minM &&
              !occupied.some((occ) => cs.start < occ.end && cs.end > occ.start),
          );
      }

      if (slot) {
        reviews.push({
          start: slot.start,
          end: slot.end,
          pagesFrom: s.pagesFrom,
          pagesTo: s.pagesTo,
          note:
            slot.start >= desiredStart
              ? `Review +${interval}d`
              : `Review (fallback +${interval}d)`,
        });

        occupied.push({ start: slot.start, end: slot.end });
      }
    }
  }

  // Merge all sessions and sort
  const resultSessions = [...assigned, ...reviews].sort(
    (a, b) => new Date(a.start) - new Date(b.start),
  );

  // Trim pages bounds if they overflow
  for (const rs of resultSessions) {
    if (rs.pagesTo > totalPages) rs.pagesTo = totalPages;
    if (rs.pagesFrom < 1) rs.pagesFrom = 1;
  }

  return {
    eventId: event._id,
    userId,
    eventDate: event.date,
    subject: event.subject || null,
    category: event.category || null,
    sessions: resultSessions.map((s) => ({
      start: s.start,
      end: s.end,
      pagesFrom: s.pagesFrom,
      pagesTo: s.pagesTo,
      note: s.note,
    })),
  };
}
