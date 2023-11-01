import { Logger } from "@/core/lib/logger";
import { delay } from "@/core/lib/utils";
import chalk from "chalk";
import { Browser, BrowserContext, Page, Response, chromium } from "playwright";
import { FollowersResponse, InstagramOptions, NewFollower, StartFollowingProps, WebProfileInfoResponse } from "./types";
import { getConcludedList, getIsHuman, startedFollowing } from "./utils";

export class Instagram {
  public page?: Page;
  public context?: BrowserContext;
  public browser?: Browser;

  private constructor(public options?: InstagramOptions) {}

  static async create(username: string, password: string, options?: InstagramOptions) {
    return await new Instagram(options).login(username, password);
  }

  public async getFollowers(account: string, maxCount = 25) {
    try {
      if (!this.page || !this.context || !this.browser) {
        throw new Error("Not logged in");
      }

      console.log(`Buscando seguidores da conta: ${account}`);
      const blackList = await getConcludedList(account);

      const targetUrl = `https://www.instagram.com/${account}`;
      await this.page.goto(targetUrl);

      const isVisible = await this.page.getByText("This Account is Private").isVisible();
      if (isVisible) {
        throw new Error("Conta privada!");
      }

      /**
       * Clicando no botão de seguidores e esperando pela resposta da primeira requisição
       */
      const [firstResponse] = await Promise.all([
        this.page.waitForResponse(/\/friendships\/\d*\/followers\//),
        this.page.getByText(/(.+) followers/).click(),
      ]);

      const followersCountResponse = await firstResponse.json();
      const followersCount = FollowersResponse.parse(followersCountResponse);

      let count = 0;
      const userPage = await this.context.newPage();

      /**
       * Adicionando os primeiros candidatos à lista
       */
      for (const user of followersCount.users) {
        if (count >= maxCount) break;

        if (blackList.includes(user.username)) {
          console.log(chalk.yellow(`Conta Concluída: ${user.username}`));
          continue;
        }

        const follower = await this.startFollowing({ user, targetAccount: account, page: userPage });

        if (follower) count++;
        await this.page.waitForTimeout(500);
      }

      const followersProfileLocator = this.page.getByRole("link", { name: /(.+)\'s profile picture/ });

      /**
       * De forma "recursiva" vai scrollando a lista de seguidores para carregar novos candidatos
       */

      while (true && count < maxCount) {
        const [firstResponse] = await Promise.all([
          this.page.waitForResponse(/\/friendships\/\d*\/followers\//, { timeout: 10000 }).catch(() => null),
          followersProfileLocator.last().scrollIntoViewIfNeeded(),
        ]);

        if (!firstResponse) break;

        const followersCountResponse = await firstResponse.json();
        const followersCount = FollowersResponse.parse(followersCountResponse);

        for (const user of followersCount.users) {
          if (count >= maxCount) break;

          if (blackList.includes(user.username)) {
            console.log(chalk.yellow(`Conta Concluída: ${user.username}`));
            continue;
          }

          const follower = await this.startFollowing({ user, page: userPage, targetAccount: account });

          if (follower) count++;
          await this.page.waitForTimeout(500);
        }

        await this.page.waitForTimeout(500);
      }
    } catch (error) {
      Logger.error(`[GET_FOLLOWERS] ${(error as Error).message}`);
    } finally {
      await this.page?.close();
      await this.context?.close();
      await this.browser?.close();
    }
  }

  public async getAllFollowers(account: string) {
    try {
      if (!this.page || !this.context || !this.browser) {
        throw new Error("Not logged in");
      }

      console.log(`Buscando seguidores da conta: ${account}`);

      const targetUrl = `https://www.instagram.com/${account}`;
      await this.page.goto(targetUrl);

      await this.page.waitForTimeout(2500);

      const isVisible = await this.page.getByText("This Account is Private").isVisible();
      if (isVisible) {
        throw new Error("Conta privada!");
      }

      const [firstResponse] = await Promise.all([
        this.page.waitForResponse(/\/friendships\/\d*\/followers\//),
        this.page.getByText(/(.+) followers/).click(),
      ]);

      const followersCountResponse = await firstResponse.json();
      const followersCount = FollowersResponse.parse(followersCountResponse);

      const followers: string[] = [];

      /**
       * Adicionando os primeiros candidatos à lista
       */
      followers.push(...followersCount.users.map(({ username }) => username));

      const followersProfileLocator = this.page.getByRole("link", { name: /(.+)\'s profile picture/ });

      /**
       * De forma "recursiva" vai scrollando a lista de seguidores para carregar novos candidatos
       */

      const now = Date.now();
      let count = 0;
      while (true) {
        count++;
        const [firstResponse] = await Promise.all([
          this.page.waitForResponse(/\/friendships\/\d*\/followers\//, { timeout: 10000 }).catch(() => null),
          followersProfileLocator.last().scrollIntoViewIfNeeded(),
        ]);

        if (!firstResponse) {
          console.log(`Não há mais seguidores para carregar`);
          await this.page.pause();
          break;
        }

        const followersCountResponse = await firstResponse.json();
        const followersCount = FollowersResponse.parse(followersCountResponse);

        followers.push(...followersCount.users.map(({ username }) => username));

        console.log(`(${count}) ${followers.length} seguidores em : ${(Date.now() - now) / 1000}s`);

        await this.page.waitForTimeout(1000);
      }

      return followers;
    } catch (error) {
      Logger.error(`[GET_TOTAL_FOLLOWERS] ${(error as Error).message}`);
    } finally {
      await this.page?.close();
      await this.context?.close();
      await this.browser?.close();
    }
  }

  public async stopFollowing(accounts: string[]) {
    try {
      if (!this.page || !this.context || !this.browser) {
        throw new Error("Not logged in");
      }

      console.log(`Parando de seguir ${accounts.length} contas`);
      for (const account of accounts) {
        const [profileInfoResponse] = await Promise.all([
          this.page.waitForResponse(/web_profile_info/),
          this.page.goto(`https://www.instagram.com/${account}`),
        ]);

        const profileInfoData = await profileInfoResponse.json();
        const profileInfo = WebProfileInfoResponse.parse(profileInfoData);

        /**
         * Verifica se não segue o usuário
         */
        if (!profileInfo.followed_by_viewer) {
          console.log(chalk.yellow(`Não está seguindo ${account}`));
          return;
        }

        /**
         * Deixa de seguir o usuário
         */
        console.log(chalk.green(`Parando de seguir ${account}`));

        const item = this.page.locator('button[type="button"]').first();
        await item.click();

        await delay(2000);
      }
    } catch (error) {
      Logger.error(`[STOP_FOLLOWING] ${(error as Error).message}`);
    } finally {
      await this.page?.close();
      await this.context?.close();
      await this.browser?.close();
    }
  }

  private async login(username: string, password: string) {
    console.log(`Iniciando login...`);
    const browser = await chromium.launch({ slowMo: 50, headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("https://www.instagram.com/accounts/login");
    await page.waitForSelector('input[name="username"]');

    console.log(`Inserindo acesso`);
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);

    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.endsWith(`/accounts/login`));

    await page.waitForTimeout(10000);

    console.log(`Login realizado com sucesso!`);
    this.page = page;
    this.context = context;
    this.browser = browser;

    return this;
  }

  private async startFollowing({ user, page, targetAccount }: StartFollowingProps) {
    console.log("---");

    /**
     * Acessando a página do usuário
     */
    const [profileInfoResponse] = await Promise.all([
      page.waitForResponse(/web_profile_info/),
      page.goto(`https://www.instagram.com/${user.username}`),
    ]);

    const profileInfoData = await profileInfoResponse.json();
    const profileInfo = WebProfileInfoResponse.parse(profileInfoData);

    /**
     * Verifica se já segue o usuário
     */
    if (profileInfo.followed_by_viewer) {
      console.log(chalk.yellow(`Já está seguindo ${user.username}`));
      return;
    }

    /**
     * Com base no username, nome e bio do usuário verifica se é uma pessoa real usando a API do OpenAI
     */
    const isHuman = await getIsHuman({
      name: profileInfo.full_name,
      username: profileInfo.username,
      bio: profileInfo.biography,
    });

    if (!isHuman) {
      console.log(chalk.red(`[BOT] ${user.username} não é uma pessoa real`));
      return;
    }

    /**
     * Começa a seguir o usuário
     */
    console.log(chalk.green(`Seguindo ${user.username}`));

    const item = page.locator('button[type="button"]').first();
    await item.click();

    const newFollower = {
      fullName: user.full_name,
      picture: user.profile_pic_url,
      username: user.username,
      bio: profileInfo.biography,
      targetAccount,
    } satisfies NewFollower;

    const follower = await startedFollowing(newFollower);

    return follower;
  }
}
