import { Page } from "playwright";
import { z } from "zod";

export const FollowerResponse = z.object({
  profile_pic_url: z.string(),
  full_name: z.string(),
  username: z.string(),
});
export type FollowerResponse = z.infer<typeof FollowerResponse>;

export const FollowersResponse = z.object({
  has_more: z.boolean(),
  users: z.array(FollowerResponse),
});
export type FollowersResponse = z.infer<typeof FollowersResponse>;

export const WebProfileInfoResponse = z
  .object({
    data: z.object({
      user: z.object({
        biography: z.string(),
        followed_by_viewer: z.boolean(),
        username: z.string(),
        full_name: z.string(),
      }),
    }),
  })
  .transform((data) => data.data.user);
export type WebProfileInfoResponse = z.infer<typeof WebProfileInfoResponse>;

export interface InstagramOptions {}

export interface NewFollower {
  fullName: string;
  picture: string;
  username: string;
  bio: string;
  targetAccount: string;
}

export interface StartFollowingProps {
  targetAccount: string;
  page: Page;
  user: FollowerResponse;
}
