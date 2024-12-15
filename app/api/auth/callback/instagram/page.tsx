import { Auth } from "@auth/core"
import Instagram from "@auth/core/providers/instagram"

const request = new Request(origin)
const response = await Auth(request, {
  providers: [
    Instagram({
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    }),
  ],
})