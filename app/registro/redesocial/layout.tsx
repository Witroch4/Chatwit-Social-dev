import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conectar Redes Sociais | Chatwit-Social",
  description: "Conecte suas contas de Instagram e outras redes sociais para automatizar interações.",
};

export default function RedeSocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="flex justify-center mb-8">
        <a href="/" className="flex items-center">
          <img src="/W.svg" alt="Chatwit-Social Logo" className="h-10 w-10" />
          <span className="ml-2 text-2xl font-bold">Chatwit-Social</span>
        </a>
      </div>
      {children}
    </div>
  );
}