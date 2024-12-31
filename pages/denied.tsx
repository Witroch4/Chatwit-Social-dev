
import React from "react";
import Link from "next/link";

const DeniedPage = () => {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Acesso Negado</h1>
      <p>Você não tem permissão para acessar esta página.</p>
      <Link href="/">Voltar para a Home</Link>
    </div>
  );
};

export default DeniedPage;
