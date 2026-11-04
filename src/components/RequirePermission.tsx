import { Outlet, useLocation } from "react-router-dom";
import { ShieldXIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { permissionFor } from "@/components/nav-data";

// DB-01: a menu page opened by typing its address. The backend refuses the data anyway;
// this shows the reason instead of an empty page.
export default function RequirePermission() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const { pathname } = useLocation();
  const permission = permissionFor(pathname);

  if (permission && !can(permission)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <ShieldXIcon className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("common.noWindowPermission")}</p>
      </div>
    );
  }
  return <Outlet />;
}
