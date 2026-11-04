import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentUser, logoutWeb, useLoginWeb } from "@/api/generated/endpoints/auth-controller/auth-controller";
import { useQueryClient } from "@tanstack/react-query";
import { notifyError, notifyInfo } from "@/lib/notify";
import { hasPermission, type Permission } from "@/lib/permissions";
import { filterNav, navData } from "@/components/nav-data";
import type { UserProfile } from "@/context/AuthContext";
import { HAD_SESSION_KEY } from "@/api/custom-fetch";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { mutate: doLogin, isPending } = useLoginWeb();

  // LG-06: sent here after the session ended
  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      // LG-06
      notifyError(t("login.sessionExpired"));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  // FSD 2.1: the web shows LG-01, LG-02, LG-05 and LG-06 itself; the server sends LG-03, LG-04 and LG-05 for the account
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      notifyError(t("login.enterUsername"));
      return;
    }
    if (!password) {
      notifyError(t("login.enterPassword"));
      return;
    }

    doLogin(
      { data: { username, password } },
      {
        onSuccess: async () => {
          setChecking(true);
          try {
            // LG-05: the user must be allowed at least one web window
            const profile = (await getCurrentUser()) as unknown as UserProfile;
            const can = (permission: Permission) => hasPermission(profile, permission);
            if (filterNav(navData, can).length === 0) {
              await logoutWeb({}).catch(() => undefined);
              setPassword("");
              notifyError(t("login.noAccess"));
              return;
            }
            localStorage.setItem(HAD_SESSION_KEY, "1");
            queryClient.invalidateQueries();
            navigate("/landing");
          } catch (error) {
            notifyError(error);
          } finally {
            setChecking(false);
          }
        },
        // LG-03: the server's message is shown as a toast; the password is cleared, with no lockout
        onError: () => setPassword(""),
      }
    );
  };

  const busy = isPending || checking;

  return (
    <form onSubmit={handleLogin} noValidate className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{t("login.title")}</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {t("login.subtitle")}
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="username">{t("login.username")}</FieldLabel>
          <Input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">{t("login.password")}</FieldLabel>
            <button
              type="button"
              className="ml-auto text-sm underline-offset-4 hover:underline"
              onClick={() => notifyInfo(t("login.contactAdmin"))}
            >
              {t("login.forgotPassword")}
            </button>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? t("login.signingIn") : t("login.submit")}
          </Button>
        </Field>

      </FieldGroup>
    </form>
  )
}
