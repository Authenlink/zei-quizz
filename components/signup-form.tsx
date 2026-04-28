"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Building2, User, PlusCircle, LogIn, Check, Loader2 } from "lucide-react";
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
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

// ============================================================
// Types
// ============================================================
type AccountType = "user" | "business";
type WorkspaceAction = "create" | "join";
type SignupStep = "account-type" | "user-info" | "workspace";

type SlugStatus =
  | "idle"
  | "checking"
  | "available"   // pour create
  | "taken"        // pour create
  | "exists"       // pour join
  | "not-found";   // pour join

// ============================================================
// Helpers
// ============================================================
function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

// ============================================================
// Indicateur d'étapes
// ============================================================
function StepIndicator({
  current,
  isBusiness,
}: {
  current: SignupStep;
  isBusiness: boolean;
}) {
  const steps = isBusiness
    ? ["account-type", "user-info", "workspace"]
    : ["account-type", "user-info"];

  const stepLabels: Record<string, string> = {
    "account-type": "Type",
    "user-info": "Infos",
    workspace: "Workspace",
  };

  const currentIndex = steps.indexOf(current);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border transition-colors",
                done && "bg-primary border-primary text-primary-foreground",
                active && "bg-primary border-primary text-primary-foreground",
                !done && !active && "border-border text-muted-foreground"
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-xs hidden sm:inline",
                active ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {stepLabels[step]}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 transition-colors",
                  i < currentIndex ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Composant principal
// ============================================================
export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();

  // --- État général ---
  const [step, setStep] = useState<SignupStep>("account-type");
  const [accountType, setAccountType] = useState<AccountType>("user");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- Étape 2 : infos utilisateur ---
  const [signupInviteCode, setSignupInviteCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // --- Étape 3 : workspace ---
  const [workspaceAction, setWorkspaceAction] = useState<WorkspaceAction>("create");
  const [wsName, setWsName] = useState("");
  const [wsSlug, setWsSlug] = useState("");
  const [wsSlugManuallyEdited, setWsSlugManuallyEdited] = useState(false);
  const [wsPassword, setWsPassword] = useState("");
  const [wsConfirmPassword, setWsConfirmPassword] = useState("");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [slugMessage, setSlugMessage] = useState<string>("");

  // --- Auto-générer le slug depuis le nom (create) ---
  useEffect(() => {
    if (workspaceAction === "create" && !wsSlugManuallyEdited && wsName) {
      setWsSlug(toSlug(wsName));
    }
  }, [wsName, workspaceAction, wsSlugManuallyEdited]);

  // --- Vérification du slug en temps réel (debouncée) ---
  const checkSlug = useDebouncedCallback(async (slug: string) => {
    if (!slug || slug.length < 2) {
      setSlugStatus("idle");
      setSlugMessage("");
      return;
    }

    setSlugStatus("checking");

    try {
      const res = await fetch(`/api/workspaces/check?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();

      if (workspaceAction === "create") {
        if (data.exists) {
          setSlugStatus("taken");
          setSlugMessage("Cet identifiant est déjà utilisé");
        } else {
          setSlugStatus("available");
          setSlugMessage("Identifiant disponible");
        }
      } else {
        if (data.exists) {
          setSlugStatus("exists");
          setSlugMessage(`Workspace trouvé : « ${data.name} »`);
        } else {
          setSlugStatus("not-found");
          setSlugMessage("Aucun workspace avec cet identifiant");
        }
      }
    } catch {
      setSlugStatus("idle");
      setSlugMessage("");
    }
  }, 400);

  useEffect(() => {
    if (wsSlug) checkSlug(wsSlug);
    else {
      setSlugStatus("idle");
      setSlugMessage("");
    }
  }, [wsSlug, workspaceAction]);

  // ============================================================
  // Soumission finale
  // ============================================================
  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const body: Record<string, unknown> = {
        name,
        email,
        password,
        accountType,
        signupInviteCode,
      };

      if (accountType === "business") {
        body.workspace = {
          action: workspaceAction,
          slug: wsSlug,
          password: wsPassword,
          ...(workspaceAction === "create" && { name: wsName }),
        };
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Échec de l'inscription");
        setIsLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Compte créé mais échec de connexion. Veuillez vous connecter manuellement.");
        setIsLoading(false);
        return;
      }

      if (signInResult?.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Une erreur s'est produite. Veuillez réessayer.");
      setIsLoading(false);
    }
  };

  // ============================================================
  // Validation par étape
  // ============================================================
  const validateUserInfo = (): string | null => {
    if (!signupInviteCode.trim()) return "Le code d'accès à l'inscription est requis";
    if (!name.trim()) return "Le nom est requis";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email invalide";
    if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères";
    if (password !== confirmPassword) return "Les mots de passe ne correspondent pas";
    return null;
  };

  const validateWorkspace = (): string | null => {
    if (!wsSlug) return "L'identifiant du workspace est requis";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(wsSlug))
      return "Identifiant invalide (minuscules, chiffres, tirets)";

    if (workspaceAction === "create") {
      if (!wsName.trim() || wsName.length < 2) return "Le nom du workspace doit contenir au moins 2 caractères";
      if (slugStatus === "taken") return "Cet identifiant est déjà utilisé";
      if (slugStatus === "checking") return "Vérification en cours…";
      if (wsPassword.length < 6) return "Le mot de passe workspace doit contenir au moins 6 caractères";
      if (wsPassword !== wsConfirmPassword) return "Les mots de passe workspace ne correspondent pas";
    }

    if (workspaceAction === "join") {
      if (slugStatus === "not-found") return "Aucun workspace avec cet identifiant";
      if (slugStatus === "checking") return "Vérification en cours…";
      if (!wsPassword) return "Le mot de passe workspace est requis";
    }

    return null;
  };

  const handleNextFromUserInfo = () => {
    const err = validateUserInfo();
    if (err) { setError(err); return; }
    setError(null);
    if (accountType === "business") {
      setStep("workspace");
    } else {
      handleSubmit();
    }
  };

  const handleNextFromWorkspace = () => {
    const err = validateWorkspace();
    if (err) { setError(err); return; }
    setError(null);
    handleSubmit();
  };

  // ============================================================
  // Rendu
  // ============================================================
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Créez votre compte</CardTitle>
          <CardDescription>
            {step === "account-type" && "Choisissez votre type de compte"}
            {step === "user-info" && "Vos informations personnelles"}
            {step === "workspace" && (
              workspaceAction === "create"
                ? "Créez votre espace de travail"
                : "Rejoignez un espace de travail"
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <StepIndicator current={step} isBusiness={accountType === "business"} />

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* -------------------------------------------------- */}
          {/* ÉTAPE 1 — Choix du type de compte                   */}
          {/* -------------------------------------------------- */}
          {step === "account-type" && (
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType("user")}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-colors",
                    accountType === "user"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full",
                    accountType === "user" ? "bg-primary/15" : "bg-muted"
                  )}>
                    <User className={cn("h-5 w-5", accountType === "user" ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Compte personnel</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pour usage individuel</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType("business")}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-colors",
                    accountType === "business"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full",
                    accountType === "business" ? "bg-primary/15" : "bg-muted"
                  )}>
                    <Building2 className={cn("h-5 w-5", accountType === "business" ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Compte entreprise</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Accès au workspace partagé</p>
                  </div>
                </button>
              </div>

              <Field>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => { setError(null); setStep("user-info"); }}
                >
                  Continuer
                </Button>
                <FieldDescription className="text-center">
                  Vous avez déjà un compte ?{" "}
                  <a href="/login" className="text-primary hover:underline">
                    Se connecter
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          )}

          {/* -------------------------------------------------- */}
          {/* ÉTAPE 2 — Informations de base                      */}
          {/* -------------------------------------------------- */}
          {step === "user-info" && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="signup-invite">Code d&apos;accès à l&apos;inscription</FieldLabel>
                <Input
                  id="signup-invite"
                  type="password"
                  autoComplete="off"
                  placeholder="Code fourni par l&apos;équipe"
                  value={signupInviteCode}
                  onChange={(e) => setSignupInviteCode(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <FieldDescription>
                  Nécessaire pour créer un compte sur cette instance.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="name">Nom complet</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jean Dupont"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
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
                    <FieldLabel htmlFor="confirm-password">Confirmer</FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </Field>
                </div>
                <FieldDescription>Minimum 8 caractères.</FieldDescription>
              </Field>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setError(null); setStep("account-type"); }}
                  disabled={isLoading}
                >
                  Retour
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleNextFromUserInfo}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création…</>
                  ) : accountType === "business" ? (
                    "Suivant"
                  ) : (
                    "Créer mon compte"
                  )}
                </Button>
              </div>
            </FieldGroup>
          )}

          {/* -------------------------------------------------- */}
          {/* ÉTAPE 3 — Workspace (business uniquement)           */}
          {/* -------------------------------------------------- */}
          {step === "workspace" && (
            <FieldGroup>
              {/* Choix : créer ou rejoindre */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceAction("create");
                    setWsSlug("");
                    setWsSlugManuallyEdited(false);
                    setSlugStatus("idle");
                    setSlugMessage("");
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-colors",
                    workspaceAction === "create"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <PlusCircle className={cn("h-5 w-5", workspaceAction === "create" ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-medium">Créer</span>
                  <span className="text-xs text-muted-foreground">Nouveau workspace</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceAction("join");
                    setWsSlug("");
                    setSlugStatus("idle");
                    setSlugMessage("");
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-colors",
                    workspaceAction === "join"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <LogIn className={cn("h-5 w-5", workspaceAction === "join" ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-medium">Rejoindre</span>
                  <span className="text-xs text-muted-foreground">Workspace existant</span>
                </button>
              </div>

              {/* Champs Créer */}
              {workspaceAction === "create" && (
                <>
                  <Field>
                    <FieldLabel htmlFor="ws-name">Nom du workspace</FieldLabel>
                    <Input
                      id="ws-name"
                      type="text"
                      placeholder="Acme Corp"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      disabled={isLoading}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="ws-slug">Identifiant unique</FieldLabel>
                    <div className="relative">
                      <Input
                        id="ws-slug"
                        type="text"
                        placeholder="acme-corp"
                        value={wsSlug}
                        onChange={(e) => {
                          setWsSlug(toSlug(e.target.value));
                          setWsSlugManuallyEdited(true);
                        }}
                        disabled={isLoading}
                        className={cn(
                          slugStatus === "available" && "border-green-500 focus-visible:ring-green-500",
                          slugStatus === "taken" && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {slugStatus === "checking" && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {slugMessage && (
                      <p className={cn(
                        "text-xs mt-1",
                        slugStatus === "available" ? "text-green-600" : "text-destructive"
                      )}>
                        {slugMessage}
                      </p>
                    )}
                    <FieldDescription>
                      Utilisé pour identifier votre workspace (lettres minuscules, chiffres, tirets).
                    </FieldDescription>
                  </Field>

                  <Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="ws-password">Mot de passe workspace</FieldLabel>
                        <Input
                          id="ws-password"
                          type="password"
                          placeholder="••••••"
                          value={wsPassword}
                          onChange={(e) => setWsPassword(e.target.value)}
                          disabled={isLoading}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="ws-confirm-password">Confirmer</FieldLabel>
                        <Input
                          id="ws-confirm-password"
                          type="password"
                          placeholder="••••••"
                          value={wsConfirmPassword}
                          onChange={(e) => setWsConfirmPassword(e.target.value)}
                          disabled={isLoading}
                        />
                      </Field>
                    </div>
                    <FieldDescription>
                      Ce mot de passe sera partagé avec vos collaborateurs pour rejoindre le workspace.
                    </FieldDescription>
                  </Field>
                </>
              )}

              {/* Champs Rejoindre */}
              {workspaceAction === "join" && (
                <>
                  <Field>
                    <FieldLabel htmlFor="join-slug">Identifiant du workspace</FieldLabel>
                    <div className="relative">
                      <Input
                        id="join-slug"
                        type="text"
                        placeholder="acme-corp"
                        value={wsSlug}
                        onChange={(e) => setWsSlug(e.target.value.toLowerCase())}
                        disabled={isLoading}
                        className={cn(
                          slugStatus === "exists" && "border-green-500 focus-visible:ring-green-500",
                          slugStatus === "not-found" && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {slugStatus === "checking" && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {slugMessage && (
                      <p className={cn(
                        "text-xs mt-1",
                        slugStatus === "exists" ? "text-green-600" : "text-destructive"
                      )}>
                        {slugMessage}
                      </p>
                    )}
                    <FieldDescription>
                      Demandez l&apos;identifiant à l&apos;administrateur de votre workspace.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="join-password">Mot de passe du workspace</FieldLabel>
                    <Input
                      id="join-password"
                      type="password"
                      placeholder="••••••"
                      value={wsPassword}
                      onChange={(e) => setWsPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </Field>
                </>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setError(null); setStep("user-info"); }}
                  disabled={isLoading}
                >
                  Retour
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleNextFromWorkspace}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création…</>
                  ) : (
                    "Créer mon compte"
                  )}
                </Button>
              </div>
            </FieldGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
