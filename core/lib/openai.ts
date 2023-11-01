import OpenAI from "openai/index.mjs";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
