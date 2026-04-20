import { redirect } from "next/navigation";

/** Entrée canonique du catalogue : `/learn/formations` */
export default function LearnIndexPage() {
  redirect("/learn/formations");
}
