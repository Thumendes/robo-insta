import "dotenv/config";

import { Instagram } from "@/core/insta";
import { Config, ConfigKey } from "@/core/lib/config";
import { raise } from "@/core/lib/utils";
import fs from "fs/promises";

const config = await Config.get();

await config.setConfig("instagram_username", "...");
await config.setConfig("instagram_password", "...");

const username = config.get(ConfigKey.InstagramUsername) ?? raise(`Pendente configurar INSTAGRAM_USERNAME`);
const password = config.get(ConfigKey.InstagramPassword) ?? raise(`Pendente configurar INSTAGRAM_PASSWORD`);

const instagram = await Instagram.create(username, password);

const account = `1casadecor`;

const now = Date.now();
const followers = await instagram.getAllFollowers(account);

console.log(`Tempo total: ${Date.now() - now}ms`);

console.log(followers?.length);

await fs.writeFile(`./${account}.json`, JSON.stringify(followers, null, 2));
