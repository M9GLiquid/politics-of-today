import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { voterNeedsNationPick } from "@/lib/nations";
import { prisma } from "@/lib/prisma";

export default async function RegisterPartyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/parties/register");
  }
  if (session.partyId) {
    redirect("/party");
  }
  const alreadyMember = await prisma.partyMember.findUnique({
    where: { userId: session.sub },
  });
  if (alreadyMember) {
    redirect("/party");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { nationId: true },
  });
  if (voterNeedsNationPick(session.role, user?.nationId)) {
    redirect("/account/nation?next=/parties/register");
  }
  return children;
}
