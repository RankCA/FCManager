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

Squads, ratings, potentials, values, wages and contracts come from a **public
FC 26 dataset** (18,405 players, ratings dated 19 Sep 2025) published at
[EAFC26-DataHub](https://github.com/ismailoksuz/EAFC26-DataHub). Salah 91, Mbappé 91,
Bellingham 90 — the real launch ratings.

What's included:

| | |
|---|---|
| **Leagues** | 22 across 15 countries |
| **Clubs** | 400 |
| **Players** | 11,182 at a modelled club, plus 522 real internationals from elsewhere |
| **National teams** | 211, across all six confederations |
| **Attributes** | 6 face stats + 29 detailed attributes + GK stats, per player |

England runs four tiers deep (Premier League → League Two), with Spain, Italy, Germany
and France two deep, plus Portugal, Netherlands, Belgium, Turkey, Scotland, Switzerland,
Austria, Denmark, Poland and Saudi Arabia.

Only 22 leagues are modelled, which leaves plenty of countries with almost nobody in
them. Two things close that gap. Real players from unmodelled leagues are pulled in for
any nation that is short — that is how Egypt gets Salah *and* a supporting cast, and how
Iran gets Taremi. Anything still under FIFA's 26-man minimum is topped up with generated
domestic-league professionals rated to the nation's real standing. Neither group can be
signed: they are under contract in a league the game does not simulate.

Youth academy prospects are **generated**, not real people — their names are recombined
from real first/last name pools per nationality, so an Italian graduate comes through as
something like *Matteo Ricci* rather than a real player. Countries too small to build a
pool from borrow one from a neighbour that shares their naming culture, so an Omani reads
as Omani rather than generically European.

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

Eleven tabs, no sub-tab mazes: **Home · Squad · Tactics · Schedule ·
Competitions · Transfers · Club · Career · Finances**, plus ⚡ Sandbox (god mode
only) and ⚙ Settings. Schedule holds the calendar and fixture list;
Competitions shows one competition at a time from a grouped picker (yours first, then the rest of the world); Club holds the
academy, staff, stadium, records and awards.

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

**Contracts, agents and free transfers**
- A **Contracts Expiring** panel sits on the Home tab all season. From
  January, rival clubs can agree **pre-contracts** with anyone whose deal is
  running down — and then you lose him for nothing in the summer
- Whether he re-signs depends on how you have treated him: minutes played,
  morale, and whether you have broken a promise to him before. A frozen-out
  player is *reluctant* and has to be paid well over the odds; a happy
  regular is *keen* and signs for the going rate
- **Agents take a cut** of every deal, scaling with the player's standing and
  ambition. It comes straight out of the balance
- Paying up tears a pre-contract back up — which is usually cheaper than
  replacing him

**Club takeovers**
- Clubs change hands over the summer — yours and everyone else's — and a new
  owner can rewrite the job overnight
- Six archetypes with genuinely different consequences: a **sugar daddy**
  multiplies your budget four and a half times and expects you to win almost
  everything almost immediately; a **cost-cutter** slashes it to 40% but
  understands what that means and gives you time; **fan ownership** has
  modest money and enormous patience; a **development project** upgrades the
  academy and judges you on the players you produce, not the table
- Ownership moves both the board's target *and* how far confidence can fall
  before you are sacked — 34% under a sugar daddy, 14% under supporter
  ownership
- It happens to rivals too, which is how a mid-table club becomes a problem
  in the space of one summer

**Opposition reports**
- A dossier on your next opponent from the next-match card: their likely XI
  read from their *actual* tactics, their form, and their attack, midfield
  and defence measured against the units you will put out
- **Depth tracks the Chief Scout you employ.** One star gets a form guide;
  three names their danger man; four finds the soft side of their back line
  and anyone carrying a knock or a booking; five shows their whole XI and
  recommends how to set up against it

**Youth intake day**
- Every March the academy delivers its crop as an event, with the academy
  director's verdict — from *"the best group we have had in years"* down to
  *"a poor crop, the academy needs investment"*, judged against what a club
  of your standing ought to be producing
- Potentials are shown as scouting *ranges*, so you have to make your own
  mind up about who is worth keeping

**Man management**
- **Promises are commitments.** Promise regular football, a starting place or
  a contract review, and you are held to it — measured against the minutes he
  actually gets. Keep your word and he trusts you more; break it and his
  morale drops thirty points and he remembers. Break it twice and he asks to
  leave
- **Conversations are a read, not a button.** Praising a player in poor form
  rings hollow and costs you. Criticising one who is carrying the side is
  taken badly. Ambitious players swing hardest either way, and there is a
  fortnight's cooldown so talking keeps meaning something
- **The dressing room has a hierarchy.** Senior, well-known players carry more
  weight and pull the squad's mood with them — a furious captain does far more
  damage than a furious fifth-choice full-back
- **Press conferences** before matches, with questions drawn from what is
  actually happening: the next opponent, a bad run, an unsettled player. Every
  answer trades squad morale against board confidence, and talking a game up
  means the board judges that result harder

**Backroom staff**
- Hire a Head Coach, Academy Director, Chief Scout, Head Physio and Fitness
  Coach, each rated 1–5 with a weekly wage
- They genuinely matter: a 5★ head coach more than doubles youth development
  versus a 1★ (+1.25 vs +0.50 overall per prospect per season). The physio
  shortens injuries, the scout finds better prospects abroad

**Club vision**
- The board sets a **multi-year brief** alongside the season's league target:
  win a major trophy, establish us in Europe, build a young side, make us
  self-sustaining, or make the academy produce
- Each is measured against something real — trophies won, seasons in Europe,
  average squad age, the balance, league appearances by graduates — and runs
  over three or four years with a visible deadline
- Deliver it and confidence jumps 25 points and the board opens the
  chequebook. Miss it and no amount of decent league finishes covers for it

**Fixture congestion**
- A crowded calendar now costs you. Games in the last fortnight and the one
  ahead combine into a pressure reading from *Comfortable* to *Brutal*
- Under congestion matches drain up to 50% more fitness and injuries are up
  to twice as likely, so **rotation is worth doing** rather than a nicety
- Tired players are also worth slightly less than their rating suggests
- The Home tab warns you when your XI is running on empty in a heavy run

**Awards, records & objectives**
- Player of the Month, and end-of-season Golden Boot, Playmaker, Golden Glove,
  Player of the Season and Young Player of the Season
- **Team of the Season** — a properly shaped XI, not just the eleven
  highest-rated players
- Club records: biggest win, heaviest defeat, longest unbeaten and winning
  runs, trophy cabinet, squad leaders
- **Season objectives** from the board, each with a confidence and cash
  reward, tracked live
- **Knockouts are drawn as a circle** — the first round on the outer ring,
  each winner pulled inward, the champion at the centre. Used for domestic
  cups, Europe and every international tournament
- **Derbies** carry extra weight — 30 real rivalries from the Manchester
  derby to the Old Firm, *plus any you earn*. Repeated cup knockouts and
  heavy defeats build heat between two clubs, and past a threshold the
  fixture becomes a derby in its own right, announced when it happens.
  Grudges cool if you stop meeting

**Manage a country instead of a club**
- Tick *"Manage a national team only"* at the start and you have no club at
  all: no squad to buy for, no wage bill, no board. The association is your
  employer, judged on qualifying and on how far you go once you are there
- Club tabs disappear entirely. Squad and Tactics show your call-up all year
  round rather than only during a tournament

**The rest of the managerial world**
- All 399 other clubs have a **named manager** with a nationality, a
  tactical identity and a reputation of their own
- They are **sacked for bad seasons and poached for good ones**, so the job
  you want opens because somebody actually lost theirs, and the coach who
  keeps beating you moves up the league
- Scout reports name the man in the opposite dugout and flag any bad blood

**Competition identity**
- Every tournament has its own colour — Premier League purple, FA Cup red,
  League Cup teal, Champions League blue, Europa orange, Conference green,
  and a distinct scheme for all 22 leagues and 11 domestic cups
- Applied everywhere a fixture appears: next-match card, calendar chips,
  fixture lists, match reports and the live match header — so a cup tie is
  never mistaken for a league game
- Derbies are flagged with a 🔥 badge

**Ending a career**
- **Step down** at any time to go job-hunting — your record, trophies and Hall
  of Fame carry over, and every club that would appoint you is listed with its
  budget and reputation
- **Retire** behind two deliberate confirmations (the second requires typing
  RETIRE), then a closing screen of everything you achieved
- **Hall of Fame** in each save: great players are inducted when they retire,
  with their peak rating, career goals, awards and Ballon d'Ors — anyone who
  played for you is highlighted
- **Legacy** across every save: a permanent record of finished careers with
  trophies, win rates and the legends you built, kept outside any single save

**Career** (Career tab)
- **Trophy cabinet** — every honour grouped by competition with the seasons
  you won it, club silverware in gold and international titles in blue
- **Managerial record**: biggest win, heaviest defeat, longest winning and
  unbeaten runs, record signing and record sale
- **Top 10 players coached** — ranked by how good they were *while you
  managed them*, each showing their peak rating, the season it happened and
  that season's appearances, goals, assists and average rating
- Season-by-season history against the board's target

**International management**
- Take a **national team job** alongside your club once your reputation is
  high enough — bigger nations demand more
- **211 national teams** across all six confederations — UEFA, CAF, CONMEBOL,
  AFC, CONCACAF and OFC. Every one can name a legal 26-man squad, so no
  tournament ever kicks off short: the source data only covers 22 leagues, so
  countries whose players play elsewhere are filled out from the wider FC26
  set first and with domestic-league professionals after that
- **World Cup, Euros, AFCON, Copa América, Asian Cup, Gold Cup and the OFC
  Nations Cup**, each on its real cycle and at its real size, with proper
  confederation quotas. The Copa invites CONCACAF guests to fill its
  16-team field, exactly as the real tournament does
- Search any country by name to see its call-up squad, world ranking and
  honours
- **Qualifying runs across the club season.** Every nation is drawn into a
  group and plays a round robin over ten matchdays at six international
  breaks. Group winners go through, then the best runners-up, then third
  places where a confederation still has places to fill. Places are
  apportioned so they sum to the field exactly. Fields are no longer just
  the world rankings — in testing both Germany and Portugal missed a World
  Cup. Your own campaign sits on the Home tab with the live group table,
  and clears away the moment your last qualifier is played — you find out in
  November whether you are going, not the following June
- Tournaments **play out across the summer on your Home tab** — seeded groups
  of four with live tables over three matchdays, then a full knockout bracket
  you can follow round by round. Your nation is highlighted throughout, and
  every one of your matches is reported as it happens
- While a tournament is running, **Squad and Tactics gain a country toggle**.
  Switch over to see your 26-man call-up — every eligible player, wherever he
  plays his club football — and name the XI yourself. The side you pick *is*
  your nation's strength for the next match, so leaving your best striker out
  or shoehorning a winger in at centre-back genuinely costs you
- **Ballon d'Or** after every season, ranked on form, goals, assists and the
  trophies their club won — plus world keeper and young player awards

**FA Chairman**
Run a national association and rebuild its football from the ground up. The
association pays you an **annual grant** — funded by its own standing, not your
club — to spend across four programmes, each with five tiers:

| Programme | What it does |
|---|---|
| **Youth Development** | Raises the ceiling of every prospect born in the country |
| **Coaching Education** | Every club in that country develops players faster |
| **Grassroots Facilities** | Bigger academy intakes nationwide |
| **Elite Pathway** | Graduates from that nation develop faster |

Effects are strictly national: with England's coaching maxed, Liverpool gain
the bonus and Barcelona gain nothing. Fully developed, English prospects go
from an average 71.2 ceiling to **77.4**. A long game that reshapes a
footballing nation — and if you also manage them, you inherit the golden
generation you built.

**Settings** (⚙ tab)
- **Seven themes**: Dark, Midnight, Amethyst, Forest, Crimson, Slate and a full
  Light mode
- **Turn off live matches** if you'd rather every game resolved instantly
- Default match speed, automatic substitutions, auto-pick line-up, autosave
- **Hide player potential** for a tougher, scout-driven game
- **Show money in full** — `£10,228,900` everywhere instead of `£10.2M`
- **Circular or classic brackets** — draw knockouts as a circle or as
  left-to-right columns
- Turn off competition colouring, switch to compact density

**Player development plans**
- Every player at your club shows **how long until his next rating** — "about
  10 weeks to 90 OVR" — plus time to reach his ceiling
- The projection reacts to your decisions. The same 16-year-old reads *5 weeks*
  as a starter and *15 weeks* on the bench
- Shows exactly what's driving it: game time, training focus, coaching level,
  and whether a graduate bonus is active
- Tells you when someone has stalled and what would unstick them

**Player happiness**
- Concrete reasons a player is content or unsettled — game time versus his
  standing in the squad, wages against comparable team-mates, the squad role
  he was promised, results, contract length, ambition and form
- Unhappy players **hand in transfer requests**; you can promise game time,
  improve their terms, or refuse and live with it

**Quality of life**
- **Colour tags** — mark any of your players with one of eight colours to
  organise the squad however you like. It only recolours his name; it has no
  effect on anything in the game. Rename the tags in Settings ("Sell",
  "Prospect", "Untouchable"…) and filter the squad list by them
- **Squad depth chart** — coverage by position, flagging where you're thin
  (amber) or have no natural option at all (red)
- **Player comparison** — any two players side by side, better values
  highlighted
- **Global search** (`/`) across every player and club in the game
- Keyboard shortcuts with an in-game reference (`?`)

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
- **Loanees stay in your squad view**, tagged *Out on loan*, showing where they
  are, how many games they're getting, how their rating is moving and how long
  until they're back. If one stops playing you get a **warning prompting you to
  recall him** — and you can pull him back with one click
- **Loans out**: mark a player **loan listed** and clubs come to *you* with
  enquiries — length, how much of his wages they'll cover, and sometimes an
  option to buy. Accept or reject from your inbox. Only listed players attract
  interest, and the clubs who approach are pitched at his level
- **Free agents can be signed all year round** — no window applies to a player
  who isn't under contract. The calendar shades the window periods and tells
  you when the next one opens
- **Loans in**: approach another club yourself from the bid screen
- Loanees return automatically when the spell ends
- **Block offers** on any player — rival clubs will not even approach him
- **Counter-offer on incoming bids** rather than just accept or reject — ask
  for more, attach a **sell-on clause** or a **buy-back**. Each club has a
  hidden ceiling: push a little and they pay, push further and they meet you
  in the middle with a final bid, push too far and they walk away
- **Counter-offer on loan enquiries** too — demand a bigger share of his
  wages, change the length, or attach an option or obligation to buy
- **Switch the deal type mid-negotiation**: answer a bid to buy with a loan
  proposal, or turn a loan enquiry into a permanent sale. Clubs judge it on
  their own terms — a side stretching to afford a young player may well take
  him on loan, while one chasing a finished article wants him permanently
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
- **Send scouts anywhere in the world with a specific brief** — all 211
  countries are reachable. Pick the country *and* what you're looking for
  (goalkeeper, centre-back, winger, striker…). A narrow brief costs more,
  takes longer and returns fewer players, but they will be the position you
  asked for. Countries have their own stylistic bias (technical, flair,
  athletic, defensive), and where you look genuinely matters: a trip to
  Brazil costs twenty times one to San Marino and turns up a different
  calibre of teenager
- Prospects come through with **one to three positions**, drawn from roles
  that genuinely pair with their primary — so a right-mid may also cover
  right-wing, but a keeper is only ever a keeper
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

## Adding badges and flags

Drop image files into `assets/badges/` named after the club slug:

```
assets/badges/liverpool.png
assets/badges/real-madrid.png
assets/badges/fc-bayern-munchen.png
```

National team flags go in `assets/flags/`, named the same way:

```
assets/flags/england.png
assets/flags/cote-d-ivoire.png
assets/flags/turkiye.png
```

`.png` is recommended; `.svg`, `.jpg` and `.webp` also work.

- **`assets/badges/BADGE-NAMES.md`** lists the exact filename for all 400 clubs,
  grouped by country and league
- **`assets/flags/FLAG-NAMES.md`** lists all 211 nations, grouped by confederation
  and ordered by footballing standing

Accents and punctuation fold to plain ASCII, so *Türkiye* is `turkiye` and
*Côte d'Ivoire* is `cote-d-ivoire`. Flags fill their tile rather than sitting
inside it, so a 4:3 or 3:2 source at roughly 128px wide looks best.

Anything without an image gets a generated monogram automatically, so you can add
as many or as few as you want, whenever you want.

---

## Controls

| | |
|---|---|
| `Space` | Continue / advance |
| `Esc` | Close dialog |
| Click any player | Full profile with all 29 attributes |
| Click a club in the table | Squad overview |
| `/` | Search any player or club |
| `S` | Sim to next match |
| `1`–`9` | Jump to a tab |
| `?` | Shortcut help |
| Click a pitch position | Choose from the whole squad |
| Click a calendar date | Simulate up to it |
| Drag on the pitch | Swap two players |
| Continue | Watch your next match live |
| Sim to match | Fast-forward, results only |

## Saving

**Autosave runs automatically** to IndexedDB, which gets roughly 1.4 GB rather
than localStorage's ~5 MB — so a long career always has a safety net. The
header shows a dot and timestamp for the last write, and it flushes again if
you close the tab. **Continue** on the start screen picks it up.

For manual saves, hit **Save** in the top-right for two options:

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
