class InterviewsPane {
  constructor(container, options) {
    this.container = container;

    this.hostRole = options.role || "student"; // "student" | "professor"

    // API DTO list (as returned by Interview API)
    this.interviews = options.interviews || [];

    this.rangeDays = options.defaultRangeDays || 14;
    this.maxItems = options.maxItems ?? 7;

    // UI filters
    this.statusFilter = "upcoming"; // upcoming | completed | cancelled | all
    this.postingFilter = "";        // postingTitle
    this.textSearch = "";

    this.expandedId = null;

    this.render();
  }

  // --- Helpers (API schema) ---
  getStartDate(iv) {
    // iv.startTime should be ISO-8601. If it includes an offset (recommended), Date parsing works.
    return new Date(iv.startTime);
  }

  interviewerDisplay(iv) {
    const arr = Array.isArray(iv.interviewers) ? iv.interviewers : [];
    if (arr.length === 0) return "—";
    return arr.map(x => x?.name).filter(Boolean).join(", ") || "—";
  }

  postingDisplay(iv) {
    // Prefer postingTitle for human display; fall back to postingId or "—"
    return iv.postingTitle || iv.postingId || "—";
  }

  notesDisplay(iv) {
    // API contract: metadata.notes
    return iv?.metadata?.notes || "None";
  }

  isUrl(s) {
    return /^https?:\/\//i.test(String(s || ""));
  }

  // Upcoming semantics:
  // - status must be scheduled
  // - startTime within [now, now + defaultRangeDays]
  isUpcoming(iv, now, cutoff) {
    const d = this.getStartDate(iv);
    return iv.status === "scheduled" && d >= now && d <= cutoff;
  }

  // Status filter mapping:
  // UI "upcoming" => scheduled + within window
  // UI "completed" => status === completed
  // UI "cancelled" => status === cancelled
  // UI "all" => no status constraints
  passesStatusFilter(iv, now, cutoff) {
    if (this.statusFilter === "all") return true;
    if (this.statusFilter === "upcoming") return this.isUpcoming(iv, now, cutoff);
    return iv.status === this.statusFilter; // completed/cancelled
  }

  filterInterviews() {
    const now = new Date();
    const cutoff = new Date(now.getTime() + this.rangeDays * 86400000);

    const q = this.textSearch.trim().toLowerCase();

    return this.interviews
      .filter(iv => {
        // Status filter
        if (!this.passesStatusFilter(iv, now, cutoff)) return false;

        // Posting filter
        const posting = this.postingDisplay(iv);
        if (this.postingFilter && posting !== this.postingFilter) return false;

        // Text search across posting title + interviewer names
        if (q) {
          const jobTitle = (iv.postingTitle || "").toLowerCase();
          const interviewers = this.interviewerDisplay(iv).toLowerCase();
          const hay = (jobTitle + " " + interviewers).trim();
          if (!hay.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => this.getStartDate(a) - this.getStartDate(b));
  }

  setFilter(type, value) {
    this[type] = value;
    this.render();
  }

  toggleExpand(id) {
    this.expandedId = this.expandedId === id ? null : id;
    this.render();
  }

  render() {
    let results = this.filterInterviews();

    if (this.statusFilter === "upcoming" && this.maxItems) {
        results = results.slice(0, this.maxItems);
    }

    // Build posting list for dropdown (based on postingDisplay)
    const postings = [...new Set(this.interviews.map(iv => this.postingDisplay(iv)))]
      .filter(p => p && p !== "—")
      .sort();

    this.container.innerHTML = `
      <div class="interviews-box">
        <div class="header-row">
            <h2 class="title">Interviews</h2>
            <span class="role-pill">Role: ...</span>
        </div>


        <div class="filters">
          <select id="filter-status">
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All</option>
          </select>

          ${this.statusFilter === "upcoming" ? `
            <select id="filter-range">
            <option value="7">Next 7 days</option>
            <option value="14">Next 14 days</option>
            </select>
          ` : ""}

          <select id="filter-posting">
            <option value="">All Postings</option>
            ${postings.map(p => `<option value="${this.escapeHtml(p)}">${this.escapeHtml(p)}</option>`).join("")}
          </select>

          <input id="filter-text" placeholder="Search interviewer or posting title">
        </div>

        <div class="iv-list">
          ${
            results.length === 0
              ? `<p class="none">No interviews found.</p>`
              : results.map(iv => {
                  const id = iv.interviewId;               // API field
                  const start = this.getStartDate(iv);
                  const tz = iv.timezone || "—";
                  const title = this.postingDisplay(iv);   // postingTitle preferred
                  const interviewers = this.interviewerDisplay(iv);

                  return `
                    <div class="iv-card">
                      <div class="iv-top">
                        <div>
                          <div class="iv-title">${this.escapeHtml(title)}</div>
                          <div class="iv-date">${this.escapeHtml(start.toLocaleString())} (${this.escapeHtml(tz)})</div>
                          <div class="iv-interviewer">Interviewer(s): ${this.escapeHtml(interviewers)}</div>
                        </div>
                        <button class="toggle-btn" data-id="${this.escapeHtml(id)}">
                          ${this.expandedId === id ? "Hide" : "Details"}
                        </button>
                      </div>

                      ${
                        this.expandedId === id
                          ? `
                            <div class="iv-details">
                              <p><strong>Status:</strong> ${this.escapeHtml(iv.status || "—")}</p>
                              <p><strong>Role:</strong> ${this.escapeHtml(iv.role || "—")}</p>
                              <p><strong>Posting:</strong> ${this.escapeHtml(this.postingDisplay(iv))}</p>
                              <p><strong>Location:</strong> ${
                                this.isUrl(iv.location)
                                    ? `<a href="${this.escapeHtml(iv.location)}"
                                        target="_blank"
                                        rel="noopener noreferrer">
                                        ${this.escapeHtml(iv.location)}
                                    </a>`
                                    : this.escapeHtml(iv.location || "—")
                              }</p>
                              <p><strong>Notes:</strong> ${this.escapeHtml(this.notesDisplay(iv))}</p>
                              <p><strong>Timezone:</strong> ${this.escapeHtml(iv.timezone || "—")}</p>
                              <p><strong>Start:</strong> ${this.escapeHtml(this.getStartDate(iv).toLocaleString())}</p>
                              <p><strong>End:</strong> ${this.escapeHtml(iv.endTime ? new Date(iv.endTime).toLocaleString() : "—")}</p>

                            </div>
                          `
                          : ""
                      }
                    </div>
                  `;
                }).join("")
          }
        </div>
      </div>
    `;

    // Bind filter events
    this.container.querySelector("#filter-status").value = this.statusFilter;
    this.container.querySelector("#filter-status").onchange = e =>
      this.setFilter("statusFilter", e.target.value);

    // Bind range selector (only exists for upcoming)
    const rangeEl = this.container.querySelector("#filter-range");
    if (rangeEl) {
      rangeEl.value = String(this.rangeDays);
      rangeEl.onchange = e => {
        this.rangeDays = Number(e.target.value);
        this.render();
      };
    }

    this.container.querySelector("#filter-posting").value = this.postingFilter;
    this.container.querySelector("#filter-posting").onchange = e =>
      this.setFilter("postingFilter", e.target.value);

    this.container.querySelector("#filter-text").value = this.textSearch;
    this.container.querySelector("#filter-text").oninput = e =>
      this.setFilter("textSearch", e.target.value);

    // Bind toggle events
    this.container.querySelectorAll(".toggle-btn").forEach(btn => {
      btn.onclick = () => this.toggleExpand(btn.dataset.id);
    });
  }

  // Very small XSS guard since we’re interpolating strings into HTML
  escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}