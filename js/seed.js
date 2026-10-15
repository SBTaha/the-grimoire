import { todayKey, addDays, parseDateKey } from "./core/dates.js";

function at(dateKey, hour = 12) {
  const date = parseDateKey(dateKey);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export function buildSeedData(today = todayKey()) {
  const day = (offset) => addDays(today, offset);

  const categories = [
    {
      id: "seed_cat_forge",
      name: "The Forge",
      color: "#c65b3c",
      glyph: "🜂",
      seed: true,
    },
    {
      id: "seed_cat_library",
      name: "Arcane Study",
      color: "#9b7bd4",
      glyph: "🜍",
      seed: true,
    },
    {
      id: "seed_cat_hearth",
      name: "Hearth & Hall",
      color: "#4fa8a0",
      glyph: "🜔",
      seed: true,
    },
    {
      id: "seed_cat_body",
      name: "Body & Blade",
      color: "#d9a441",
      glyph: "🜚",
      seed: true,
    },
    {
      id: "seed_cat_coin",
      name: "Coin & Ledger",
      color: "#5b82c4",
      glyph: "🜛",
      seed: true,
    },
  ];

  const chains = [
    {
      id: "seed_chn_relic",
      name: "The Unfinished Relic",
      description:
        "Carry one long project from raw sketch to something that actually ships. Each step unseals the next.",
      seed: true,
    },
    {
      id: "seed_chn_winter",
      name: "Preparations for Winter",
      description:
        "The unglamorous maintenance that makes the cold months survivable.",
      seed: true,
    },
  ];

  const quests = [
    {
      id: "seed_qst_relic_1",
      title: "Draw up the plans",
      description:
        "Sketch the whole thing on paper before a single line of it is built. Scope it to something finishable.",
      categoryId: "seed_cat_forge",
      priority: "major",
      status: "completed",
      dueDate: day(-9),
      completedAt: at(day(-9), 17),
      chainId: "seed_chn_relic",
      chainOrder: 0,
      tags: ["project", "deep-work"],
      objectives: [
        { id: "seed_obj_r1a", title: 'Define what "done" means', done: true },
        {
          id: "seed_obj_r1b",
          title: "List everything it will NOT do",
          done: true,
        },
      ],
      createdAt: at(day(-16)),
      seed: true,
    },
    {
      id: "seed_qst_relic_2",
      title: "Forge the first working piece",
      description:
        "An ugly version that runs beats a beautiful one that does not exist.",
      categoryId: "seed_cat_forge",
      priority: "legendary",
      status: "active",
      dueDate: day(2),
      chainId: "seed_chn_relic",
      chainOrder: 1,
      tags: ["project", "deep-work"],
      objectives: [
        {
          id: "seed_obj_r2a",
          title: "Core loop working end to end",
          done: true,
        },
        {
          id: "seed_obj_r2b",
          title: "Handle the three obvious failure cases",
          done: true,
        },
        {
          id: "seed_obj_r2c",
          title: "Strip out everything that is not essential",
          done: false,
        },
      ],
      createdAt: at(day(-9)),
      seed: true,
    },
    {
      id: "seed_qst_relic_3",
      title: "Put it in front of someone",
      description:
        "Sealed until the working piece is finished. Watch one person use it without explaining anything first.",
      categoryId: "seed_cat_forge",
      priority: "major",
      status: "active",
      dueDate: day(9),
      chainId: "seed_chn_relic",
      chainOrder: 2,
      tags: ["project"],
      objectives: [
        { id: "seed_obj_r3a", title: "Find two willing testers", done: false },
        {
          id: "seed_obj_r3b",
          title: "Write down what confused them",
          done: false,
        },
      ],
      createdAt: at(day(-9)),
      seed: true,
    },
    {
      id: "seed_qst_winter_1",
      title: "Service the boiler",
      description: "",
      categoryId: "seed_cat_hearth",
      priority: "standard",
      status: "active",
      dueDate: day(-2),
      chainId: "seed_chn_winter",
      chainOrder: 0,
      tags: ["home", "maintenance"],
      objectives: [],
      createdAt: at(day(-12)),
      seed: true,
    },
    {
      id: "seed_qst_winter_2",
      title: "Lay in firewood",
      description:
        "Sealed behind the boiler service — no point stacking wood for a heating system that fails in November.",
      categoryId: "seed_cat_hearth",
      priority: "minor",
      status: "active",
      dueDate: day(14),
      chainId: "seed_chn_winter",
      chainOrder: 1,
      tags: ["home"],
      objectives: [],
      createdAt: at(day(-12)),
      seed: true,
    },
    {
      id: "seed_qst_ledger",
      title: "Reconcile the month's ledger",
      description: "Match every outgoing against the record. Repeats monthly.",
      categoryId: "seed_cat_coin",
      priority: "standard",
      status: "active",
      dueDate: day(-1),
      tags: ["finance", "recurring"],
      recurrence: { freq: "monthly", interval: 1, weekdays: [] },
      objectives: [
        { id: "seed_obj_l1", title: "Pull statements", done: true },
        { id: "seed_obj_l2", title: "Flag anything unrecognised", done: false },
      ],
      createdAt: at(day(-40)),
      seed: true,
    },
    {
      id: "seed_qst_drill",
      title: "Morning drill",
      description: "Thirty minutes before the day gets its hands on you.",
      categoryId: "seed_cat_body",
      priority: "minor",
      status: "active",
      dueDate: today,
      tags: ["health", "recurring"],
      recurrence: { freq: "weekly", interval: 1, weekdays: [1, 2, 3, 4, 5] },
      objectives: [],
      createdAt: at(day(-30)),
      seed: true,
    },
    {
      id: "seed_qst_grimoire",
      title: "Read two chapters of the grimoire",
      description:
        "Currently working through a book on distributed systems. Notes go in the Codex.",
      categoryId: "seed_cat_library",
      priority: "minor",
      status: "active",
      dueDate: day(3),
      tags: ["reading", "recurring"],
      recurrence: { freq: "weekly", interval: 1, weekdays: [0, 3] },
      objectives: [],
      createdAt: at(day(-21)),
      seed: true,
    },
    {
      id: "seed_qst_letters",
      title: "Answer the backlog of letters",
      description:
        "Eleven unanswered messages. Batch them into one sitting rather than bleeding attention all week.",
      categoryId: "seed_cat_hearth",
      priority: "standard",
      status: "active",
      dueDate: today,
      tags: ["admin"],
      objectives: [
        {
          id: "seed_obj_le1",
          title: "Triage into reply / archive / ignore",
          done: true,
        },
        { id: "seed_obj_le2", title: "Clear the reply pile", done: false },
      ],
      createdAt: at(day(-5)),
      seed: true,
    },
    {
      id: "seed_qst_cartography",
      title: "Finish the cartography course",
      description:
        "Four modules left. One per week keeps it moving without taking over.",
      categoryId: "seed_cat_library",
      priority: "major",
      status: "active",
      dueDate: day(21),
      tags: ["learning"],
      objectives: [
        { id: "seed_obj_c1", title: "Module 5 — projections", done: true },
        { id: "seed_obj_c2", title: "Module 6 — terrain", done: true },
        { id: "seed_obj_c3", title: "Module 7 — labelling", done: false },
        { id: "seed_obj_c4", title: "Module 8 — final map", done: false },
      ],
      createdAt: at(day(-28)),
      seed: true,
    },
    {
      id: "seed_qst_blade",
      title: "Sharpen and oil the tools",
      description: "",
      categoryId: "seed_cat_forge",
      priority: "minor",
      status: "active",
      dueDate: day(6),
      tags: ["maintenance"],
      objectives: [],
      createdAt: at(day(-3)),
      seed: true,
    },
    {
      id: "seed_qst_physician",
      title: "Visit the physician",
      description: "Overdue by a year. Book it, then stop thinking about it.",
      categoryId: "seed_cat_body",
      priority: "major",
      status: "active",
      dueDate: day(-6),
      tags: ["health", "admin"],
      objectives: [],
      createdAt: at(day(-20)),
      seed: true,
    },
    {
      id: "seed_qst_pantry",
      title: "Restock the pantry",
      description: "",
      categoryId: "seed_cat_hearth",
      priority: "minor",
      status: "completed",
      dueDate: day(-4),
      completedAt: at(day(-4), 18),
      tags: ["home"],
      objectives: [],
      createdAt: at(day(-7)),
      seed: true,
    },
    {
      id: "seed_qst_map",
      title: "Frame the old map",
      description: "Been in a tube since the move.",
      categoryId: "seed_cat_hearth",
      priority: "minor",
      status: "archived",
      dueDate: null,
      tags: ["home"],
      objectives: [],
      createdAt: at(day(-60)),
      seed: true,
    },
  ];

  const notes = [
    {
      id: "seed_not_consensus",
      title: "Consensus, in one page",
      body: `Three ideas that keep recurring in the reading:

**Quorums.** A write is safe once a majority has acknowledged it. Any later read that also consults a majority must overlap with that set by at least one node, so it cannot miss the write. The overlap is the whole trick.

**Leases over locks.** A lock held by a crashed process is held forever. A lease expires on its own, which turns an availability disaster into a delay.

**Failure detection is a guess.** You cannot distinguish a slow node from a dead one. Every protocol has to pick which mistake it would rather make.`,
      categoryId: "seed_cat_library",
      tags: ["distributed-systems", "reading"],
      pinned: true,
      createdAt: at(day(-18)),
      updatedAt: at(day(-4)),
      seed: true,
    },
    {
      id: "seed_not_forge",
      title: "Workshop settings that actually work",
      body: `Written down because I rediscover these every single time.

- Hardwood: high speed, light pressure, let the tool cut.
- Softwood: slower, or it tears along the grain.
- Always cut a test piece from the offcut first. Always. The one time I skipped it cost a whole board.
- Oil goes on thin and often, not thick and rarely.`,
      categoryId: "seed_cat_forge",
      tags: ["workshop", "reference"],
      pinned: true,
      createdAt: at(day(-30)),
      updatedAt: at(day(-11)),
      seed: true,
    },
    {
      id: "seed_not_scope",
      title: "How projects actually die",
      body: `Reviewing the last four things I abandoned, none of them failed on difficulty. They failed because the finish line moved every time I got close to it.

The fix I keep relearning: write down what "done" means on day one, in a sentence, and treat changes to that sentence as a serious decision rather than a thought.`,
      categoryId: "seed_cat_forge",
      tags: ["project", "retrospective"],
      pinned: false,
      createdAt: at(day(-13)),
      updatedAt: at(day(-13)),
      seed: true,
    },
    {
      id: "seed_not_winter",
      title: "Winter preparations checklist",
      body: `Carried over from last year, with corrections.

1. Boiler serviced BEFORE the first cold snap, not during. Everyone calls in November.
2. Bleed the radiators after the service, not before.
3. Firewood needs six months' seasoning. Buying in October is buying next year's wood.
4. Check the gutters before the leaves finish falling.`,
      categoryId: "seed_cat_hearth",
      tags: ["home", "seasonal", "reference"],
      pinned: false,
      createdAt: at(day(-25)),
      updatedAt: at(day(-25)),
      seed: true,
    },
    {
      id: "seed_not_training",
      title: "What the last training cycle taught me",
      body: `Consistency beat intensity by a wide margin. The weeks I trained four easy days outperformed the weeks I trained two hard ones, measured by how I felt at the end of the month rather than by any single session.

Also: the thirty-minute session I will actually do is worth more than the ninety-minute one I keep rescheduling.`,
      categoryId: "seed_cat_body",
      tags: ["health", "retrospective"],
      pinned: false,
      createdAt: at(day(-8)),
      updatedAt: at(day(-8)),
      seed: true,
    },
  ];

  const entries = [
    {
      id: "seed_ent_1",
      date: day(-1),
      title: "A slow day, and that was fine",
      body: `Cleared the smaller things and left the relic alone. There is a version of this where I feel guilty about that, but the honest read is that I had nothing good left in the tank and forcing it would have produced work I'd undo tomorrow.

The boiler is now properly overdue. That one is pure avoidance — it is a phone call, not a labour of Hercules.`,
      tags: ["reflection"],
      linkedQuestIds: ["seed_qst_winter_1"],
      createdAt: at(day(-1), 21),
      seed: true,
    },
    {
      id: "seed_ent_2",
      date: day(-4),
      title: "The core loop finally runs",
      body: `End to end, start to finish, no manual intervention. It is held together with string in three places and I know exactly which three, but it runs.

Noting the feeling here because I forget it every time: the stretch just before something works is indistinguishable from the stretch where a project is failing. Same frustration, same doubt. The only difference is what happens next, and you cannot know that from inside it.`,
      tags: ["project", "milestone"],
      linkedQuestIds: ["seed_qst_relic_2"],
      createdAt: at(day(-4), 22),
      seed: true,
    },
    {
      id: "seed_ent_3",
      date: day(-11),
      title: "Scoped the relic down, twice",
      body: `Cut two features I was attached to. Both were things I wanted to have built rather than things the thing needs.

Second pass cut a third. That one hurt more and was probably the most useful decision of the week.`,
      tags: ["project", "reflection"],
      linkedQuestIds: ["seed_qst_relic_1"],
      createdAt: at(day(-11), 20),
      seed: true,
    },
  ];

  const PAST_TITLES = {
    seed_cat_body: [
      "Morning drill",
      "Long walk",
      "Strength session",
      "Stretch and mobility",
      "Rest-day walk",
    ],
    seed_cat_hearth: [
      "Answer the backlog of letters",
      "Restock the pantry",
      "Deep clean the kitchen",
      "Mend the back gate",
      "Sort the loft",
    ],
    seed_cat_forge: [
      "Draw up the plans",
      "Prototype the joint",
      "Rebuild the jig",
      "Sharpen and oil the tools",
      "Cut the test piece",
    ],
    seed_cat_library: [
      "Read two chapters of the grimoire",
      "Module 5 — projections",
      "Write up reading notes",
      "Module 6 — terrain",
      "Review the week's notes",
    ],
    seed_cat_coin: [
      "Reconcile the month's ledger",
      "Review the standing orders",
      "File the quarterly return",
      "Cancel the unused subscriptions",
    ],
  };

  const history = [
    [-32, "seed_cat_forge", "standard", 25],
    [-33, "seed_cat_body", "minor", 10],
    [-35, "seed_cat_library", "standard", 25],
    [-36, "seed_cat_hearth", "minor", 10],
    [-38, "seed_cat_body", "minor", 10],
    [-39, "seed_cat_forge", "major", 60],
    [-41, "seed_cat_coin", "standard", 25],
    [-43, "seed_cat_body", "minor", 10],
    [-44, "seed_cat_library", "minor", 10],
    [-46, "seed_cat_hearth", "standard", 25],
    [-47, "seed_cat_body", "minor", 10],
    [-50, "seed_cat_forge", "standard", 25],
    [-52, "seed_cat_library", "standard", 25],
    [-54, "seed_cat_body", "minor", 10],
    [-1, "seed_cat_body", "minor", 10],
    [-1, "seed_cat_hearth", "minor", 10],
    [-2, "seed_cat_body", "minor", 10],
    [-2, "seed_cat_library", "minor", 10],
    [-3, "seed_cat_body", "minor", 10],
    [-3, "seed_cat_forge", "standard", 25],
    [-4, "seed_cat_forge", "major", 60],
    [-4, "seed_cat_hearth", "minor", 10],
    [-5, "seed_cat_body", "minor", 10],
    [-6, "seed_cat_library", "standard", 25],
    [-8, "seed_cat_body", "minor", 10],
    [-8, "seed_cat_coin", "standard", 25],
    [-9, "seed_cat_forge", "major", 60],
    [-9, "seed_cat_body", "minor", 10],
    [-10, "seed_cat_hearth", "minor", 10],
    [-11, "seed_cat_library", "standard", 25],
    [-12, "seed_cat_body", "minor", 10],
    [-15, "seed_cat_forge", "standard", 25],
    [-16, "seed_cat_body", "minor", 10],
    [-16, "seed_cat_hearth", "standard", 25],
    [-18, "seed_cat_library", "major", 60],
    [-19, "seed_cat_body", "minor", 10],
    [-22, "seed_cat_coin", "standard", 25],
    [-23, "seed_cat_forge", "standard", 25],
    [-25, "seed_cat_body", "minor", 10],
    [-26, "seed_cat_library", "minor", 10],
    [-29, "seed_cat_hearth", "standard", 25],
  ];

  const log = history.map(([offset, categoryId, priority, xp], index) => ({
    id: `seed_log_${index}`,
    questId: `seed_hist_${index}`,
    title: PAST_TITLES[categoryId][index % PAST_TITLES[categoryId].length],
    categoryId,
    priority,
    xp,
    recurring: false,
    at: at(day(offset), 9 + (index % 9)),
    seed: true,
  }));

  log.push(
    {
      id: "seed_log_relic1",
      questId: "seed_qst_relic_1",
      title: "Draw up the plans",
      categoryId: "seed_cat_forge",
      priority: "major",
      xp: 60,
      recurring: false,
      at: at(day(-9), 17),
      seed: true,
    },
    {
      id: "seed_log_pantry",
      questId: "seed_qst_pantry",
      title: "Restock the pantry",
      categoryId: "seed_cat_hearth",
      priority: "minor",
      xp: 10,
      recurring: false,
      at: at(day(-4), 18),
      seed: true,
    },
  );

  return { version: 2, categories, chains, quests, notes, entries, log };
}
