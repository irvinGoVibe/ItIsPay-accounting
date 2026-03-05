import { google } from "googleapis";
import { prisma } from "./prisma";

export async function getGoogleAuth(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) {
    throw new Error("No Google account linked");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  // Auto-refresh if expired
  if (account.expires_at && Date.now() / 1000 > account.expires_at) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: credentials.access_token,
        expires_at: credentials.expiry_date
          ? Math.floor(credentials.expiry_date / 1000)
          : null,
        refresh_token: credentials.refresh_token ?? account.refresh_token,
      },
    });
    oauth2Client.setCredentials(credentials);
  }

  return oauth2Client;
}

export function getGmail(auth: ReturnType<typeof google.auth.OAuth2.prototype.setCredentials> extends void ? never : Parameters<typeof google.gmail>[0]["auth"]) {
  return google.gmail({ version: "v1", auth: auth as never });
}

export function getCalendar(auth: unknown) {
  return google.calendar({ version: "v3", auth: auth as never });
}
