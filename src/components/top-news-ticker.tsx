import { prisma } from "@/lib/prisma";
import { TopNewsTickerClient, type TopTickerItem } from "./top-news-ticker-client";

type TopNewsTickerProps = {
  nationId: string | null;
};

function summarizeForBanner(body: string | null | undefined, fallback: string) {
  const raw = (body ?? "").replace(/\s+/g, " ").trim();
  if (!raw) {
    return fallback;
  }

  if (raw.length <= 110) {
    return raw;
  }

  return `${raw.slice(0, 107).trimEnd()}...`;
}

function getChangelogBadge(input: { title: string; tagsCsv: string }) {
  const text = `${input.tagsCsv} ${input.title}`.toLowerCase();

  if (/\bhotfix\b|\bpatch\b|\bcritical\b|\burgent\b/.test(text)) {
    return { label: "Hotfix", className: "bg-rose-500/20 text-rose-700 dark:text-rose-300" };
  }
  if (/\bmajor\b|\bbreaking\b|\brelease\b/.test(text)) {
    return {
      label: "Major Update",
      className: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
    };
  }
  if (/\bbalance\b|\btuning\b|\bnerf\b|\bbuff\b/.test(text)) {
    return { label: "Balance", className: "bg-sky-500/20 text-sky-700 dark:text-sky-300" };
  }
  return null;
}

export async function TopNewsTicker({ nationId }: TopNewsTickerProps) {
  const [latestWorld, latestNation, latestChangelog] = await Promise.all([
    prisma.newsItem.findFirst({
      where: { scope: "WORLD" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, body: true },
    }),
    nationId
      ? prisma.newsItem.findFirst({
          where: { scope: "NATION", nationId },
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, body: true },
        })
      : Promise.resolve(null),
    prisma.newsItem.findFirst({
      where: { scope: "CHANGELOG" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, body: true, tagsCsv: true },
    }),
  ]);

  const changelogBadge = latestChangelog
    ? getChangelogBadge({ title: latestChangelog.title, tagsCsv: latestChangelog.tagsCsv })
    : null;

  const tickerItems: TopTickerItem[] = [
    {
      id: latestWorld ? `world-${latestWorld.id}` : "world-initial-setup",
      href: "/news/world",
      label: "World News",
      tone: "world",
      title: latestWorld
        ? latestWorld.title
        : "Initial setup: the world briefing desk is now online.",
      summary: latestWorld
        ? summarizeForBanner(latestWorld.body, "Global updates as they happen.")
        : "Global updates as they happen.",
    },
    {
      id: latestNation ? `nation-${latestNation.id}` : "nation-initial-setup",
      href: "/news/nation",
      label: "Nation News",
      tone: "nation",
      title: latestNation
        ? latestNation.title
        : "Initial setup: nation briefings will appear once your nation files its first report.",
      summary: latestNation
        ? summarizeForBanner(latestNation.body, "Nation-level reporting and public updates.")
        : "Nation-level reporting and public updates.",
    },
    {
      id: latestChangelog
        ? `changelog-${latestChangelog.id}`
        : "changelog-initial-setup",
      href: "/news/changelog",
      label: "Changelog",
      tone: "changelog",
      badge: changelogBadge,
      title: latestChangelog
        ? latestChangelog.title
        : "Initial setup: game update notes will be published here.",
      summary: latestChangelog
        ? summarizeForBanner(latestChangelog.body, "Patches, balance passes, and release notes.")
        : "Patches, balance passes, and release notes.",
    },
  ];

  return <TopNewsTickerClient items={tickerItems} />;
}
