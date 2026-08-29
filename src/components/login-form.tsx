import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useLoginWeb } from "@/api/generated/endpoints/auth-controller/auth-controller";
import { useQueryClient } from "@tanstack/react-query";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: doLogin, isPending, error } = useLoginWeb();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    doLogin(
      { data: { username, password } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          navigate("/landing");
        }
      }
    );
  };

  return (
    <form onSubmit={handleLogin} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your credentials below to access the admin dashboard
          </p>
        </div>
        {error instanceof Error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive text-center">
            {error && <p className="text-red-500">{error.message}</p>}
          </div>
        )}
        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input 
            id="username" 
            type="text" 
            placeholder="admin" 
            required 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input 
            id="password" 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in..." : "Login"}
          </Button>
        </Field>
        
      </FieldGroup>
    </form>
  )
}
