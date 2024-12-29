// app/admin/queue/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CircularProgress, Box } from "@mui/material";

const AdminQueuePage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return; // Ainda carregando
    if (!session || session.user.role !== "ADMIN") {
      router.push("/"); // Redireciona se não for admin
    }
  }, [session, status, router]);

  if (status === "loading" || (session && session.user.role !== "ADMIN")) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <iframe
      src="/api/admin/queue"
      style={{ width: "100%", height: "100vh", border: "none" }}
      title="Bull Board"
    />
  );
};

export default AdminQueuePage;
