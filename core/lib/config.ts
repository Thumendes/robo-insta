import { prisma } from "./prisma";

export const ConfigKey = {
  InstagramUsername: "instagram_username",
  InstagramPassword: "instagram_password",
} as const;

export type ConfigKey = (typeof ConfigKey)[keyof typeof ConfigKey];

export class Config extends Map<string, string> {
  public static async get() {
    const data = await prisma.config.findMany();

    const entries: [string, string][] = data.map((entry) => [entry.key, entry.value]);

    return new Config(entries);
  }

  public async setConfig(key: ConfigKey, value: string) {
    await prisma.config.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    this.set(key, value);

    return this;
  }
}
