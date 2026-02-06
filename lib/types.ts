export type Job = {
  id: string;
  title: string;
  position: string;
  tags: string[];
  budget: number;
  location: string;
  mode: "온라인" | "오프라인" | "혼합";
  genre: string;
  deadline: string;
  postedAt: string;
  client: {
    name: string;
    rating: number;
    reviews: number;
  };
  summary: string;
  requirements: string[];
  scope: string[];
  references: string[];
  schedule: string[];
  attachments: string[];
  settlement: "건당" | "시간" | "프로젝트";
  experience: "초급" | "중급" | "고급";
};

export type ArtistGenre =
  | "팝"
  | "힙합"
  | "알앤비"
  | "일렉트로닉"
  | "락"
  | "어쿠스틱"
  | "재즈"
  | "시네마틱"
  | "월드 뮤직"
  | "가스펠"
  | "인디";

export type ArtistRole =
  | "프로듀서"
  | "싱어"
  | "믹싱 엔지니어"
  | "송라이터"
  | "마스터링 엔지니어"
  | "세션 뮤지션";

export type ArtistTrack = {
  id: string;
  title?: string;
  sourceType: "UPLOAD";
  url: string;
};

export type ArtistVideo = {
  id: string;
  title?: string;
  url: string;
};

export type ArtistReview = {
  id: string;
  authorName: string;
  authorRole?: string;
  authorAvatarUrl?: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type ArtistRate = {
  id: string;
  title: string;
  amount: number;
  sortOrder: number;
};

export type ArtistRequestStats = {
  responseRate: number | null;
  responseTimeMinutes: number | null;
  completedCount: number;
  totalRequests: number;
};

export type ArtistEquipment = {
  id: string;
  category: "INSTRUMENT" | "GEAR";
  name: string;
  sortOrder: number;
};

export type Artist = {
  id: string;
  slug?: string;
  stageName: string;
  shortIntro?: string;
  portfolioText?: string;
  mainGenre?: ArtistGenre;
  roles?: ArtistRole[];
  genres: ArtistGenre[];
  reviewCount?: number;
  avgRating?: number;
  onlineAvailable?: boolean;
  offlineAvailable?: boolean;
  offlineRegions?: string[];
  averageWorkDuration?: string;
  portfolioLinks?: string[];
  avatarUrl?: string;
  photos?: {
    id: string;
    url: string;
    isMain: boolean;
    sortOrder: number;
  }[];
  tracks: ArtistTrack[];
  videos?: ArtistVideo[];
  reviews?: ArtistReview[];
  rates?: ArtistRate[];
  equipment?: ArtistEquipment[];
  stats?: ArtistRequestStats;
  joinedAt?: string;
  createdAt?: string;
  isOwner?: boolean;
};

export type User = {
  id: string;
  username: string;
  name: string;
  intro: string;
  tags: string[];
  location: string;
  genre: string;
  responseRate: number;
  responseTime: string;
  completed: number;
  portfolios: {
    id: string;
    title: string;
    thumbnail: string;
    link: string;
  }[];
  reviews: {
    id: string;
    name: string;
    rating: number;
    comment: string;
    date: string;
  }[];
};

export type MessageThread = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  messages: {
    id: string;
    fromMe: boolean;
    body: string;
    time: string;
  }[];
};

export type FilterState = {
  positions: string[];
  locations: string[];
  modes: string[];
  genres: string[];
  experience: string[];
  settlement: string[];
  budget: number;
  urgentOnly: boolean;
};
