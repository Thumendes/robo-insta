export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function raise(message: string): never {
  throw new Error(message);
}
