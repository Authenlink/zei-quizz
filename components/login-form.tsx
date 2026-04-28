"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Building2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type LoginContext = "user" | "business";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [loginContext, setLoginContext] = useState<LoginContext>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou mot de passe invalide");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        const session = await getSession();
        const actual = session?.user?.accountType;
        if (actual && actual !== loginContext) {
          toast.info(
            actual === "business"
              ? "Ce compte est un compte entreprise (workspace)."
              : "Ce compte est un compte personnel.",
            {
              description:
                loginContext === "business"
                  ? "Vous aviez sélectionné « Entreprise » — le compte connecté reste un compte individuel."
                  : "Vous aviez sélectionné « Personnel » — le compte connecté est rattaché à un workspace.",
            }
          );
        }
        // Redirection en fonction du rôle RBAC :
        //   - user  → portail
        //   - staff → back-office
        //   - admin → back-office par défaut
        const role = session?.user?.role;
        const destination = role === "user" ? "/portal" : "/dashboard";
        router.push(destination);
        router.refresh();
      }
    } catch {
      setError("Une erreur s'est produite. Veuillez reessayer.");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Bienvenue</CardTitle>
          <CardDescription>
            {loginContext === "business"
              ? "Connexion à un compte entreprise"
              : "Connexion à un compte personnel"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error && (
                <Field>
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                </Field>
              )}
              <Field>
                <FieldLabel className="sr-only">Type de compte</FieldLabel>
                <ToggleGroup
                  type="single"
                  value={loginContext}
                  onValueChange={(v) => {
                    if (v === "user" || v === "business") {
                      setLoginContext(v);
                    }
                  }}
                  variant="outline"
                  spacing={0}
                  disabled={isLoading}
                  className="w-full"
                  aria-label="Type de compte"
                >
                  <ToggleGroupItem
                    value="user"
                    className="flex flex-1 items-center justify-center gap-2"
                  >
                    <User className="size-4" />
                    Personnel
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="business"
                    className="flex flex-1 items-center justify-center gap-2"
                  >
                    <Building2 className="size-4" />
                    Entreprise
                  </ToggleGroupItem>
                </ToggleGroup>
                <FieldDescription>
                  Indique le type de session souhaité (information uniquement).
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-4 hover:underline text-muted-foreground hover:text-primary"
                  >
                    Mot de passe oublie ?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Connexion en cours..." : "Se connecter"}
                </Button>
                <FieldDescription className="text-center">
                  Vous n&apos;avez pas de compte ?{" "}
                  <a href="/signup" className="text-primary hover:underline">
                    S&apos;inscrire
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}