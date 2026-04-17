import { redirect } from "next/navigation";

import { AssistantView } from "@/components/agent/assistant-view";
import { auth } from "@/lib/auth";

export default async function AgentPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <AssistantView />;
}
