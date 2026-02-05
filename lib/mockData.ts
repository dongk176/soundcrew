import { Artist, MessageThread, User } from "./types";

export const artists: Artist[] = [];

export const users: User[] = [
  {
    id: "user-001",
    username: "aria",
    name: "ARIA",
    intro: "투어링과 세션을 넘나드는 보컬리스트",
    tags: ["보컬", "코러스", "영어발음"],
    location: "서울",
    genre: "R&B",
    responseRate: 98,
    responseTime: "2시간 이내",
    completed: 38,
    portfolios: [
      {
        id: "pf-1",
        title: "Live Session 2025",
        thumbnail: "/images/portfolio-1.jpg",
        link: "https://youtu.be/demo1"
      },
      {
        id: "pf-2",
        title: "R&B Single",
        thumbnail: "/images/portfolio-2.jpg",
        link: "https://soundcloud.com/demo2"
      },
      {
        id: "pf-3",
        title: "Adlib Pack",
        thumbnail: "/images/portfolio-3.jpg",
        link: "https://soundcloud.com/demo3"
      }
    ],
    reviews: [
      {
        id: "rv-1",
        name: "LUMO Studio",
        rating: 5,
        comment: "정확하고 빠른 디렉션 반영!",
        date: "2025-12-18"
      },
      {
        id: "rv-2",
        name: "Nite Shift",
        rating: 4.8,
        comment: "톤이 정말 좋습니다.",
        date: "2025-11-02"
      }
    ]
  }
];

export const messageThreads: MessageThread[] = [
  {
    id: "thread-1",
    name: "LUMO Studio",
    avatar: "LS",
    lastMessage: "가이드 확인했습니다. 내일 세션 가능할까요?",
    timestamp: "10:32",
    unread: 2,
    messages: [
      {
        id: "m-1",
        fromMe: false,
        body: "가이드 확인했습니다. 내일 세션 가능할까요?",
        time: "10:32"
      },
      {
        id: "m-2",
        fromMe: true,
        body: "네 가능합니다. 일정 공유 부탁드려요.",
        time: "10:35"
      }
    ]
  },
  {
    id: "thread-2",
    name: "Noir Records",
    avatar: "NR",
    lastMessage: "stem 파일 전달드렸습니다.",
    timestamp: "어제",
    unread: 0,
    messages: [
      {
        id: "m-3",
        fromMe: false,
        body: "stem 파일 전달드렸습니다.",
        time: "어제"
      },
      {
        id: "m-4",
        fromMe: true,
        body: "수신했습니다. 1차 믹스는 금요일 공유드릴게요.",
        time: "어제"
      }
    ]
  }
];
