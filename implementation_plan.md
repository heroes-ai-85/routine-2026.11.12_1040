# Daily Routine & Elapsed Time Tracker (원터치 일상 기록기)

A focused, touch-first daily activity and elapsed-time logging application designed to help users capture daily milestones with a single tap, visually monitor elapsed duration between habits, maintain temporal awareness, and effortlessly export or email daily logs.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product decisions were confirmed during the planning interview and serve as the baseline specification:

- **Confirmed Decision 1 (Layout & Ergonomics)**: Clean mobile-first interface optimized for touch ergonomics with an eye-catching, responsive circular main action button, live elapsed time counter, and an interactive chronological activity timeline below.
- **Confirmed Decision 2 (Routine Sequence & Nighttime Cycle)**: When the final routine ("잠자리 누움") is logged, the next routine automatically loops to the first item ("기상"). This automatically tracks and displays the overnight sleep duration between going to bed and waking up the next day.
- **Confirmed Decision 3 (Export & Sharing Support)**: Full multi-format export capabilities supporting Excel (.xlsx via clean XML/data-sheet generator or CSV), plain text (.txt), CSV download, and a one-click email composer (`mailto:`) pre-filled with the day's formatted timeline summary.

---

## 1. Overview & Core Concept

- **What It Does**: 
  - Displays a prominent, circular action button showing the next upcoming routine (starting with "기상" - Wake Up).
  - Tapping the button instantly records the current date, exact time, and routine label, and immediately starts a live stopwatch measuring elapsed time ("X시간 Y분 Z초 경과").
  - Automatically advances the button label to the next routine item in sequence:
    `[기상 → 아침 시작 → 아침 끝 → 양치 → 점심 시작 → 점심 끝 → 양치 → 저녁 시작 → 저녁 끝 → 양치 → 잠자리 누움 → (기상)]`.
  - Calculates and displays the exact duration spent between consecutive routine steps (e.g., meal duration, work interval, and overnight sleep duration).
  - Provides intuitive inline/modal editing for logged records: users can adjust the recorded timestamp using numeric keyboard inputs and modify the action text from the routine list or custom text.
  - Allows full management of the routine sequence (add new items, reorder, edit, or delete items).
  - Automatically saves all history to persistent local storage with date navigation, plus instant export to Excel (.xlsx / .csv), formatted text (.txt), and email sharing.
- **Target Audience / Persona**: Anyone seeking friction-free daily habit tracking, ADHD-friendly routine prompting, time-blindness mitigation, or health/sleep interval monitoring without complex forms or high cognitive load.
- **Key Value**: Zero-friction recording (single-touch), instant temporal awareness (elapsed timer), and automatic next-step guidance to keep daily momentum without distraction.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **One-Tap Routine Logging**:
     - User opens the app. The central circular button displays the current action label (default: "기상").
     - User taps the button: tactile press animation triggers, the log entry is created with current timestamp, and the button label seamlessly transitions to the next item ("아침 시작").
     - The live elapsed stopwatch immediately ticks upward from `00:00:00`, displaying real-time hours, minutes, and seconds elapsed since the last tap.
  2. **Timeline & Duration Review**:
     - The timeline below displays today's events chronologically with clear duration chips (e.g., "소요 시간: 42분", "수면 시간: 7시간 15분").
  3. **Edit Log Entry**:
     - User clicks "수정" (Edit) on any logged item.
     - A clean modal or inline panel allows direct numeric keyboard editing of hour/minute (`HH:mm`), date adjustment, and one-tap selection from existing routine items or custom text input.
  4. **Routine Sequence Customization**:
     - A dedicated "루틴 관리" (Manage Routines) sheet allows adding new steps, editing names, reordering, and deleting items.
  5. **Export & Share**:
     - Date picker to view previous days' logs.
     - Single-click export toolbar: Download Excel (.xlsx / .csv), Text (.txt), and "이메일로 보내기" (opens email client with full day log formatted).

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Warm, calm, and tactile utilitarianism. Designed to feel like a high-end physical stopwatch desk clock with smooth digital ergonomics.
  - *Color Palette & Tokens*:
    - Neutral canvas: Soft off-white slate (`#F8FAFC` / `dark: #090D16`).
    - Surface containers: Crisp white (`#FFFFFF` / `dark: #131B2E`) with hairline borders (`border-slate-200/80` / `dark:border-slate-800`).
    - Primary CTA Accent: Indigo / Deep Sapphire gradient (`#2563EB` to `#1D4ED8` with subtle ring glow) providing high contrast and satisfying tactile feedback.
    - Status Accents: Calming emerald for completed intervals, soft amber for current active duration.
  - *Typography & Hierarchy*:
    - Display / Button Face: Neo-Grotesque sans (`Plus Jakarta Sans` / modern system font stack) with bold, clean Korean glyph rendering.
    - Stopwatch & Numerals: Monospace tabular numerals (`font-mono tabular-nums tracking-tight`) to ensure stable digits without layout shifts.
    - Unboxed metadata with typographic separators (`·`), avoiding heavy pill clutter.
  - *Ergonomics*:
    - Central action button sized at 180px–220px diameter on mobile / desktop, with generous tap area and micro-scale animations (`active:scale-95`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Sleep Duration Calculation Across Midnight & Next Day Loop**
  - *Chosen Approach*: When logging "기상" after "잠자리 누움", calculate the elapsed interval across midnight seamlessly and tag it specifically as "수면 시간 (Sleep Duration)".
  - *Why*: Provides immediate, actionable health insight without requiring a separate sleep tracking app.
- **Decision 2: Numeric Keyboard Time Input**
  - *Chosen Approach*: Dual mode: direct 2-digit numeric inputs (`[시] : [분]`) with numeric keyboard `inputMode="numeric"` plus quick 5/10/30-minute nudge buttons (`+5분`, `-5분`).
  - *Why*: Native mobile time pickers can be frustrating and slow; direct numeric entry satisfies the user's specific request for keyboard number inputs while being lightning fast.
- **Decision 3: Client-Side Excel & Text Export**
  - *Chosen Approach*: Generate clean TSV/CSV and genuine XML Spreadsheet / standard .csv and formatted .txt directly in the browser via Blob URLs, paired with standard `mailto:` encoding for email sharing.
  - *Why*: Instant zero-latency downloads without server dependencies or external tracking, safeguarding user privacy.
- **Decision 4: Local Storage Persistence with Multi-Day Archive**
  - *Chosen Approach*: Automatically organize logs by ISO date string (`YYYY-MM-DD`), allowing historical browsing and multi-day backup.

---

## 4. Technical Architecture & Data Strategy

### System & Component Hierarchy

```
┌────────────────────────────────────────────────────────┐
│                        App.tsx                         │
│  - Active Date State (today / historical dates)        │
│  - Routine Master List State (persistent in storage)   │
│  - Daily Logs Map: Record<string, DailyLogEntry[]>     │
│  - Active Stopwatch Tick Interval (1 sec ticker)      │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
┌───────────▼───────────┐        ┌───────────▼───────────┐
│   TopBar & DateNav    │        │   MainButtonHero      │
│  - Brand wordmark     │        │  - 200px Round Button │
│  - Date selector      │        │  - Next Action Label  │
│  - Export / Email menu│        │  - Live Elapsed Timer │
│  - Routine Settings   │        │  - Progress Indicator │
└───────────────────────┘        └───────────┬───────────┘
                                             │
┌────────────────────────────────────────────▼───────────┐
│                   TimelineLogList                      │
│  - Chronological list of recorded events for the day   │
│  - Event timestamp & Action label                      │
│  - Elapsed duration since previous event               │
│  - "수정" (Edit) & "삭제" (Delete) action triggers       │
└───────────┬────────────────────────────────────────────┘
            │
┌───────────▼───────────┐        ┌───────────────────────┐
│     EditLogModal      │        │ RoutineSettingsModal  │
│  - Direct numeric time│        │  - Reorder items      │
│  - Action select list │        │  - Add / edit / delete│
│  - Custom action input│        │  - Reset to default   │
└───────────────────────┘        └───────────────────────┘
```

### Data Models

```typescript
export interface RoutineItem {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface LogEntry {
  id: string;
  dateStr: string; // YYYY-MM-DD
  timestamp: number; // Unix epoch ms
  timeFormatted: string; // HH:mm:ss or HH:mm
  action: string;
  routineId?: string;
  durationMs?: number; // duration since previous entry in milliseconds
  durationFormatted?: string; // e.g. "1시간 25분" or "45분"
  isSleepDuration?: boolean; // true if interval between 잠자리 누움 and 기상
  note?: string;
}

export interface DailyArchive {
  [dateStr: string]: LogEntry[];
}
```

### Interactive State Transitions

1. **Initial State (Zero Logs)**:
   - Button shows `기상`. Stopwatch is idle or displays "기록 대기 중".
2. **First Tap ("기상" logged at 07:00:00)**:
   - Log entry created: `{ timestamp: 07:00:00, action: '기상', durationMs: null }`.
   - Button immediately displays next item: `아침 시작`.
   - Live timer starts counting: `00:00:01`, `00:00:02`...
3. **Second Tap ("아침 시작" logged at 07:45:00)**:
   - Duration calculated: `45분 소요`.
   - Log entry created: `{ timestamp: 07:45:00, action: '아침 시작', durationMs: 2700000, durationFormatted: '45분' }`.
   - Button advances to: `아침 끝`.
   - Timer resets to 0 and counts elapsed time for "아침 끝".
4. **Final Routine Tap ("잠자리 누움")**:
   - Logged with elapsed time since previous event.
   - Button advances back to: `기상` for the next cycle.
5. **Next Day First Tap ("기상" logged at 06:30:00)**:
   - Detects previous item was `잠자리 누움`.
   - Calculates overnight interval (e.g., `7시간 30분`) and highlights as "수면 시간: 7시간 30분".

---

## 5. Verification & Testing Checklist

- [ ] Main circular button prominently rendered with smooth hover and tap states.
- [ ] Initial state correctly defaults to "기상" and advances predictably through the 11 default routines.
- [ ] Live elapsed timer counts accurately in real time every second.
- [ ] Duration between events accurately calculated and formatted in Korean (`X시간 Y분`).
- [ ] Overnight sleep duration calculated correctly when looping from "잠자리 누움" back to "기상".
- [ ] Edit modal allows numeric keyboard entry for time and selection/customization of action text.
- [ ] Routine management allows adding, editing, reordering, and deleting items.
- [ ] Exports valid XLSX / CSV and TXT files, and pre-populates email draft with date and activity log.
- [ ] Local storage persistence retains data on refresh across dates.
