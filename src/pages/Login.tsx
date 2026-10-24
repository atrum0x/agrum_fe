import { LoginForm } from "../components/login-form";
import logo from "@/assets/logo.png";
import { ThemeToggle } from "@/components/theme-toggle";
import loginImage from "@/assets/login.webp";

export default function Login() {
  return (
    
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        
        <div className="flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg">
              <img src={logo} alt="" className="size-full object-contain" />
            </div>
            Agrum
          </a>
          <ThemeToggle />
        </div>
        
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src={loginImage}
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  )
}