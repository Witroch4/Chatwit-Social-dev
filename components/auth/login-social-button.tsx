//components\auth\login-social-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import type { ReactNode } from "react";

type Props = {
  provider: "google" | "github" | "facebook" ;
  callbackUrl?: string;
  children?: ReactNode;
};

const LoginSocialButton = ({ children, provider, callbackUrl }: Props) => {
  return (
    <Button
      variant={"outline"}
      size={"default"}
      onClick={async () => {
        signIn(provider, { redirect: true, callbackUrl });
      }}
    >
      {children}
    </Button>
  );
};

export default LoginSocialButton;
