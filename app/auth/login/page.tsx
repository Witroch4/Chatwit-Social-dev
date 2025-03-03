// app/auth/login/page.tsx

"use client";

import React, { Suspense } from "react";
import LoginForm from "@/components/auth/login-form";

const Login = () => {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <LoginForm />
      </div>
    </Suspense>
  );
};

export default Login;
