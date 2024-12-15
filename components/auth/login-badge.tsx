//components/auth/login-badge.tsx

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import type { User } from "next-auth";
import Link from "next/link";
import { CircleUser, LogOut } from "lucide-react";
import { LineMdCogLoop } from "../icons";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Lottie from "lottie-react";
import coinsLightAnimation from "@/animations/coins-light.json";
import coinsDarkAnimation from "@/animations/coins-dark.json";
import LoginButton from "./login-button";
import LogoutButton from "./logout-button";
import { useTheme } from "next-themes";

type Props = {
  user?: User;
};

const LoginBadge = ({ user }: Props) => {
  const { theme } = useTheme();
  const coinsAnimation = theme === "dark" ? coinsDarkAnimation : coinsLightAnimation;

  // Verificar se está no client para renderizar o Lottie
  const isClient = typeof window !== 'undefined';

  if (!user) {
    return (
      <div className="flex flex-col gap-2 p-2">
        <LoginButton>
          <Button variant="default">Entrar</Button>
        </LoginButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarImage src={user.image || ""} />
          <AvatarFallback className="bg-green-500">
            <CircleUser className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-foreground">{user.name ?? "Minha Conta"}</span>
      </div>
      <hr className="w-full border-muted-foreground/20" />
      <div className="flex flex-col gap-1 w-full text-sm">
        <Link href="/auth/settings" className="hover:underline flex items-center gap-2">
          <LineMdCogLoop className="mr-2" />
          Perfil
        </Link>
        <Link href="/cobranca" className="hover:underline flex items-center gap-2">
          <div className="w-6 h-6">
            {isClient && <Lottie animationData={coinsAnimation} loop={true} />}
          </div>
          Cobrança
        </Link>
        <LogoutButton>
          <Button variant="ghost" className="flex items-center gap-2 justify-start text-sm">
            <LogOut /> Sair
          </Button>
        </LogoutButton>
      </div>
    </div>
  );
};

export default LoginBadge;
