import nextra from "nextra"

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.jsx"
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["sharp"],

  webpack: (config, { isServer }) => {
    // Configuração para resolver o alias @/
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '.'
    }
    return config
  },

  async headers() {
    return [
      {
        source: "/api/chatwitia/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin",      value: "*" },
          { key: "Access-Control-Allow-Methods",     value: "GET,DELETE,PATCH,POST,PUT" },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
          }
        ]
      }
    ]
  },

  env: {
    NEXT_PUBLIC_URL:                    process.env.NEXT_PUBLIC_URL,
    NEXT_PUBLIC_INSTAGRAM_APP_ID:       process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID,
    NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI: process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  }
}

export default withNextra(nextConfig)
