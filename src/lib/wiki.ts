export type WikiArticle = {
  slug: string;
  title: string;
  excerpt: string;
  sections: { heading: string; body: string }[];
};

export const wikiArticles: WikiArticle[] = [
  {
    slug: "overview",
    title: "System overview",
    excerpt: "What Politics of Today models—and what it does not.",
    sections: [
      {
        heading: "Purpose",
        body: "Politics of Today is a civic simulation: you compare party policy cards across categories, vote monthly, and watch how aggregated choices stress a simplified national budget. It is pedagogy and game, not an official ballot.",
      },
      {
        heading: "Turn structure",
        body: "Each calendar month is a voting round. You may visit every category and read proposals against the active baseline. Casting a preference requires a logged-in voter account.",
      },
      {
        heading: "Fiscal model (toy)",
        body: "Budget numbers are abstract billions. Each nation scales the shared reference tax and trade floors with its own multipliers; registered voters then add a tenure-shaped contribution on top. Going over the annual envelope surfaces borrowing and implied tax pressure in the UI. Real governments are more complex; this keeps trade-offs legible.",
      },
      {
        heading: "National baseline in data",
        body: "The status-quo policy line—the reference for budget deltas on cards—lives in the database as system-party rows marked continuation-of-status-quo. Code reads those ids when building the scaled national ledger; there are no hard-coded placeholder policy ids.",
      },
    ],
  },
  {
    slug: "voting-and-roles",
    title: "Voters, guests, and parties",
    excerpt: "Who can do what in the prototype.",
    sections: [
      {
        heading: "Guests",
        body: "Guests see the radar, wiki, tutorial, and full policy cards. They can click through categories, but voting actions are locked until login.",
      },
      {
        heading: "Registered voters",
        body: "Signing in lets the server remember which categories you completed for the current month. Those completions feed upcoming simulation hooks (government composition, narrative events) as we build them.",
      },
      {
        heading: "Party members & drafts",
        body: "Founders can open member join on their party profile. Members use Party desk to propose policy drafts per category; ordinary members vote once per category per UTC month. Winning drafts can advance to the live national ballot either through the scheduled monthly rollover job (tallies internal votes) or through founder emergency publish, which bypasses the wait. One party membership per voter account; founders cannot also join another party as a member without leaving their role. See the party simulation article for details.",
      },
    ],
  },
  {
    slug: "party-simulation",
    title: "Party platform & monthly rollover",
    excerpt:
      "How internal draft votes, cron promotion, and founder publish interact with the public ballot.",
    sections: [
      {
        heading: "Draft voting window",
        body: "Drafts are stamped with the UTC month when created (`draftVotingMonth`). Member votes are stored per party, category, and `votingMonth`. You cannot vote on a draft from a different month than the current one—prevents stale cards from collecting votes after the window closes.",
      },
      {
        heading: "Scheduled promotion (cron)",
        body: "The `party-rollover` API route runs `promoteWinningDraftsForMonth` with the new month key. For each non-system party and category, among drafts whose `draftVotingMonth` equals the month before publish, the draft with the highest internal vote count wins (ties break on earlier `createdAt`). That content upserts into `PartyPolicy` with `publishedMonth` set; competing drafts in that voting window are deleted (votes cascade).",
      },
      {
        heading: "Founder emergency publish",
        body: "`publishDraft` lets the party owner push one draft live immediately: it upserts `PartyPolicy`, clears votes for that party/category, and deletes all drafts in that category. This is independent of the cron and does not require winning the internal tally first.",
      },
      {
        heading: "Public ballot filter",
        body: "Voters see a party line when the party is eligible for the nation ballot and the policy’s `publishedMonth` is either the current ballot month or null (evergreen). The system party’s status-quo rows are always available as the fiscal baseline.",
      },
      {
        heading: "Known simplifications",
        body: "Leadership elections use a separate quarterly period key and do not gate draft authorship. There is no automatic demotion when a month rolls without any drafts—parties simply keep their previous published card until something new promotes.",
      },
    ],
  },
  {
    slug: "categories-radar",
    title: "Radar map",
    excerpt: "How to read the category web on the home page.",
    sections: [
      {
        heading: "Axes",
        body: "Each spoke is a policy family—Infrastructure, Climate, Economy, Health, Education, Defense. The filled polygon is a stylistic snapshot, not a forecast. The important interaction is the label ring: open a category to see proposals.",
      },
      {
        heading: "Completion rings",
        body: "An open ring means you have not finalized that category for this month on this account. A check means you have submitted a vote that round.",
      },
    ],
  },
];

export function getWikiArticle(slug: string): WikiArticle | undefined {
  return wikiArticles.find((a) => a.slug === slug);
}
