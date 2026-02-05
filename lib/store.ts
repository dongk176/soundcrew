import { create } from "zustand";

type BookmarkState = {
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
};

export const useBookmarkStore = create<BookmarkState>((set) => ({
  bookmarks: [],
  toggleBookmark: (id) =>
    set((state) => ({
      bookmarks: state.bookmarks.includes(id)
        ? state.bookmarks.filter((item) => item !== id)
        : [...state.bookmarks, id]
    }))
}));
