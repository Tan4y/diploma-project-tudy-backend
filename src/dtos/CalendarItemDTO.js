export class CalendarItemDTO {
  constructor({
    id,
    title,
    description = null,
    date,
    startTime,
    endTime,
    type,
    isStudySession,
    subject = null,
    category = null,
    pagesFrom = null,
    pagesTo = null,
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.date = date;
    this.startTime = startTime;
    this.endTime = endTime;
    this.type = type;
    this.isStudySession = isStudySession;
    this.subject = subject;
    this.category = category;
    this.pagesFrom = pagesFrom;
    this.pagesTo = pagesTo;
  }
}
