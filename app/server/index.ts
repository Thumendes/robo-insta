import "dotenv/config";

import { Instagram } from "@/core/insta";
import { getRandomTargetAccount } from "@/core/insta/utils";
import { Config, ConfigKey } from "@/core/lib/config";
import { raise } from "@/core/lib/utils";
import { Cron } from "croner";

const getFollowersJob = Cron("*/30 9-18 * * *");
const monitorJob = Cron("0 19 * * *");

getFollowersJob.schedule(async () => {
  console.log(`Iniciando GET_FOLLOWERS_JOB...`);
  const config = await Config.get();

  const username = config.get(ConfigKey.InstagramUsername) ?? raise(`Pendente configurar INSTAGRAM_USERNAME`);
  const password = config.get(ConfigKey.InstagramPassword) ?? raise(`Pendente configurar INSTAGRAM_PASSWORD`);
  const account = (await getRandomTargetAccount()) ?? raise(`Deve cadastrar as contas primeiro!`);

  const instagram = await Instagram.create(username, password);

  await instagram.getFollowers(account.username);
});

monitorJob.schedule(async () => {
  console.log(`MONITORANDO...`);
});
