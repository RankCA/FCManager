# ⚽ FC Manager

A full football management game that runs as its own app — no install, no build step,
no internet connection needed once it's on your machine.

Real clubs, real players, real FC 26 ratings.

---

## Running it

**Double-click `Launch FC Manager.command`.**

That starts a small local server and opens the game in your browser. Keep the little
terminal window open while you play; closing it quits the server.

> You can also open `index.html` directly, but the launcher is recommended —
> browsers restrict local storage on `file://` URLs.

Requires Python 3, which macOS already includes.

---

## The data

Squads, ratings, potentials, values, wages and contracts come from the **public
FC 26 dataset** (18,405 players, ratings dated 19 Sep 2025) published at
[EAFC26-DataHub](https://github.com/ismailoksuz/EAFC26-DataHub). Salah 91, Mbappé 91,
Bellingham 90 — the real launch ratings.

What's included:

| | |
|---|---|
| **Leagues** | 22 across 15 countries |
| **Clubs** | 400 |
| **Players** | 11,182 |
| **Attributes** | 6 face stats + 29 detailed attributes + GK stats, per player |

England runs four tiers deep (Premier League → League Two), with Spain, Italy, Germany
and France two deep, plus Portugal, Netherlands, Belgium, Turkey, Scotland, Switzerland,
Austria, Denmark, Poland and Saudi Arabia.

Youth academy prospects are **generated**, not real people — their names are recombined
from real first/last name pools per nationality, so an Italian graduate comes through as
something like *Matteo Ricci* rather than a real player.

---

## Difficulty

Chosen when you start a career. It changes the budget you inherit, what the
board demands, and how fast their patience runs out.

| | Budget | Board | Job security |
|---|---|---|---|
| **Sandbox** | £1B in the bank | No expectations | Cannot be sacked |
| **Easy** | +45% | Lenient | Practically bulletproof |
| **Normal** | Baseline | Realistic | Most games matter |
| **Hard** | −22% | Ambitious | Every game matters |
| **Nightmare** | −50% | Outlandish | Looking for a reason |

For a mid-table club that means: Easy asks you to stay up, Normal expects
17th, Hard wants 13th, and Nightmare demands a European push *on half the
budget*. In testing, a weak side on Nightmare was sacked by mid-November.

**Sandbox** starts you with **£1 billion in the bank**, with the transfer budget
drawn straight from it — every fee you pay comes out of the balance and the two
fall together, and the budget can never exceed what is actually in the bank. It
also unlocks a ⚡ tab: set the balance and budgets, edit any player's rating,
potential or age, force any transfer in the world for free, heal the squad, and
max out board confidence.

## What's in the game

**Career progression**
- Players develop toward a hidden potential; game time is the biggest driver, then
  training facilities and coaching quality
- Transfer values and wage demands move with form, age, rating and contract length
- Players peak around 27–30 and decline after, pace-reliant players fastest
- Injuries, fitness, morale, form, suspensions

**Squad & tactics**
- 16 formations, drag-and-drop line-up and bench
- **Click any position** to pick from your *entire* squad — reserves included —
  ranked by how good each player is *in that role*, with fitness, form and
  availability shown inline
- Separate Reserves panel; one click sends a reserve to the bench
- Out-of-position penalties based on a real familiarity matrix
- Mentality, tempo, width, pressing, defensive line, passing
- Captain, penalty/free-kick/corner takers
- Suspensions: five bookings or a red card rules a player out

**Live matches**
- **Watch your matches unfold** minute by minute, with written commentary that
  names the players — goals, saves, chances, cards and substitutions
- Live score, clock, momentum bar, running match stats, and your XI with
  stamina bars draining in real time
- **Manage from the touchline**: make substitutions and change mentality,
  tempo, pressing or defensive line mid-game
- Speed control (Slow → Turbo), pause, or skip straight to the whistle
- Goals trigger a full-screen flash, and derbies are flagged in the header
- Prefer the old instant results? Sim-to-date always fast-forwards

**Training**
- Seven weekly team focuses — Balanced, Attacking, Defending, Technical,
  Fitness, High Intensity, Recovery — each with real trade-offs. Measured over
  a season: High Intensity grows prospects fastest (+1.63 avg) but triples
  injuries; Recovery barely develops anyone but keeps everyone fit
- Individual programmes per player (shooting, passing, pace…), which work
  fastest on under-23s

**Backroom staff**
- Hire a Head Coach, Academy Director, Chief Scout, Head Physio and Fitness
  Coach, each rated 1–5 with a weekly wage
- They genuinely matter: a 5★ head coach more than doubles youth development
  versus a 1★ (+1.25 vs +0.50 overall per prospect per season). The physio
  shortens injuries, the scout finds better prospects abroad

**Awards, records & objectives**
- Player of the Month, and end-of-season Golden Boot, Playmaker, Golden Glove,
  Player of the Season and Young Player of the Season
- **Team of the Season** — a properly shaped XI, not just the eleven
  highest-rated players
- Club records: biggest win, heaviest defeat, longest unbeaten and winning
  runs, trophy cabinet, squad leaders
- **Season objectives** from the board, each with a confidence and cash
  reward, tracked live
- **Derbies** carry extra weight — the fixture list knows about 30 real
  rivalries from the Manchester derby to the Old Firm

**Calendar & simulation**
- Month calendar showing every fixture, result and competition
- **Sim to any date** — click a future day, or use Sim to next match /
  1 week / 1 month. Simulation always stops on your own matches

**Competitions**
- Domestic leagues with promotion and relegation
- 10 national cups (FA Cup, Copa del Rey, Coppa Italia, DFB-Pokal…) plus the League Cup —
  random draws, replays, penalty shootouts
- Champions League, Europa League and Conference League in the modern 36-team league-phase format
- International tournaments on a real cycle (World Cup 2026, Euros 2028…)

**Transfers**
- Full deal structuring: **instalments** (which lower what the fee is worth to
  the seller), **sell-on clauses** (which raise it), **appearance fees**,
  **goal bonuses**, **release clauses** and a promised **squad role**
- Sell-on clauses are honoured — sell a player you bought with one attached and
  a slice goes back to his old club
- **Loans out**: mark a player **loan listed** and clubs come to *you* with
  enquiries — length, how much of his wages they'll cover, and sometimes an
  option to buy. Accept or reject from your inbox. Only listed players attract
  interest, and the clubs who approach are pitched at his level
- **Loans in**: approach another club yourself from the bid screen
- Loanees return automatically when the spell ends
- **Block offers** on any player — rival clubs will not even approach him
- Fee negotiation *and* separate personal-terms negotiation — players refuse
  moves that are a step down or block their path to the first team
- **Free agents**: 89 real ones at kick-off (Depay, Ziyech, Saïss…), plus
  anyone whose contract you let run down. No fee, wages only
- Filter tabs for All / Free agents / Expiring contracts / Transfer listed /
  Shortlist / **My loan list**, plus filters for position, exact role, budget,
  age and nationality
- Star players to build a shortlist; release or transfer-list your own
- AI clubs trade with each other all season and bid for your players

**Youth academy**
- Start with 3–5 academy kids already on the books
- **Send scouts to 18 countries** — each trip costs a fee, lasts 4–10 weeks and
  returns 0–3 prospects, biased toward that nation's style (technical, flair,
  athletic, defensive). A better scouting network finds more and reports more
  precisely
- **Promote** to the senior squad or **release** any prospect
- Prospects who turn 18 without a first-team route grow restless, then demand a
  move, then walk out for nothing
- Youth develop noticeably faster than seniors, and graduates get a two-season
  development boost that scales hard with game time
- Scouted potential is shown as a *range* that narrows as scouting improves

**Finances**
- **Donut charts** breaking down where every pound goes — player wages, staff,
  transfers, stadium upkeep, academy, scouting, matchday — and where it comes
  from (commercial, TV, gate, player sales). Hover any segment for detail
- **Stadium expansion**: add 2,000–20,000 seats for a fee and a build period,
  up to 90,000. Bigger ground, bigger gate — and bigger upkeep
- **Ticket pricing** slider with a live attendance and revenue estimate. Price
  too high and the ground empties
- Upgradable facilities: academy, scouting, training, coaching
- Board confidence, season expectations, and the sack
- Players retire, contracts expire, and AI clubs rebuild from free agency —
  the world stays coherent over a long career

---

## Adding club badges

Drop image files into `assets/badges/` named after the club slug:

```
assets/badges/liverpool.png
assets/badges/real-madrid.png
assets/badges/fc-bayern-munchen.png
```

`.png` is recommended; `.svg`, `.jpg` and `.webp` also work.

**`assets/badges/BADGE-NAMES.md` lists the exact filename for all 400 clubs**,
grouped by country and league.

Any club without an image gets a generated monogram crest automatically, so you can add
as many or as few as you want, whenever you want.

---

## Controls

| | |
|---|---|
| `Space` | Continue / advance |
| `Esc` | Close dialog |
| Click any player | Full profile with all 29 attributes |
| Click a club in the table | Squad overview |
| Click a pitch position | Choose from the whole squad |
| Click a calendar date | Simulate up to it |
| Drag on the pitch | Swap two players |
| Continue | Watch your next match live |
| Sim to match | Fast-forward, results only |

## Saving

Hit **Save** in the top-right for two options:

- **💾 Download save file** — the reliable one. Writes a compressed `.fcsave`
  file (a 4.3 MB career packs down to ~840 KB, about 80% smaller) named after
  your club and season. Load it again with **Load save file…** on the start
  screen.
- **⚡ Quick save to browser** — convenient, but browsers cap local storage at
  roughly 5 MB and a long career will outgrow it. If it does, the game tells
  you the actual size and points you at the file option instead of failing
  with a raw browser error.

The start screen shows **Continue** when a browser save exists, or **Load file**
when your last save went to disk.

The running version is shown bottom-right of the start screen and as a chip in
the top bar — hover it for the full build and data details. Save files record
the format version, so a file from a newer build is rejected with a clear
message rather than loading corrupt.

---

## Notes on the simulation

The match engine runs minute by minute — possession, chance creation, shot quality
versus goalkeeper, fouls, cards, fatigue and substitutions. It's tuned against real
football:

- ~2.7–3.3 goals per game, most common scorelines 2-0 / 2-1 / 1-0 / 1-1
- ~10 shots and ~3.8 on target per side
- ~2.1 yellows and 0.11 reds per game
- Squad strength predicts final league position at ρ ≈ 0.77 — strong favourites usually
  win, but Forest-in-2025 surprises still happen
- A full season of all 22 leagues (~7,600 matches) simulates in about 4 seconds

`dev-test.html` and `dev-test-season.html` are the test suites used to calibrate this —
open either in the browser to re-run them.
