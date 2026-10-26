import { Lottie } from "lottie-react";
import logoAnimation from "@/assets/logo.json";

export default function LogoAnimation({ className }: { className?: string }) {
  return <Lottie src={logoAnimation} autoplay loop className={className} />;
}
