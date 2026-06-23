/* =============================================================================
 * calendar.js  -  Add to Calendar (.ics download)
 * =============================================================================
 *
 * Builds a standard .ics calendar file from the event details in config.js and
 * downloads it when the visitor clicks "Add to Calendar". No external service
 * is used, so this is completely free and works offline.
 *
 * The "time to be determined" case is handled gracefully:
 *   - If the start time is still "TBD", the event is written as an ALL DAY
 *     event for the event date. Calendar apps accept this happily.
 *   - Once a real start/end time is entered in config.js (startTime24 and
 *     endTime24 in 24-hour HH:MM format), a normal timed event is produced.
 * ========================================================================== */

(function () {
  "use strict";

  // Pad a number to two digits, e.g. 9 -> "09".
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  // Escape text for the .ics format (commas, semicolons, newlines, backslashes).
  function escapeICS(text) {
    return String(text || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");
  }

  // Long .ics lines should be folded at 75 octets. This keeps strict parsers
  // happy. We fold conservatively by character count.
  function foldLine(line) {
    if (line.length <= 75) return line;
    var result = "";
    var index = 0;
    while (index < line.length) {
      var chunk = line.substring(index, index + 73);
      result += (index === 0 ? "" : "\r\n ") + chunk;
      index += 73;
    }
    return result;
  }

  // Turn "2026-08-22" into [2026, 8, 22].
  function parseISODate(iso) {
    var parts = String(iso).split("-");
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10),
    };
  }

  // Turn "14:00" into { hours: 14, minutes: 0 } or null if not a valid time.
  function parseTime24(value) {
    if (!value || String(value).toUpperCase() === "TBD") return null;
    var m = String(value).match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    var hours = parseInt(m[1], 10);
    var minutes = parseInt(m[2], 10);
    if (hours > 23 || minutes > 59) return null;
    return { hours: hours, minutes: minutes };
  }

  // Format a date as YYYYMMDD for an all-day event.
  function formatDate(d) {
    return "" + d.year + pad(d.month) + pad(d.day);
  }

  // Format a local date and time as a floating (no timezone) value
  // YYYYMMDDTHHMMSS. Floating times display at the same wall-clock time in any
  // timezone, which is the safe choice when we do not know the venue timezone.
  function formatLocalDateTime(d, t) {
    return "" + d.year + pad(d.month) + pad(d.day) + "T" + pad(t.hours) + pad(t.minutes) + "00";
  }

  // Add one day to a {year, month, day} object, used for all-day DTEND.
  function nextDay(d) {
    var js = new Date(d.year, d.month - 1, d.day + 1);
    return { year: js.getFullYear(), month: js.getMonth() + 1, day: js.getDate() };
  }

  // Build the full .ics text.
  function buildICS(cfg) {
    var ev = cfg.event;
    var date = parseISODate(ev.dateISO);
    var start = parseTime24(ev.startTime24);
    var end = parseTime24(ev.endTime24);

    // Build location and description from whatever is known.
    var locationParts = [];
    if (ev.venueName && ev.venueName !== "TBD") locationParts.push(ev.venueName);
    if (ev.streetAddress && ev.streetAddress !== "TBD") locationParts.push(ev.streetAddress);
    var cityLine = [ev.city, ev.state].filter(function (x) { return x && x !== "TBD"; }).join(", ");
    if (ev.zip && ev.zip !== "TBD") cityLine += " " + ev.zip;
    if (cityLine.trim()) locationParts.push(cityLine.trim());
    var location = locationParts.join(", ");

    var description = cfg.deceased.eyebrow + " " + cfg.deceased.fullName + ". " +
      (start ? "" : "Time to be announced. ") +
      "Please see the event website for the latest details.";

    // A stable unique id helps calendars recognize updates.
    var uid = "col-" + ev.dateISO + "-" + Math.random().toString(36).slice(2) + "@celebration-of-life";

    // DTSTAMP must be a UTC timestamp.
    var now = new Date();
    var dtstamp = "" + now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) +
      "T" + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + "Z";

    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Celebration of Life//RSVP Site//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + dtstamp,
      "SUMMARY:" + escapeICS(ev.name + " - " + cfg.deceased.fullName),
    ];

    if (start) {
      // Timed event (floating local time).
      lines.push("DTSTART:" + formatLocalDateTime(date, start));
      if (end) {
        lines.push("DTEND:" + formatLocalDateTime(date, end));
      } else {
        // Default to two hours if no end time is given.
        var assumedEnd = { hours: (start.hours + 2) % 24, minutes: start.minutes };
        lines.push("DTEND:" + formatLocalDateTime(date, assumedEnd));
      }
    } else {
      // All-day event for the date. DTEND is the following day per the spec.
      lines.push("DTSTART;VALUE=DATE:" + formatDate(date));
      lines.push("DTEND;VALUE=DATE:" + formatDate(nextDay(date)));
    }

    if (location) lines.push("LOCATION:" + escapeICS(location));
    lines.push("DESCRIPTION:" + escapeICS(description));
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
    lines.push("END:VCALENDAR");

    return lines.map(foldLine).join("\r\n");
  }

  // Trigger a download of the .ics file.
  function downloadICS() {
    var cfg = window.CONFIG;
    if (!cfg) return;

    var icsText = buildICS(cfg);
    var blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);

    var link = document.createElement("a");
    link.href = url;
    link.download = "celebration-of-life.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Release the object URL after a short delay so the download can start.
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // Expose for app.js to wire up the button.
  window.CalendarFeature = { download: downloadICS };
})();
