import { prisma } from "@/core/lib/prisma";
import { NewFollower } from "./types";
import { openai } from "../lib/openai";

export interface CheckHumanProps {
  name: string;
  username: string;
  bio: string;
}

export async function getIsHuman({ bio, name, username }: CheckHumanProps) {
  console.log("[VALIDATING]", { name, username, bio });

  const response = await openai.chat.completions.create({
    model: "gpt-4-0613",
    messages: [
      {
        role: "user",
        content: `A conta do instagram contendo os seguintes dados: 
name: ${name}
username: ${username}
bio: ${bio}
Corresponde à uma pessoa real?
Por pessoa real entende-se que é a conta pessoal de alguém e não de uma marca ou empresa.'
`,
      },
    ],
    functions: [
      {
        name: "accountIsFromHuman",
        description: "Valida se a conta do instagram corresponde à uma pessoal real",
        parameters: {
          type: "object",
          properties: {
            isHuman: {
              type: "boolean",
              description: "true se a conta for de uma pessoa real, false caso contrário",
            },
          },
        },
      },
    ],
  });

  const responseMessage = response.choices[0].message;

  if (!responseMessage.function_call) {
    throw new Error("Não foi possível validar a conta! Sem resposta de function call.");
  }

  const functions: Record<string, Function> = {
    accountIsFromHuman(isHuman: boolean) {
      if (isHuman) {
        console.log("A conta é de uma pessoa real");
      } else {
        console.log("A conta não é de uma pessoa real");
      }

      return isHuman;
    },
  };

  const functionName = responseMessage.function_call.name;
  const functionToCall = functions[functionName];
  const args = JSON.parse(responseMessage.function_call.arguments);

  return await functionToCall(args.isHuman);
}

export async function startedFollowing(user: NewFollower) {
  const follower = await prisma.follower.upsert({
    where: { username: user.username },
    create: {
      name: user.fullName,
      username: user.username,
      bio: user.bio,
      targetAccountUsername: user.targetAccount,
      startFollowingAt: new Date(),
    },
    update: {
      startFollowingAt: new Date(),
    },
  });

  return follower;
}

export async function getConcludedList(targetAccountUsername: string) {
  const followers = await prisma.follower.findMany({
    where: { targetAccountUsername, isConcluded: true },
    select: { username: true },
  });

  return followers.map((follower) => follower.username);
}

export async function getRandomTargetAccount() {
  const accounts = await prisma.targetAccount.findMany();

  const randomIndex = Math.floor(Math.random() * accounts.length);

  return accounts[randomIndex];
}
