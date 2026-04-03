import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { allocateUniqueUserPublicCode } from "../src/lib/user-public-code";

const prisma = new PrismaClient();

async function main() {
  await prisma.partyOfficeLeadershipVote.deleteMany();
  await prisma.partyCouncilLeadershipVote.deleteMany();
  await prisma.partyDraftVote.deleteMany();
  await prisma.partyPolicyDraft.deleteMany();
  await prisma.partyMember.deleteMany();
  await prisma.userCategoryMonthVote.deleteMany();
  await prisma.partyUpvote.deleteMany();
  await prisma.partyPolicy.deleteMany();
  await prisma.party.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.nation.deleteMany();

  const year = new Date().getFullYear();
  const publishedMonth = new Date().toISOString().slice(0, 7);

  const platformBlurb =
    "We stand for pragmatic investment in public goods, fiscal transparency, and steady modernization. " +
    "Our members believe evidence-led policy beats ideology, and that coalitions should outlast headlines. " +
    "This platform is a demo seed for Politics of Today.";

  const nOrion = await prisma.nation.create({
    data: { slug: "orion", name: "Orion", sortOrder: 0 },
  });
  const nCeleste = await prisma.nation.create({
    data: { slug: "celeste", name: "Celeste", sortOrder: 1 },
  });
  const nAndosian = await prisma.nation.create({
    data: { slug: "andosian", name: "Andosian", sortOrder: 2 },
  });
  const nVeydris = await prisma.nation.create({
    data: { slug: "veydris", name: "Veydris", sortOrder: 3 },
  });
  const nKethara = await prisma.nation.create({
    data: { slug: "kethara", name: "Kethara", sortOrder: 4 },
  });

  const categories = await prisma.$transaction([
    prisma.category.create({
      data: { slug: "infrastructure", name: "Infrastructure", sortOrder: 0 },
    }),
    prisma.category.create({
      data: { slug: "climate", name: "Climate", sortOrder: 1 },
    }),
    prisma.category.create({
      data: { slug: "economy", name: "Economy", sortOrder: 2 },
    }),
    prisma.category.create({
      data: { slug: "health", name: "Health", sortOrder: 3 },
    }),
    prisma.category.create({
      data: { slug: "education", name: "Education", sortOrder: 4 },
    }),
    prisma.category.create({
      data: { slug: "defense", name: "Defense", sortOrder: 5 },
    }),
  ]);

  const cat = (slug: string) =>
    categories.find((c) => c.slug === slug)?.id ?? "";

  const systemParty = await prisma.party.create({
    data: {
      slug: "system-baseline",
      name: "Active baseline (system)",
      shortName: "Baseline",
      accentColor: "#71717a",
      isSystem: true,
    },
  });

  const baselineRows: Array<{
    slug: string;
    phrase: string;
    short: string;
    long: string;
  }> = [
    {
      slug: "infrastructure",
      phrase: "Maintain existing maintenance cycles",
      short:
        "Keep current rail and road upkeep funding; no new capital program.",
      long: "Continues the present multi-year maintenance schedule. No expansion of high-speed corridors or freight bypasses. Predictable cost profile.",
    },
    {
      slug: "climate",
      phrase: "Current climate envelope",
      short:
        "Existing grants and carbon price trajectory stay in place.",
      long: "No acceleration of retrofit programs or grid storage incentives beyond current law.",
    },
    {
      slug: "economy",
      phrase: "Steady macro framework",
      short:
        "Keep current automatic stabilizers and SME credit window.",
      long: "No new industrial strategy funds; monetary/fiscal coordination unchanged.",
    },
    {
      slug: "health",
      phrase: "Baseline care guarantee",
      short:
        "Current funding path for hospitals and primary care networks.",
      long: "No expansion of coverage categories; waiting-list targets unchanged.",
    },
    {
      slug: "education",
      phrase: "Existing schools formula",
      short: "Per-pupil funding grows with inflation only.",
      long: "No new vocational campuses; digital equity pilots continue at pilot scale.",
    },
    {
      slug: "defense",
      phrase: "Current readiness profile",
      short:
        "Maintain procurement tempo and personnel targets as today.",
      long: "No shift in posture; cyber and logistics get inflation-only adjustments.",
    },
  ];

  for (const row of baselineRows) {
    await prisma.partyPolicy.create({
      data: {
        partyId: systemParty.id,
        categoryId: cat(row.slug),
        catchPhrase: row.phrase,
        shortDescription: row.short,
        longDescription: row.long,
        budgetDeltaVsActive: 0,
        monthsToComplete: 0,
        taxNarrative: "Neutral vs current tax mix.",
        isContinuationOfStatusQuo: true,
      },
    });
  }

  const hash = (p: string) => bcrypt.hashSync(p, 10);

  const alice = await prisma.user.create({
    data: {
      email: "alice@play.test",
      passwordHash: hash("play"),
      publicCode: await allocateUniqueUserPublicCode(),
      displayName: "Alice Voter",
      role: "VOTER",
      nationId: nOrion.id,
      nationCommitYear: year,
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@play.test",
      passwordHash: hash("play"),
      publicCode: await allocateUniqueUserPublicCode(),
      displayName: "Bob Voter",
      role: "VOTER",
      nationId: nCeleste.id,
      nationCommitYear: year,
    },
  });

  const nationPool = [nOrion, nCeleste, nAndosian, nVeydris, nKethara];
  const synthPassword = "seedseed";
  const accentPalette = [
    "#0d9488",
    "#16a34a",
    "#4f46e5",
    "#ca8a04",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#ea580c",
    "#db2777",
    "#059669",
    "#4d7c0f",
    "#0369a1",
    "#a855f7",
    "#0f766e",
    "#b45309",
    "#be123c",
    "#1d4ed8",
    "#65a30d",
    "#c026d3",
    "#0e7490",
    "#b91c1c",
    "#6d28d9",
    "#15803d",
    "#c2410c",
    "#9333ea",
  ];

  const firstWords = [
    "River",
    "Civic",
    "North",
    "Steel",
    "Solar",
    "Harbor",
    "Atlas",
    "Copper",
    "Granite",
    "Meridian",
    "Liberty",
    "Crest",
    "Silver",
    "Unity",
    "Horizon",
    "Amber",
    "Cobalt",
    "Verdant",
    "Iron",
    "Azure",
    "Crimson",
    "Jade",
    "Sable",
    "Ivory",
    "Nimbus",
  ];
  const secondWords = [
    "Alliance",
    "Front",
    "Union",
    "Coalition",
    "Bloc",
    "Circle",
    "Movement",
    "Caucus",
    "League",
    "Board",
    "Assembly",
    "Forum",
    "Guild",
    "Collective",
    "Accord",
    "Pact",
    "Summit",
    "Bridge",
    "Anchor",
    "Signal",
    "Vector",
    "Pulse",
    "Beacon",
    "Column",
    "Vanguard",
  ];

  type CatSlug =
    | "infrastructure"
    | "climate"
    | "economy"
    | "health"
    | "education"
    | "defense";

  const policySnippets: Record<
    CatSlug,
    {
      catchPhrase: string;
      shortDescription: string;
      longDescription: string;
      taxNarrative: string;
    }
  > = {
    infrastructure: {
      catchPhrase: "Repair-first capital plan",
      shortDescription:
        "Backlog reduction on bridges, transit state-of-good-repair, and rural links.",
      longDescription:
        "PMO-led sequencing with published milestones; megaprojects require audited business cases before appropriation.",
      taxNarrative: "Municipal bond window; modest user-fee indexation where tied to wear.",
    },
    climate: {
      catchPhrase: "Electrify and store",
      shortDescription:
        "Retrofit incentives, grid-scale storage procurement, and industrial heat recovery.",
      longDescription:
        "Front-loaded household electrification paired with utility storage pools to shave peaks; procurement reform caps unit creep.",
      taxNarrative: "Carbon-intensity fees on imports; top-bracket green levy component.",
    },
    economy: {
      catchPhrase: "Productive clusters",
      shortDescription:
        "Co-finance R&D and SME scale-ups in three priority sectors with exit rules.",
      longDescription:
        "Minority public equity with audited job targets; revolving fund recycles exits into the next cohort.",
      taxNarrative: "Buyback surcharge and closing offshore loopholes modeled as partial offset.",
    },
    health: {
      catchPhrase: "Primary care surge",
      shortDescription:
        "Residency expansion, community diagnostic hubs, and panel-size accountability.",
      longDescription:
        "Train-and-retain package ties progression to access metrics; hubs reduce emergency overflow.",
      taxNarrative: "Progressive payroll component on highest earners for care expansion.",
    },
    education: {
      catchPhrase: "Dual-track skills",
      shortDescription:
        "Scale apprenticeships in energy, IT, and advanced manufacturing pathways.",
      longDescription:
        "Employer co-pay floors and standardized assessments to prevent credential inflation.",
      taxNarrative: "Training-services VAT carve-out under review with sunset clause.",
    },
    defense: {
      catchPhrase: "Cyber and sealift spine",
      shortDescription:
        "Layered critical-infrastructure protection and logistics readiness without blanket growth.",
      longDescription:
        "Staged investments with independent red-team testing; personnel held flat in favor of enablers.",
      taxNarrative: "Deficit-neutral bond tranche if paired with elsewhere offsets.",
    },
  };

  const categoryOrder: CatSlug[] = [
    "infrastructure",
    "climate",
    "economy",
    "health",
    "education",
    "defense",
  ];

  const founderPartyIds: string[] = [];
  const founderAccounts: Array<{ userId: string; nationId: string }> = [];
  const memberAccounts: Array<{ userId: string; nationId: string }> = [];

  for (let i = 0; i < 25; i++) {
    const nation = nationPool[i % nationPool.length];
    const email = `seed-founder-${i}@fake.seed`;
    const fw = firstWords[i % firstWords.length];
    const sw = secondWords[(i + 7) % secondWords.length];
    const partyName = `${fw} ${sw}`;
    const shortName =
      partyName.length <= 20 ? partyName : `${fw.slice(0, 8)} ${sw.slice(0, 8)}`;

    const u = await prisma.user.create({
      data: {
        email,
        passwordHash: hash(synthPassword),
        publicCode: await allocateUniqueUserPublicCode(),
        displayName: `Founder ${i + 1} (${partyName})`,
        role: "VOTER",
        nationId: nation.id,
        nationCommitYear: year,
      },
    });

    const p = await prisma.party.create({
      data: {
        slug: `seed-party-${i}`,
        name: partyName,
        shortName,
        accentColor: accentPalette[i % accentPalette.length],
        isSystem: false,
        allowMemberJoin: true,
        ownerUserId: u.id,
        description: platformBlurb,
      },
    });

    await prisma.partyMember.create({
      data: { userId: u.id, partyId: p.id, rank: "PM" },
    });
    await prisma.user.update({
      where: { id: u.id },
      data: { role: "PARTY_REP" },
    });

    const catOffsets = [0, 2, 4].map((k) => (i + k) % categoryOrder.length);
    for (const off of catOffsets) {
      const slug = categoryOrder[off];
      const base = policySnippets[slug];
      await prisma.partyPolicy.create({
        data: {
          partyId: p.id,
          categoryId: cat(slug),
          catchPhrase: base.catchPhrase,
          shortDescription: base.shortDescription,
          longDescription: base.longDescription,
          budgetDeltaVsActive: 12 + ((i * 3 + off * 5) % 45),
          monthsToComplete: 24 + ((i + off * 11) % 48),
          taxNarrative: base.taxNarrative,
          isContinuationOfStatusQuo: false,
          publishedMonth,
        },
      });
    }

    founderPartyIds.push(p.id);
    founderAccounts.push({ userId: u.id, nationId: nation.id });
  }

  for (let j = 0; j < 25; j++) {
    const nation = nationPool[(j + 1) % nationPool.length];
    const partyIndex = (j * 7 + 11) % founderPartyIds.length;
    const partyId = founderPartyIds[partyIndex];
    const mem = await prisma.user.create({
      data: {
        email: `seed-member-${j}@fake.seed`,
        passwordHash: hash(synthPassword),
        publicCode: await allocateUniqueUserPublicCode(),
        displayName: `Member ${j + 1}`,
        role: "VOTER",
        nationId: nation.id,
        nationCommitYear: year,
        PartyMember: {
          create: {
            partyId,
            rank: "MEMBER",
          },
        },
      },
    });
    memberAccounts.push({ userId: mem.id, nationId: nation.id });
  }

  const upvoteRows: Array<{
    userId: string;
    partyId: string;
    nationId: string;
  }> = [];
  for (let u = 0; u < 25; u++) {
    const { userId, nationId } = founderAccounts[u];
    const p1 = (u * 3) % founderPartyIds.length;
    const p2 = (u * 5 + 1) % founderPartyIds.length;
    upvoteRows.push({
      userId,
      partyId: founderPartyIds[p1],
      nationId,
    });
    if (p2 !== p1) {
      upvoteRows.push({
        userId,
        partyId: founderPartyIds[p2],
        nationId,
      });
    }
  }
  for (let m = 0; m < 25; m++) {
    const { userId, nationId } = memberAccounts[m];
    const p = (m * 13 + 4) % founderPartyIds.length;
    upvoteRows.push({
      userId,
      partyId: founderPartyIds[p],
      nationId,
    });
  }
  upvoteRows.push(
    { userId: alice.id, partyId: founderPartyIds[0], nationId: nOrion.id },
    { userId: alice.id, partyId: founderPartyIds[3], nationId: nOrion.id },
    { userId: bob.id, partyId: founderPartyIds[2], nationId: nCeleste.id },
    { userId: bob.id, partyId: founderPartyIds[7], nationId: nCeleste.id },
  );

  const upvoteKey = new Set<string>();
  const upvoteDeduped = upvoteRows.filter((row) => {
    const k = `${row.userId}\t${row.partyId}`;
    if (upvoteKey.has(k)) return false;
    upvoteKey.add(k);
    return true;
  });

  await prisma.partyUpvote.createMany({ data: upvoteDeduped });

  console.log(
    "Seed complete: 5 nations, baseline party, 25 synthetic founder parties (3 policies each), 25 synthetic members, alice/bob.",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
