import { DEFAULT_STATS } from "./constants";

export type DownloadStats = typeof DEFAULT_STATS;

export type DailyDownload = {
  _id: string;
  downloads: number;
};

export type UserActivity = {
  _id: string;
  downloads: number;
  lastDownload: Date;
};