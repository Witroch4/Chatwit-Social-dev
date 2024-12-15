import meta from "../../../pages/_meta.js";
import docs_meta from "../../../pages/docs/_meta.js";
export const pageMap = [{
  data: meta
}, {
  name: "docs",
  route: "/docs",
  children: [{
    data: docs_meta
  }, {
    name: "about",
    route: "/docs/about",
    frontMatter: {
      "title": "Sobre o Projeto"
    }
  }, {
    name: "creator",
    route: "/docs/creator",
    frontMatter: {
      "title": "Criador",
      "description": "O desenvolvimento do projeto foi feito por Bruno Kilian, criador de conteúdo do canal DeveloperDeck101."
    }
  }, {
    name: "db",
    route: "/docs/db",
    frontMatter: {
      "title": "Bando de Dados",
      "description": "Como utilizar o Banco de Dados"
    }
  }, {
    name: "docker",
    route: "/docs/docker",
    frontMatter: {
      "title": "Docker",
      "description": "Utilização do Banco de Dados com container"
    }
  }, {
    name: "editable-content",
    route: "/docs/editable-content",
    frontMatter: {
      "title": "Componente de Conteúdo Editável",
      "description": "Como utilizar o componente de conteúdo editável"
    }
  }, {
    name: "email",
    route: "/docs/email",
    frontMatter: {
      "title": "E-mail",
      "description": "Como utilizar o Banco de Dados"
    }
  }, {
    name: "get_started",
    route: "/docs/get_started",
    frontMatter: {
      "title": "Get Started",
      "description": "Como inicializar o projeto"
    }
  }, {
    name: "index",
    route: "/docs",
    frontMatter: {
      "title": "Introdução",
      "description": "Este Starter Kit foi desenvolvido para poupar seu tempo, oferecendo tudo o que você precisa para começar a desenvolver seu projeto com segurança."
    }
  }, {
    name: "initialize",
    route: "/docs/initialize",
    frontMatter: {
      "title": "Inicialização",
      "description": "Como utilizar inicializar o Projeto"
    }
  }, {
    name: "multi-step-form",
    route: "/docs/multi-step-form",
    frontMatter: {
      "title": "Multi Step Form",
      "description": "Processo guiado com react-hook-form e zod"
    }
  }, {
    name: "prisma",
    route: "/docs/prisma",
    frontMatter: {
      "title": "Prisma",
      "description": "Tabelas do ORM"
    }
  }, {
    name: "security",
    route: "/docs/security",
    frontMatter: {
      "title": "Segurança",
      "description": "Como configurar a Segurança"
    }
  }, {
    name: "variables",
    route: "/docs/variables",
    frontMatter: {
      "title": "Variáveis",
      "description": "Configuração de Variáveis"
    }
  }]
}];