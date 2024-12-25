// app/auth/login/page.tsx

"use client";

import React from "react";
import LoginForm from "@/components/auth/login-form";

const Login = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <LoginForm />
    </div>
  );
};

export default Login;
