"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AppSidebar from "@/components/layout/AppSidebar";
import { Artist } from "@/lib/types";
import { cn } from "@/lib/utils";
import LoginModal from "@/components/auth/LoginModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark, MessageSquare } from "lucide-react";

const genreOptions = [
  { label: "팝", value: "POP" },
  { label: "힙합", value: "HIPHOP" },
  { label: "알앤비", value: "RNB" },
  { label: "일렉트로닉", value: "ELECTRONIC" },
  { label: "락", value: "ROCK" },
  { label: "어쿠스틱", value: "ACOUSTIC" },
  { label: "재즈", value: "JAZZ" },
  { label: "시네마틱", value: "CINEMATIC" },
  { label: "월드 뮤직", value: "WORLD" },
  { label: "가스펠", value: "GOSPEL" },
  { label: "인디", value: "INDIE" }
] as const;

const roleOptions = [
  { label: "프로듀서", value: "PRODUCER" },
  { label: "싱어", value: "SINGER" },
  { label: "믹싱 엔지니어", value: "MIXING_ENGINEER" },
  { label: "송라이터", value: "SONGWRITER" },
  { label: "마스터링 엔지니어", value: "MASTERING_ENGINEER" },
  { label: "세션 뮤지션", value: "SESSION_MUSICIAN" }
] as const;

const regionGroups = {
  서울: [
    "마포구",
    "서대문구",
    "용산구",
    "은평구",
    "광진구",
    "성동구",
    "동작구",
    "강남구",
    "송파구",
    "강서구",
    "양천구",
    "구로구",
    "영등포구",
    "종로구",
    "중구",
    "성북구"
  ],
  경기: [
    "고양·일산",
    "부천·광명",
    "수원·화성·동탄",
    "과천·의왕",
    "용인권",
    "안산·시흥권",
    "남양주·구리·하남·광주권",
    "파주·김포",
    "평택·오산·안성권",
    "성남·분당",
    "안양·의정부",
    "양주·포천·동두천"
  ],
  인천: ["서구", "부평구", "강화군", "미추홀구", "남동구", "연수구", "계양구", "동구", "중구"],
  부산: ["해운대구", "수영구", "부산진구", "남구", "동래구", "연제구", "중구", "서구", "사상구", "사하구"],
  경상: ["대구", "울산", "경남", "경북"],
  충청: ["대전", "세종", "충남", "충북"],
  전라: ["광주", "전남", "전북"],
  강원: ["춘천", "원주", "강릉"],
  제주: ["제주시", "서귀포시"]
} as const;

type RegionGroup = keyof typeof regionGroups;
type RegionOption = (typeof regionGroups)[RegionGroup][number];

type TrackItem = {
  id: string;
  title: string;
  type: "UPLOAD";
  url: string;
  fileKey?: string | null;
};

type VideoItem = {
  id: string;
  title: string;
  url: string;
};

type EquipmentItem = {
  id: string;
  category: "INSTRUMENT" | "GEAR";
  name: string;
};

type RateItem = {
  id: string;
  title: string;
  amount: string;
};

type PhotoItem = {
  url: string;
  fileKey?: string;
  isMain: boolean;
  sortOrder: number;
};

const roleLabelToValue = Object.fromEntries(roleOptions.map((role) => [role.label, role.value]));
const genreLabelToValue = Object.fromEntries(genreOptions.map((genre) => [genre.label, genre.value]));
const roleValueToLabel = Object.fromEntries(roleOptions.map((role) => [role.value, role.label]));
const genreValueToLabel = Object.fromEntries(genreOptions.map((genre) => [genre.value, genre.label]));

async function presignUpload(file: File, folder: string) {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, fileName: file.name, contentType: file.type })
  });
  if (!res.ok) throw new Error("PRESIGN_FAIL");
  return res.json();
}

async function uploadFile(file: File, folder: string) {
  const data = await presignUpload(file, folder);
  const uploadRes = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file
  });
  if (!uploadRes.ok) throw new Error("UPLOAD_FAIL");
  return { url: data.publicUrl as string, key: data.key as string };
}

async function compressImage(file: File) {
  const imageUrl = URL.createObjectURL(file);
  const image = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("IMAGE_LOAD_FAIL"));
  });
  image.src = imageUrl;
  await loaded;

  const maxSize = 900;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_FAIL");
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/jpeg", 0.8);
  });
  URL.revokeObjectURL(imageUrl);
  if (!blob) throw new Error("IMAGE_COMPRESS_FAIL");

  return new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" });
}

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
};

const getYoutubeId = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v") ?? "";
    }
    return "";
  } catch {
    return "";
  }
};

export default function ArtistDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [artist, setArtist] = useState<Artist | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<"all" | "audio" | "video">("all");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [dummyToast, setDummyToast] = useState<string | null>(null);
  const [trackProgress, setTrackProgress] = useState(0);
  const [waveforms, setWaveforms] = useState<Record<string, number[]>>({});
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [requestLink, setRequestLink] = useState("");
  const [requestLinks, setRequestLinks] = useState<string[]>([]);
  const [requestSending, setRequestSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [messageSending, setMessageSending] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [introExpanded, setIntroExpanded] = useState(false);
  const [editEnabled, setEditEnabled] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [stageNameDraft, setStageNameDraft] = useState("");
  const [shortIntroDraft, setShortIntroDraft] = useState("");
  const [averageWorkDurationDraft, setAverageWorkDurationDraft] = useState("");
  const [portfolioTextDraft, setPortfolioTextDraft] = useState("");
  const [rolesDraft, setRolesDraft] = useState<string[]>([]);
  const [mainGenreDraft, setMainGenreDraft] = useState<string | null>(null);
  const [subGenresDraft, setSubGenresDraft] = useState<string[]>([]);
  const [onlineAvailableDraft, setOnlineAvailableDraft] = useState(false);
  const [offlineAvailableDraft, setOfflineAvailableDraft] = useState(false);
  const [offlineRegionsDraft, setOfflineRegionsDraft] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<RegionGroup>("서울");
  const [ratesDraft, setRatesDraft] = useState<RateItem[]>([]);
  const [rateTitle, setRateTitle] = useState("");
  const [rateAmount, setRateAmount] = useState("");
  const [equipmentDraft, setEquipmentDraft] = useState<EquipmentItem[]>([]);
  const [equipmentCategory, setEquipmentCategory] = useState<EquipmentItem["category"]>("INSTRUMENT");
  const [equipmentName, setEquipmentName] = useState("");
  const [tracksDraft, setTracksDraft] = useState<TrackItem[]>([]);
  const [videosDraft, setVideosDraft] = useState<VideoItem[]>([]);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [photosDraft, setPhotosDraft] = useState<PhotoItem[]>([]);
  const [avatarUrlDraft, setAvatarUrlDraft] = useState<string | undefined>(undefined);
  const [avatarKeyDraft, setAvatarKeyDraft] = useState<string | undefined>(undefined);
  const [uploadingTrack, setUploadingTrack] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingTitle, setPendingTitle] = useState("");
  const [photosUploading, setPhotosUploading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{
    artistId: string;
    shortHelp: string;
    description: string;
    referenceLinks: string[];
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastFetchSlugRef = useRef<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [savedState, setSavedState] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/artists/${slug}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setArtist(data.artist);
        setSavedState(Boolean(data.artist?.isSaved));
        setSavedCount(Number.isFinite(data.artist?.savedCount) ? data.artist.savedCount : 0);
        setCurrentIndex(0);
      } catch {
        setNotFound(true);
      }
    };
    if (!slug) return;
    if (lastFetchSlugRef.current === slug) return;
    lastFetchSlugRef.current = slug;
    load();
  }, [slug]);

  useEffect(() => {
    if (!artist) return;
    const roleValues = (artist.roles ?? [])
      .map((role) => (roleLabelToValue[role] as string) ?? role)
      .filter(Boolean);
    const genreValues = (artist.genres ?? [])
      .map((genre) => (genreLabelToValue[genre] as string) ?? genre)
      .filter(Boolean);
    const mainValue = artist.mainGenre
      ? (genreLabelToValue[artist.mainGenre] as string) ?? artist.mainGenre
      : genreValues[0] ?? null;

    setStageNameDraft(artist.stageName ?? "");
    setShortIntroDraft(artist.shortIntro ?? "");
    setAverageWorkDurationDraft(artist.averageWorkDuration ?? "");
    setPortfolioTextDraft(artist.portfolioText ?? "");
    setRolesDraft(roleValues);
    setMainGenreDraft(mainValue);
    setSubGenresDraft(genreValues.filter((g) => g !== mainValue));
    setOnlineAvailableDraft(artist.onlineAvailable ?? false);
    setOfflineAvailableDraft(artist.offlineAvailable ?? false);
    setOfflineRegionsDraft(artist.offlineRegions ?? []);
    setRatesDraft(
      (artist.rates ?? []).map((rate) => ({
        id: rate.id,
        title: rate.title,
        amount: String(rate.amount)
      }))
    );
    setEquipmentDraft(
      (artist.equipment ?? []).map((item) => ({
        id: item.id,
        category: item.category,
        name: item.name
      }))
    );
    setTracksDraft(
      (artist.tracks ?? []).map((track) => ({
        id: track.id,
        title: track.title ?? "",
        type: "UPLOAD",
        url: track.url
      }))
    );
    setVideosDraft(
      (artist.videos ?? []).map((video) => ({
        id: video.id,
        title: video.title ?? "",
        url: video.url
      }))
    );
    setPhotosDraft(
      (artist.photos ?? []).map((photo, index) => ({
        url: photo.url,
        isMain: photo.isMain ?? index === 0,
        sortOrder: photo.sortOrder ?? index
      }))
    );
    setAvatarUrlDraft(artist.avatarUrl ?? undefined);
    setAvatarKeyDraft(undefined);
  }, [artist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => setActiveTrack(null);
    const handleTimeUpdate = () => {
      if (!audio.duration || Number.isNaN(audio.duration)) return;
      setTrackProgress(audio.currentTime / audio.duration);
    };
    const handleLoaded = () => {
      setTrackProgress(0);
    };
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoaded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    if (!dummyToast) return;
    const timer = setTimeout(() => setDummyToast(null), 1600);
    return () => clearTimeout(timer);
  }, [dummyToast]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!pendingRequest) return;
    submitRequest(pendingRequest);
    setPendingRequest(null);
    setLoginOpen(false);
  }, [pendingRequest, status]);

  const isOwner = Boolean(artist?.isOwner);
  const isEditing = (field: string) => editEnabled && editingField === field;
  const toggleRoleDraft = (value: string) => {
    setRolesDraft((prev) =>
      prev.includes(value) ? prev.filter((role) => role !== value) : [...prev, value]
    );
  };

  const selectMainGenreDraft = (value: string | null) => {
    setMainGenreDraft(value);
    setSubGenresDraft((prev) => prev.filter((genre) => genre !== value));
  };

  const toggleSubGenreDraft = (value: string) => {
    if (value === mainGenreDraft) return;
    setSubGenresDraft((prev) =>
      prev.includes(value) ? prev.filter((genre) => genre !== value) : [...prev, value]
    );
  };

  const toggleRegionDraft = (value: RegionOption) => {
    setOfflineRegionsDraft((prev) =>
      prev.includes(value) ? prev.filter((region) => region !== value) : [...prev, value]
    );
  };

  const addRate = () => {
    const title = rateTitle.trim();
    const normalized = rateAmount.replace(/[^\d]/g, "");
    const amount = Number(normalized);
    if (!title) {
      setSaveError("비용 제목을 입력하세요.");
      return;
    }
    if (!normalized || Number.isNaN(amount)) {
      setSaveError("가격은 숫자만 입력해주세요.");
      return;
    }
    if (ratesDraft.length >= 3) {
      setSaveError("비용은 최대 3개까지 등록할 수 있습니다.");
      return;
    }
    setRatesDraft((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title, amount: String(amount) }
    ]);
    setRateTitle("");
    setRateAmount("");
  };

  const removeRate = (id: string) => {
    setRatesDraft((prev) => prev.filter((rate) => rate.id !== id));
  };

  const addEquipment = () => {
    const name = equipmentName.trim();
    if (!name) return;
    setEquipmentDraft((prev) => [
      ...prev,
      { id: crypto.randomUUID(), category: equipmentCategory, name }
    ]);
    setEquipmentName("");
  };

  const removeEquipment = (id: string) => {
    setEquipmentDraft((prev) => prev.filter((item) => item.id !== id));
  };

  const isYouTubeUrl = (value: string) => {
    try {
      const url = new URL(value);
      if (url.hostname.includes("youtu.be")) return true;
      return url.hostname.includes("youtube.com");
    } catch {
      return false;
    }
  };

  const addVideo = () => {
    const url = videoUrl.trim();
    if (!url) return;
    if (!isYouTubeUrl(url)) {
      setSaveError("유튜브 링크만 추가할 수 있습니다.");
      return;
    }
    setVideosDraft((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: videoTitle.trim(), url }
    ]);
    setVideoTitle("");
    setVideoUrl("");
  };

  const removeVideo = (id: string) => {
    setVideosDraft((prev) => prev.filter((video) => video.id !== id));
  };

  const handlePhotosUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (photosDraft.length >= 5) return;
    setPhotosUploading(true);
    setSaveError(null);
    try {
      const fileList = Array.from(files).slice(0, 5 - photosDraft.length);
      const uploaded: PhotoItem[] = [];
      for (const file of fileList) {
        const compressed = await compressImage(file);
        const { url, key } = await uploadFile(compressed, "artists/photos");
        uploaded.push({
          url,
          fileKey: key,
          isMain: false,
          sortOrder: photosDraft.length + uploaded.length
        });
      }
      const next = [...photosDraft, ...uploaded].map((item, index) => ({
        ...item,
        sortOrder: index
      }));
      if (!next.some((item) => item.isMain) && next.length > 0) {
        next[0].isMain = true;
      }
      setPhotosDraft(next);
      setAvatarUrlDraft(next.find((item) => item.isMain)?.url ?? next[0]?.url);
    } catch {
      setSaveError("사진 업로드에 실패했습니다.");
    } finally {
      setPhotosUploading(false);
    }
  };

  const setMainPhoto = (index: number) => {
    setPhotosDraft((prev) =>
      prev.map((item, idx) => ({
        ...item,
        isMain: idx === index
      }))
    );
    const next = photosDraft.map((item, idx) => ({ ...item, isMain: idx === index }));
    setAvatarUrlDraft(next[index]?.url);
  };

  const movePhoto = (from: number, to: number) => {
    setPhotosDraft((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((p, idx) => ({ ...p, sortOrder: idx }));
    });
  };

  const removePhoto = (index: number) => {
    setPhotosDraft((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length > 0 && !next.some((item) => item.isMain)) {
        next[0].isMain = true;
      }
      setAvatarUrlDraft(next.find((item) => item.isMain)?.url ?? next[0]?.url);
      return next.map((p, idx) => ({ ...p, sortOrder: idx }));
    });
  };

  const handleUploadSelect = (file: File | null) => {
    if (!file) return;
    if (tracksDraft.length >= 3) {
      setSaveError("음원은 최대 3개까지 등록할 수 있습니다.");
      return;
    }
    if (file.type !== "audio/mpeg" && !file.name.toLowerCase().endsWith(".mp3")) {
      setSaveError("mp3 파일만 업로드할 수 있습니다.");
      return;
    }
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setSaveError("mp3 파일은 10MB 이하만 업로드할 수 있습니다.");
      return;
    }
    setPendingFile(file);
    setPendingTitle("");
    setUploadModalOpen(true);
  };

  const addUploadTrack = async () => {
    if (!pendingFile) return;
    if (tracksDraft.length >= 3) {
      setSaveError("음원은 최대 3개까지 등록할 수 있습니다.");
      return;
    }
    setUploadingTrack(true);
    setSaveError(null);
    try {
      const { url, key } = await uploadFile(pendingFile, "artists/tracks");
      setTracksDraft((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          title: pendingTitle.trim(),
          type: "UPLOAD",
          url,
          fileKey: key
        }
      ]);
      setPendingFile(null);
      setPendingTitle("");
      setUploadModalOpen(false);
    } catch {
      setSaveError("오디오 업로드에 실패했습니다.");
    } finally {
      setUploadingTrack(false);
    }
  };

  const removeTrack = (id: string) => {
    setTracksDraft((prev) => prev.filter((track) => track.id !== id));
  };

  const buildUpdatePayload = () => {
    if (!mainGenreDraft) {
      setSaveError("메인 장르를 선택해 주세요.");
      return null;
    }
    const genres = [mainGenreDraft, ...subGenresDraft].filter(Boolean);
    return {
      stageName: stageNameDraft.trim(),
      shortIntro: shortIntroDraft.trim() || undefined,
      roles: rolesDraft,
      genres,
      mainGenre: mainGenreDraft,
      onlineAvailable: onlineAvailableDraft,
      offlineAvailable: offlineAvailableDraft,
      offlineRegions: offlineAvailableDraft ? offlineRegionsDraft : [],
      averageWorkDuration: averageWorkDurationDraft.trim() || undefined,
      portfolioText: portfolioTextDraft.trim() || undefined,
      portfolioLinks: artist?.portfolioLinks ?? [],
      avatarUrl: avatarUrlDraft ?? artist?.avatarUrl ?? undefined,
      avatarKey: avatarKeyDraft ?? undefined,
      tracks: tracksDraft.length
        ? tracksDraft.map((track) => ({
            title: track.title || undefined,
            sourceType: track.type,
            url: track.url,
            fileKey: track.fileKey || undefined
          }))
        : undefined,
      videos: videosDraft.length
        ? videosDraft.map((video) => ({
            title: video.title || undefined,
            url: video.url
          }))
        : undefined,
      equipment: equipmentDraft.length
        ? equipmentDraft.map((item, index) => ({
            category: item.category,
            name: item.name,
            sortOrder: index
          }))
        : undefined,
      rates: ratesDraft.length
        ? ratesDraft.map((rate, index) => ({
            title: rate.title,
            amount: Number(rate.amount),
            sortOrder: index
          }))
        : undefined,
      photos: photosDraft.length ? photosDraft : undefined
    };
  };

  const refreshArtist = async () => {
    if (!slug) return;
    const res = await fetch(`/api/artists/${slug}`);
    if (!res.ok) return;
    const data = await res.json();
    setArtist(data.artist);
    setSavedState(Boolean(data.artist?.isSaved));
    setSavedCount(Number.isFinite(data.artist?.savedCount) ? data.artist.savedCount : 0);
  };

  const toggleSave = async () => {
    if (!artist) return;
    if (status !== "authenticated") {
      setLoginOpen(true);
      return;
    }
    try {
      const res = await fetch(`/api/artists/${artist.slug}/save`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      setSavedState(Boolean(data.isSaved));
      setSavedCount(Number.isFinite(data.savedCount) ? data.savedCount : 0);
    } catch {
      // ignore
    }
  };

  const saveProfile = async (field: string) => {
    if (!isOwner) return;
    const payload = buildUpdatePayload();
    if (!payload) return;
    setSavingField(field);
    setSaveError(null);
    try {
      const res = await fetch("/api/me/artist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.error === "UNAUTHORIZED") {
          setLoginOpen(true);
          return;
        }
        const fieldErrors = data?.error?.fieldErrors;
        const fieldMessage =
          fieldErrors && typeof fieldErrors === "object"
            ? Object.values(fieldErrors).flat().filter(Boolean).join(" / ")
            : null;
        setSaveError(fieldMessage ? `입력 오류: ${fieldMessage}` : "수정에 실패했습니다.");
        return;
      }
      await refreshArtist();
      setEditingField(null);
    } catch {
      setSaveError("수정에 실패했습니다.");
    } finally {
      setSavingField(null);
    }
  };

  const tracks = isEditing("portfolio") ? tracksDraft : artist?.tracks ?? [];
  const videos = isEditing("portfolio") ? videosDraft : artist?.videos ?? [];
  const photos = isEditing("photos") ? photosDraft : artist?.photos ?? [];
  const reviewCount = artist?.reviews?.length ?? 0;
  const avgRating = artist?.reviews?.length
    ? Math.round(
        (artist.reviews.reduce((acc, review) => acc + review.rating, 0) /
          artist.reviews.length) *
          10
      ) / 10
    : null;
  const stats = artist?.stats;
  const responseRateLabel =
    stats?.responseRate !== null && stats?.responseRate !== undefined
      ? `${stats.responseRate}%`
      : "- %";
  const responseTimeLabel =
    stats?.responseTimeMinutes !== null && stats?.responseTimeMinutes !== undefined
      ? `${stats.responseTimeMinutes}분`
      : "-시간";
  const completedCountLabel =
    stats?.completedCount !== null && stats?.completedCount !== undefined
      ? `${stats.completedCount}`
      : "0";
  const saved = savedState;
  const rolesText = isEditing("roles")
    ? rolesDraft.map((role) => roleValueToLabel[role] ?? role).join(" · ")
    : artist?.roles?.join(" · ");
  const mainGenre = isEditing("genres")
    ? genreValueToLabel[mainGenreDraft ?? ""] ?? artist?.mainGenre ?? artist?.genres?.[0]
    : artist?.mainGenre ?? artist?.genres?.[0];
  const locationLabel = isEditing("regions")
    ? offlineAvailableDraft
      ? offlineRegionsDraft[0] ?? "지역 미지정"
      : "온라인"
    : artist?.offlineAvailable
      ? artist.offlineRegions?.[0] ?? "지역 미지정"
      : "온라인";
  const joinedAt = formatDate(artist?.joinedAt ?? artist?.createdAt);

  useEffect(() => {
    if (!tracks.length) return;
    const controller = new AbortController();

    const loadWaveform = async (track: { id: string; url: string }) => {
      if (waveforms[track.id]) return;
      try {
        const res = await fetch(track.url, { signal: controller.signal });
        const arrayBuffer = await res.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const samples = 48;
        const blockSize = Math.floor(channelData.length / samples);
        const peaks: number[] = [];
        for (let i = 0; i < samples; i += 1) {
          let sum = 0;
          const start = i * blockSize;
          for (let j = 0; j < blockSize; j += 1) {
            sum += Math.abs(channelData[start + j] || 0);
          }
          peaks.push(Math.min(1, sum / blockSize));
        }
        audioContext.close();
        setWaveforms((prev) => ({ ...prev, [track.id]: peaks }));
      } catch {
        const fallback = Array.from({ length: 48 }).map((_, idx) =>
          Math.min(1, 0.2 + ((idx * 13) % 20) / 30)
        );
        setWaveforms((prev) => ({ ...prev, [track.id]: fallback }));
      }
    };

    tracks.forEach((track) => {
      void loadWaveform(track);
    });

    return () => {
      controller.abort();
    };
  }, [tracks, waveforms]);

  const renderWaveform = (trackId: string, isActive: boolean) => {
    const peaks = waveforms[trackId] ?? Array.from({ length: 48 }).map(() => 0.3);
    const progress = isActive ? Math.max(0, Math.min(1, trackProgress)) : 0;
    return (
      <div className="relative h-8 w-full overflow-hidden">
        <div className="flex h-8 items-end gap-1">
          {peaks.map((peak, idx) => (
            <span
              key={`base-${trackId}-${idx}`}
              className="w-1 rounded-full bg-[#c7c7cf]"
              style={{ height: `${Math.max(4, Math.round(peak * 28))}px` }}
            />
          ))}
        </div>
        {isActive && (
          <div
            className="absolute left-0 top-0 h-full overflow-hidden"
            style={{ width: `${progress * 100}%` }}
          >
            <div className="flex h-8 items-end gap-1">
              {peaks.map((peak, idx) => (
                <span
                  key={`active-${trackId}-${idx}`}
                  className="w-1 rounded-full bg-[#23D3FF]"
                  style={{ height: `${Math.max(4, Math.round(peak * 28))}px` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };


  if (notFound) {
    return (
      <div className="flex min-h-screen w-full overflow-hidden bg-[#151a22]">
        <AppSidebar active="home" />
        <div className="flex-1">
          <div className="mx-auto max-w-5xl px-6 pb-16 pt-12">
            <h1 className="text-2xl font-semibold">아티스트를 찾을 수 없습니다</h1>
            <Link href="/" className="mt-4 inline-block text-sm text-[#23D3FF]">
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!artist) return null;
  const visibleTracks = filter === "video" ? [] : tracks;
  const visibleVideos = filter === "audio" ? [] : videos;

  const playTrack = (track: { id: string; url: string }, index?: number) => {
    if (!audioRef.current) return;
    if (activeTrack === track.id) {
      audioRef.current.pause();
      setActiveTrack(null);
      return;
    }
    audioRef.current.src = track.url;
    audioRef.current.play().catch(() => {});
    setActiveTrack(track.id);
    setTrackProgress(0);
    if (typeof index === "number") setCurrentIndex(index);
  };

  const addRequestLink = () => {
    const url = requestLink.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      setRequestError("올바른 링크를 입력해주세요.");
      return;
    }
    setRequestLinks((prev) => [...prev, url]);
    setRequestLink("");
    setRequestError(null);
  };

  const removeRequestLink = (link: string) => {
    setRequestLinks((prev) => prev.filter((item) => item !== link));
  };

  const presignMessageUpload = async (file: File) => {
    const res = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folder: "messages",
        fileName: file.name,
        contentType: file.type || "application/octet-stream"
      })
    });
    if (!res.ok) throw new Error("PRESIGN_FAIL");
    return res.json();
  };

  const uploadMessageFile = async (file: File) => {
    const data = await presignMessageUpload(file);
    const uploadRes = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file
    });
    if (!uploadRes.ok) throw new Error("UPLOAD_FAIL");
    return { url: data.publicUrl as string, key: data.key as string };
  };

  const submitRequest = async (payload: {
    artistId: string;
    shortHelp: string;
    description: string;
    referenceLinks: string[];
  }) => {
    setRequestSending(true);
    setRequestError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.error === "UNAUTHORIZED") {
          setPendingRequest(payload);
          setLoginOpen(true);
          return;
        }
        throw new Error("REQUEST_FAIL");
      }
      setRequestOpen(false);
      setRequestTitle("");
      setRequestBody("");
      setRequestLinks([]);
      setDummyToast("작업 요청이 전송되었습니다.");
    } catch {
      setRequestError("작업 요청 전송에 실패했습니다.");
    } finally {
      setRequestSending(false);
    }
  };

  const handleRequestSubmit = async () => {
    if (!artist) return;
    const payload = {
      artistId: artist.id,
      shortHelp: requestTitle.trim(),
      description: requestBody.trim(),
      referenceLinks: requestLinks
    };
    if (!payload.shortHelp || !payload.description) {
      setRequestError("필수 항목을 입력해주세요.");
      return;
    }
    if (!session?.user?.id) {
      setPendingRequest(payload);
      setLoginOpen(true);
      return;
    }
    await submitRequest(payload);
  };

  const handleMessageSubmit = async () => {
    if (!artist) return;
    if (!messageText.trim() && !messageFile) {
      setMessageError("메시지 또는 파일을 입력해주세요.");
      return;
    }
    if (messageFile && messageFile.size > 10 * 1024 * 1024) {
      setMessageError("첨부 파일은 10MB 이하만 가능합니다.");
      return;
    }
    if (!session?.user?.id) {
      setLoginOpen(true);
      return;
    }
    setMessageSending(true);
    setMessageError(null);
    try {
      let attachmentUrl: string | undefined;
      let attachmentKey: string | undefined;
      if (messageFile) {
        const uploaded = await uploadMessageFile(messageFile);
        attachmentUrl = uploaded.url;
        attachmentKey = uploaded.key;
      }
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          body: messageText.trim() || "파일을 보냈습니다.",
          attachmentUrl,
          attachmentKey,
          attachmentName: messageFile?.name,
          attachmentType: messageFile?.type,
          attachmentSize: messageFile?.size
        })
      });
      if (!res.ok) throw new Error("SEND_FAIL");
      const data = await res.json();
      setMessageOpen(false);
      setMessageText("");
      setMessageFile(null);
      router.push(`/messages?thread=${data.threadId}`);
    } catch {
      setMessageError("메시지 전송에 실패했습니다.");
    } finally {
      setMessageSending(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#151a22] text-[#e7e9ee]">
      <AppSidebar active="home" />
      <div className="flex-1">
        <main className="w-full max-w-none px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center gap-4 px-1">
            <h1 className="text-3xl font-bold">아티스트 프로필</h1>
            {isOwner && (
              <button
                type="button"
                onClick={() =>
                  setEditEnabled((prev) => {
                    if (prev) {
                      setEditingField(null);
                      return false;
                    }
                    return true;
                  })
                }
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  editEnabled
                    ? "border-[#1d110c] bg-[#1d110c] text-white"
                    : "border-[#232936] bg-[#151a22] text-[#e7e9ee]"
                )}
              >
                {editEnabled ? "수정 종료" : "수정"}
              </button>
            )}
          </div>
          {saveError && (
            <p className="mb-6 px-1 text-sm text-red-500">{saveError}</p>
          )}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <aside className="flex flex-col gap-6 lg:col-span-4 xl:col-span-3">
            <div className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-[#151a22] pb-6 text-center shadow-[0_4px_20px_-2px_rgba(29,17,12,0.05)]">
              <div className="relative mb-5 w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#23D3FF]/18 to-transparent" />
                <div className="relative aspect-square w-full overflow-hidden">
                {(isEditing("photos") ? avatarUrlDraft ?? artist.avatarUrl : artist.avatarUrl) ? (
                  <img
                    src={isEditing("photos") ? avatarUrlDraft ?? artist.avatarUrl : artist.avatarUrl}
                    alt={`${artist.stageName} 프로필`}
                    className="h-full w-full object-cover"
                  />
                ) : null}
                {artist.onlineAvailable ? (
                  <div className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-green-500">
                    <span className="sr-only">온라인 가능</span>
                  </div>
                ) : null}
                {avgRating !== null && (
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-white/80 bg-[#151a22]/90 px-3 py-1 text-sm text-[#e7e9ee] shadow">
                    <span className="text-base text-[#23D3FF]">★</span>
                    <span className="font-semibold">
                      {avgRating}
                      <span className="ml-1 text-sm text-[#23D3FF]">({reviewCount})</span>
                    </span>
                  </div>
                )}
              </div>
              {isEditing("photos") ? (
                <>
                  <label className="absolute bottom-3 left-3 cursor-pointer rounded-lg bg-[#151a22]/90 px-3 py-2 text-xs font-semibold text-[#e7e9ee] shadow">
                    파일 선택
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handlePhotosUpload(event.target.files)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => saveProfile("photos")}
                    className="absolute bottom-3 right-3 rounded-lg bg-[#151a22]/90 px-3 py-2 text-xs font-semibold text-[#ff4800] shadow"
                  >
                    {savingField === "photos" ? "저장 중..." : "수정 완료"}
                  </button>
                </>
              ) : editEnabled ? (
                <button
                  type="button"
                  onClick={() => setEditingField("photos")}
                  className="absolute bottom-3 left-3 rounded-lg bg-[#151a22]/90 px-3 py-2 text-xs font-semibold text-[#ff4800] shadow"
                >
                  수정하기
                </button>
              ) : null}
              </div>
              {isEditing("basic") ? (
                <div className="w-full px-6">
                  <Input
                    value={stageNameDraft}
                    onChange={(event) => setStageNameDraft(event.target.value)}
                    className="h-12 text-center text-lg font-semibold"
                  />
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {roleOptions.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => toggleRoleDraft(role.value)}
                        className={cn(
                          "rounded-lg border px-3 py-1 text-sm",
                          rolesDraft.includes(role.value)
                            ? "border-[#23D3FF] text-[#e7e9ee]"
                            : "border-[#232936] text-[#c1c7d3]"
                        )}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={shortIntroDraft}
                    onChange={(event) => setShortIntroDraft(event.target.value)}
                    className="mt-4 min-h-[100px] text-base"
                    maxLength={50}
                    placeholder="나를 한 마디로 소개해 주세요."
                  />
                  <div className="mt-4 text-left">
                    <p className="text-sm font-semibold text-[#23D3FF]">장르 선택</p>
                    {!mainGenreDraft ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {genreOptions.map((genre) => (
                          <button
                            key={genre.value}
                            type="button"
                            onClick={() => selectMainGenreDraft(genre.value)}
                            className="rounded-lg border border-[#232936] px-2 py-1 text-sm text-[#c1c7d3]"
                          >
                            {genre.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 text-sm text-[#c1c7d3]">
                          메인 장르:{" "}
                          <span className="font-semibold text-[#e7e9ee]">
                            {genreValueToLabel[mainGenreDraft]}
                          </span>
                          <button
                            type="button"
                            onClick={() => selectMainGenreDraft(null)}
                            className="ml-2 text-sm text-[#c1c7d3]"
                          >
                            메인 변경
                          </button>
                        </p>
                        <p className="mt-2 text-sm text-[#c1c7d3]">서브 장르를 선택해 주세요.</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {genreOptions
                            .filter((genre) => genre.value !== mainGenreDraft)
                            .map((genre) => (
                              <button
                                key={genre.value}
                                type="button"
                                onClick={() => toggleSubGenreDraft(genre.value)}
                                className={cn(
                                  "rounded-lg border px-2 py-1 text-sm",
                                  subGenresDraft.includes(genre.value)
                                    ? "border-[#23D3FF] text-[#e7e9ee]"
                                    : "border-[#232936] text-[#c1c7d3]"
                                )}
                              >
                                {genre.label}
                              </button>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => saveProfile("basic")}
                    className="mt-4 w-full rounded-lg border border-[#232936] px-3 py-2 text-base font-semibold text-[#ff4800]"
                  >
                    {savingField === "basic" ? "저장 중..." : "수정 완료"}
                  </button>
                </div>
              ) : (
                <div className="flex w-full flex-col items-center gap-2 px-6">
                  <h1 className="text-3xl font-bold text-[#e7e9ee]">{artist.stageName}</h1>
                  <p className="text-base font-medium text-[#23D3FF]">
                    {rolesText || "세션 뮤지션"}
                  </p>
                  {artist?.shortIntro ? (
                    <p className="text-base text-[#c1c7d3]">{artist.shortIntro}</p>
                  ) : null}
                  {mainGenre ? (
                    <p className="text-sm text-[#c1c7d3]">
                      {mainGenre}
                      {artist?.genres && artist.genres.length > 1
                        ? ` · ${artist.genres.slice(1).join(" · ")}`
                        : ""}
                    </p>
                  ) : null}
                  {editEnabled ? null : null}
                </div>
              )}
              <div className="mt-6 w-full px-4">
                {editEnabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing("basic")) {
                        saveProfile("basic");
                      } else {
                        setEditingField("basic");
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#232936] bg-[#151a22] px-4 py-3 text-base font-semibold text-[#ff4800]"
                  >
                    {isEditing("basic") ? "수정 완료" : "수정하기"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setRequestOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#23D3FF] px-4 py-3 text-base font-semibold text-[#151a22]"
                    >
                      작업 요청 보내기
                    </button>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setMessageOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#232936] bg-[#151a22] px-4 py-3 text-base font-semibold text-[#e7e9ee]"
                      >
                        <MessageSquare className="h-5 w-5" />
                        메시지
                      </button>
                      <button
                        type="button"
                        onClick={toggleSave}
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-base font-semibold transition",
                          saved
                            ? "border-[#1d110c] bg-[#1d110c] text-white"
                            : "border-[#232936] bg-[#151a22] text-[#e7e9ee]"
                        )}
                        aria-pressed={saved}
                      >
                        <Bookmark className="h-5 w-5" />
                        {saved ? "저장됨" : "저장"}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 w-full space-y-4 border-t border-[#232936] px-4 pt-6 text-left text-base">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#23D3FF] text-base">비용</span>
                  </div>
                  {isEditing("rates") ? (
                    <>
                      <div className="grid gap-2">
                        {ratesDraft.length === 0 ? (
                          <p className="text-sm text-[#e7e9ee]">등록된 비용이 없습니다.</p>
                        ) : (
                          ratesDraft.map((rate) => (
                            <div
                              key={rate.id}
                              className="flex items-center justify-between rounded-lg border border-[#232936] px-3 py-2 text-base"
                            >
                              <span>
                                {rate.title} · {Number(rate.amount).toLocaleString()}원
                              </span>
                              <button
                                type="button"
                                onClick={() => removeRate(rate.id)}
                                className="text-xs text-[#c1c7d3]"
                              >
                                삭제
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="grid gap-2 pt-2">
                        <Input
                          value={rateTitle}
                          onChange={(event) => setRateTitle(event.target.value)}
                          placeholder="비용 제목"
                          className="h-12 text-base"
                        />
                        <Input
                          value={rateAmount}
                          onChange={(event) => setRateAmount(event.target.value)}
                          placeholder="가격"
                          className="h-12 text-base"
                        />
                        <Button type="button" onClick={addRate} className="h-12 text-base">
                          추가
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() => saveProfile("rates")}
                        className="mt-3 w-full rounded-lg border border-[#232936] px-3 py-2 text-base font-semibold text-[#ff4800]"
                      >
                        {savingField === "rates" ? "저장 중..." : "수정 완료"}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      {artist.rates && artist.rates.length > 0 ? (
                        <span className="text-right text-base font-semibold">
                          {artist.rates
                            .map((rate) => `${rate.title} ${rate.amount.toLocaleString()}원`)
                            .join(" · ")}
                        </span>
                      ) : (
                        <span className="text-base text-[#e7e9ee]">등록된 비용이 없습니다.</span>
                      )}
                      {editEnabled && (
                        <button
                          type="button"
                          onClick={() => setEditingField("rates")}
                          className="text-sm font-semibold text-[#ff4800]"
                        >
                          수정하기
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <span className="text-[#23D3FF] text-base">활동 지역</span>
                  {isEditing("regions") ? (
                    <>
                      <div className="flex items-center gap-4 text-base">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={onlineAvailableDraft}
                            onChange={(event) => setOnlineAvailableDraft(event.target.checked)}
                          />
                          온라인
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={offlineAvailableDraft}
                            onChange={(event) => setOfflineAvailableDraft(event.target.checked)}
                          />
                          오프라인
                        </label>
                      </div>
                      {offlineAvailableDraft && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {Object.keys(regionGroups).map((group) => (
                              <button
                                key={group}
                                type="button"
                                onClick={() => setSelectedGroup(group as RegionGroup)}
                                className={cn(
                                  "rounded-lg border px-2 py-1 text-sm",
                                  selectedGroup === group
                                    ? "border-[#23D3FF] text-[#e7e9ee]"
                                    : "border-[#232936] text-[#c1c7d3]"
                                )}
                              >
                                {group}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {regionGroups[selectedGroup].map((region) => (
                              <button
                                key={region}
                                type="button"
                                onClick={() => toggleRegionDraft(region)}
                                className={cn(
                                  "rounded-lg border px-2 py-1 text-sm",
                                  offlineRegionsDraft.includes(region)
                                    ? "border-[#23D3FF] text-[#e7e9ee]"
                                    : "border-[#232936] text-[#c1c7d3]"
                                )}
                              >
                                {region}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => saveProfile("regions")}
                        className="mt-3 w-full rounded-lg border border-[#232936] px-3 py-2 text-base font-semibold text-[#ff4800]"
                      >
                        {savingField === "regions" ? "저장 중..." : "수정 완료"}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-base">{locationLabel}</span>
                      {editEnabled && (
                        <button
                          type="button"
                          onClick={() => setEditingField("regions")}
                          className="text-sm font-semibold text-[#ff4800]"
                        >
                          수정하기
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <span className="text-[#23D3FF] text-base">평균 작업기간</span>
                  {isEditing("duration") ? (
                    <>
                      <Input
                        value={averageWorkDurationDraft}
                        onChange={(event) => setAverageWorkDurationDraft(event.target.value)}
                        className="h-12 text-base"
                        placeholder="예: 3~5일"
                      />
                      <button
                        type="button"
                        onClick={() => saveProfile("duration")}
                        className="mt-3 w-full rounded-lg border border-[#232936] px-3 py-2 text-base font-semibold text-[#ff4800]"
                      >
                        {savingField === "duration" ? "저장 중..." : "수정 완료"}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-base">{artist?.averageWorkDuration || "-"}</span>
                      {editEnabled && (
                        <button
                          type="button"
                          onClick={() => setEditingField("duration")}
                          className="text-sm font-semibold text-[#ff4800]"
                        >
                          수정하기
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#23D3FF] text-base">가입 시기</span>
                  <span className="font-medium text-base text-[#e7e9ee]">{joinedAt || "-"}</span>
                </div>
              </div>
              
            </div>

            <div className="rounded-2xl bg-[#151a22] p-6 shadow-[0_4px_20px_-2px_rgba(29,17,12,0.05)]">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#23D3FF]">
                응답 지표
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-[#232936] bg-[#151a22] p-3">
                  <div className="text-2xl font-bold text-[#e7e9ee]">{responseRateLabel}</div>
                  <div className="text-xs text-[#23D3FF]">응답률</div>
                </div>
                <div className="rounded-xl border border-[#232936] bg-[#151a22] p-3">
                  <div className="text-2xl font-bold text-[#e7e9ee]">{responseTimeLabel}</div>
                  <div className="text-xs text-[#23D3FF]">평균 응답 시간</div>
                </div>
                <div className="col-span-2 flex items-center justify-between rounded-xl border border-[#232936] bg-[#151a22] p-3">
                  <div>
                    <div className="text-2xl font-bold text-[#e7e9ee]">
                      {completedCountLabel}
                    </div>
                    <div className="text-xs text-[#23D3FF]">완료 건수</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                    ✓
                  </div>
                </div>
              </div>
            </div>

            
          </aside>

          <section className="flex flex-col gap-8 lg:col-span-8 xl:col-span-9">
            <div className="rounded-xl bg-[#151a22] p-8 shadow-[0_12px_30px_-16px_rgba(29,17,12,0.25)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">소개</h2>
                {editEnabled &&
                  (isEditing("intro") ? (
                    <button
                      type="button"
                      onClick={() => saveProfile("intro")}
                      className="rounded-lg border border-[#232936] px-3 py-2 text-sm font-semibold text-[#ff4800]"
                    >
                      {savingField === "intro" ? "저장 중..." : "수정 완료"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingField("intro")}
                      className="rounded-lg border border-[#232936] px-3 py-2 text-sm font-semibold text-[#ff4800]"
                    >
                      수정하기
                    </button>
                  ))}
              </div>
              {isEditing("intro") ? (
                <Textarea
                  value={portfolioTextDraft}
                  onChange={(event) => setPortfolioTextDraft(event.target.value)}
                  className="mt-4 min-h-[200px] text-base"
                  placeholder="소개 내용을 입력해 주세요."
                />
              ) : (
                <>
                  <div
                    className={cn(
                      "mt-4 text-base leading-7 text-[#c1c7d3]",
                      !introExpanded && "max-h-[12rem] overflow-hidden"
                    )}
                  >
                    {artist.portfolioText ? (
                      <p className="whitespace-pre-line">{artist.portfolioText}</p>
                    ) : (
                      <p className="text-[#23D3FF]">작성된 소개가 없습니다.</p>
                    )}
                  </div>
                  {artist.portfolioText ? (
                    <button
                      type="button"
                      onClick={() => setIntroExpanded((prev) => !prev)}
                      className="mt-4 text-sm font-semibold text-[#23D3FF] hover:underline"
                    >
                      {introExpanded ? "접기" : "더보기"}
                    </button>
                  ) : null}
                </>
              )}
            </div>

            <div className="rounded-xl bg-[#151a22] p-8 shadow-[0_12px_30px_-16px_rgba(29,17,12,0.25)]">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">포트폴리오</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "all", label: "전체" },
                    { id: "audio", label: "오디오" },
                    { id: "video", label: "비디오" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFilter(item.id as typeof filter)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-sm font-medium transition",
                        filter === item.id
                          ? "bg-[#23D3FF] text-white"
                          : "border border-transparent bg-[#151a22] text-[#23D3FF] hover:border-[#232936]"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                  {editEnabled &&
                    (isEditing("portfolio") ? (
                      <button
                        type="button"
                        onClick={() => saveProfile("portfolio")}
                        className="rounded-xl border border-[#232936] bg-[#151a22] px-4 py-1.5 text-sm font-semibold text-[#ff4800]"
                      >
                        {savingField === "portfolio" ? "저장 중..." : "수정 완료"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingField("portfolio")}
                        className="rounded-xl border border-[#232936] bg-[#151a22] px-4 py-1.5 text-sm font-semibold text-[#ff4800]"
                      >
                        수정하기
                      </button>
                    ))}
                </div>
              </div>

              {isEditing("portfolio") && (
                <div className="mb-6 rounded-lg border border-dashed border-[#232936] bg-[#10141b] px-4 py-6">
                  <p className="text-sm font-semibold">mp3 업로드</p>
                  <label className="mt-4 block cursor-pointer rounded-lg border border-[#232936] px-4 py-4 text-center text-sm text-[#c7ccd6] hover:bg-[#151a22]">
                    파일 선택
                    <input
                      type="file"
                      accept="audio/mpeg"
                      className="hidden"
                      onChange={(event) => handleUploadSelect(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              )}

              {visibleTracks.length > 0 && (
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {visibleTracks.map((track, index) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => playTrack(track, index)}
                      className="flex w-full items-center gap-4 rounded-lg border border-[#232936] bg-[#151a22] p-4 text-left transition hover:border-[#23D3FF]/50"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#23D3FF] bg-[#151a22] text-[#23D3FF] shadow-md">
                        {activeTrack === track.id ? (
                          <span className="flex h-full w-full items-center justify-center rotate-90 text-2xl font-bold text-[#23D3FF]">
                            ＝
                          </span>
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xl text-[#23D3FF]">
                            ▶
                          </span>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-base font-semibold text-[#e7e9ee]">
                            {track.title || "대표 트랙"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[#23D3FF]">
                            <span>mp3</span>
                            {isEditing("portfolio") && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeTrack(track.id);
                                }}
                                className="text-xs text-[#c1c7d3]"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          {renderWaveform(track.id, activeTrack === track.id)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {isEditing("portfolio") && (
                <div className="mb-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <Input
                    value={videoTitle}
                    onChange={(event) => setVideoTitle(event.target.value)}
                    placeholder="영상 제목"
                    className="h-12"
                  />
                  <Input
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                    placeholder="유튜브 링크"
                    className="h-12"
                  />
                  <Button type="button" onClick={addVideo} className="h-12">
                    추가
                  </Button>
                </div>
              )}

              {visibleVideos.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {visibleVideos.map((video) => {
                    const videoId = getYoutubeId(video.url);
                    const thumb = videoId
                      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                      : "";
                    const isActive = activeVideoId === video.id;
                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => {
                          if (!videoId) return;
                          setActiveVideoId((prev) => (prev === video.id ? null : video.id));
                        }}
                        className="group relative aspect-video overflow-hidden rounded-lg text-left"
                      >
                        {thumb ? (
                          <>
                            {isActive ? (
                              <iframe
                                className="h-full w-full"
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                                title={video.title || "유튜브 영상"}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <img
                                src={thumb}
                                alt={video.title || "유튜브 영상"}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            )}
                          </>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#151a22] text-sm text-[#23D3FF]">
                            썸네일 없음
                          </div>
                        )}
                        {!isActive && (
                          <>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/60 bg-[#151a22]/20 text-white">
                                ▶
                              </div>
                            </div>
                            <div className="absolute bottom-3 left-3">
                              <p className="text-sm font-semibold text-white drop-shadow">
                                {video.title || "유튜브 영상"}
                              </p>
                            </div>
                          </>
                        )}
                        {isEditing("portfolio") && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              removeVideo(video.id);
                            }}
                            className="absolute right-3 top-3 rounded-full bg-[#151a22]/80 px-3 py-1 text-xs text-[#e7e9ee]"
                          >
                            삭제
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {visibleTracks.length === 0 && visibleVideos.length === 0 && (
                <p className="text-sm text-[#23D3FF]">등록된 포트폴리오가 없습니다.</p>
              )}
              <audio ref={audioRef} className="hidden" />
            </div>

            <div className="rounded-xl bg-[#151a22] p-8 shadow-[0_12px_30px_-16px_rgba(29,17,12,0.25)]">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">장비</h2>
                {editEnabled &&
                  (isEditing("equipment") ? (
                    <button
                      type="button"
                      onClick={() => saveProfile("equipment")}
                      className="rounded-lg border border-[#232936] px-3 py-2 text-sm font-semibold text-[#ff4800]"
                    >
                      {savingField === "equipment" ? "저장 중..." : "수정 완료"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingField("equipment")}
                      className="rounded-lg border border-[#232936] px-3 py-2 text-sm font-semibold text-[#ff4800]"
                    >
                      수정하기
                    </button>
                  ))}
              </div>
              {isEditing("equipment") && (
                <div className="mb-6 grid gap-3 md:grid-cols-[160px_1fr_auto]">
                  <select
                    value={equipmentCategory}
                    onChange={(event) =>
                      setEquipmentCategory(event.target.value as EquipmentItem["category"])
                    }
                    className="h-12 rounded-lg border border-[#232936] px-3 text-base"
                  >
                    <option value="INSTRUMENT">악기</option>
                    <option value="GEAR">하드웨어</option>
                  </select>
                  <Input
                    value={equipmentName}
                    onChange={(event) => setEquipmentName(event.target.value)}
                    placeholder="예: Fender Stratocaster"
                    className="h-12 text-base"
                  />
                  <Button type="button" onClick={addEquipment} className="h-12 text-base">
                    추가
                  </Button>
                </div>
              )}
              {equipmentDraft.length > 0 ? (
                <div className="grid grid-cols-1 gap-y-4 md:grid-cols-2 md:gap-x-8">
                  {(["INSTRUMENT", "GEAR"] as const).map((category) => {
                    const items = equipmentDraft.filter((item) => item.category === category);
                    if (items.length === 0) return null;
                    return (
                      <div key={category}>
                        <h3 className="mb-3 text-base font-semibold uppercase tracking-wider text-[#23D3FF]">
                          {category === "INSTRUMENT" ? "악기" : "하드웨어"}
                        </h3>
                        <ul className="space-y-2 text-base text-[#c1c7d3]">
                          {items.map((item) => (
                            <li key={item.id} className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#23D3FF]" />
                              <span>{item.name}</span>
                              {isEditing("equipment") && (
                                <button
                                  type="button"
                                  onClick={() => removeEquipment(item.id)}
                                  className="ml-2 text-sm text-[#c1c7d3]"
                                >
                                  삭제
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#23D3FF]">등록된 하드웨어가 없습니다.</p>
              )}
            </div>

            <div className="rounded-xl bg-[#151a22] p-8 shadow-[0_12px_30px_-16px_rgba(29,17,12,0.25)]">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">클라이언트 리뷰</h2>
                {avgRating !== null ? (
                  <div className="flex items-center gap-2 text-sm text-[#23D3FF]">
                    <span className="text-lg font-bold text-[#e7e9ee]">{avgRating}</span>
                    <span>리뷰 {reviewCount}개</span>
                  </div>
                ) : null}
              </div>
              {artist.reviews && artist.reviews.length > 0 ? (
                <div className="space-y-6">
                  {artist.reviews.map((review) => (
                    <div key={review.id} className="border-b border-[#232936] pb-6 last:border-0 last:pb-0">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-full bg-[#f1e9e6]">
                            {review.authorAvatarUrl ? (
                              <img
                                src={review.authorAvatarUrl}
                                alt={review.authorName}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{review.authorName}</p>
                            <p className="text-xs text-[#23D3FF]">{review.authorRole}</p>
                          </div>
                        </div>
                        <span className="text-xs text-[#23D3FF]">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <div className="mb-2 text-sm text-[#23D3FF]">
                        {"★".repeat(Math.max(1, review.rating))}
                      </div>
                      <p className="text-sm text-[#c1c7d3]">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#23D3FF]">등록된 리뷰가 없습니다.</p>
              )}
            </div>
          </section>
        </div>
      </main>

      {dummyToast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg border border-red-300 bg-[#151a22] px-6 py-3 text-sm text-red-500 shadow-subtle">
          {dummyToast}
        </div>
      )}

      {requestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#151a22] p-6 shadow-subtle">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">작업 요청 보내기</h3>
              <button
                type="button"
                onClick={() => setRequestOpen(false)}
                className="text-sm text-muted"
              >
                닫기
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-[#e7e9ee]">
                  무엇을 도와드릴까요?
                </label>
                <Input
                  value={requestTitle}
                  onChange={(event) => setRequestTitle(event.target.value)}
                  placeholder="짧게 요약해 주세요."
                  className="mt-2 h-12 text-base"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#e7e9ee]">
                  당신의 프로젝트에 대해 설명해 주세요.
                </label>
                <Textarea
                  value={requestBody}
                  onChange={(event) => setRequestBody(event.target.value)}
                  placeholder="상세 내용을 작성해 주세요."
                  className="mt-2 min-h-[140px] text-base"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#e7e9ee]">
                  참고할 링크를 보내주세요.
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={requestLink}
                    onChange={(event) => setRequestLink(event.target.value)}
                    placeholder="https://"
                    className="h-12 flex-1 text-base"
                  />
                  <Button type="button" onClick={addRequestLink} className="h-12 px-6 text-base">
                    링크 추가
                  </Button>
                </div>
                {requestLinks.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {requestLinks.map((link) => (
                      <div
                        key={link}
                        className="flex items-center justify-between rounded-xl border border-[#232936] px-3 py-2 text-sm"
                      >
                        <span className="truncate">{link}</span>
                        <button
                          type="button"
                          onClick={() => removeRequestLink(link)}
                          className="text-xs text-muted"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {requestError && <p className="mt-3 text-sm text-red-500">{requestError}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRequestOpen(false)}
                className="h-12 w-full"
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleRequestSubmit}
                disabled={requestSending}
                className="h-12 w-full bg-[#23D3FF] text-white hover:bg-[#2f47e6]"
              >
                {requestSending ? "전송 중..." : "요청 보내기"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {messageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#151a22] p-6 shadow-subtle">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">메시지 보내기</h3>
              <button
                type="button"
                onClick={() => setMessageOpen(false)}
                className="text-sm text-muted"
              >
                닫기
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <Textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="메시지를 입력하세요..."
                className="min-h-[140px] text-base"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="file"
                  className="hidden"
                  id="message-file"
                  onChange={(event) => setMessageFile(event.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor="message-file"
                  className="cursor-pointer rounded-lg border border-[#232936] px-4 py-2 text-sm"
                >
                  파일 첨부 (최대 10MB)
                </label>
                {messageFile && (
                  <span className="text-xs text-[#e7e9ee]">{messageFile.name}</span>
                )}
              </div>
            </div>
            {messageError && <p className="mt-3 text-sm text-red-500">{messageError}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMessageOpen(false)}
                className="h-12 w-full"
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleMessageSubmit}
                disabled={messageSending}
                className="h-12 w-full bg-[#23D3FF] text-white hover:bg-[#2f47e6]"
              >
                {messageSending ? "전송 중..." : "보내기"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#151a22] p-6 shadow-subtle">
            <h3 className="text-lg font-semibold">트랙 제목 입력</h3>
            <p className="mt-2 text-sm text-[#9aa3b2]">파일: {pendingFile?.name ?? "선택된 파일 없음"}</p>
            <div className="mt-4 space-y-2">
              <label className="text-sm text-[#9aa3b2]">트랙 제목</label>
              <Input
                value={pendingTitle}
                onChange={(event) => setPendingTitle(event.target.value)}
                placeholder="예: Pop Samples"
                className="h-12"
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setUploadModalOpen(false);
                  setPendingFile(null);
                  setPendingTitle("");
                }}
              >
                취소
              </Button>
              <Button type="button" onClick={addUploadTrack} disabled={!pendingFile || uploadingTrack}>
                {uploadingTrack ? "업로드 중..." : "업로드"}
              </Button>
            </div>
          </div>
        </div>
      )}

        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </div>
    </div>
  );
}
