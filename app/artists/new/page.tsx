"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import AppSidebar from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import LoginModal from "@/components/auth/LoginModal";

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
  인천: [
    "서구",
    "부평구",
    "강화군",
    "미추홀구",
    "남동구",
    "연수구",
    "계양구",
    "동구",
    "중구"
  ],
  부산: [
    "해운대구",
    "수영구",
    "부산진구",
    "남구",
    "동래구",
    "연제구",
    "중구",
    "서구",
    "사상구",
    "사하구"
  ],
  경상: ["대구", "울산", "경남", "경북"],
  충청: ["대전", "세종", "충남", "충북"],
  전라: ["광주", "전남", "전북"],
  강원: ["춘천", "원주", "강릉"],
  제주: ["제주시", "서귀포시"]
} as const;

type RegionGroup = keyof typeof regionGroups;
type RegionOption = (typeof regionGroups)[RegionGroup][number];
const regionOptions = [
  ...regionGroups.서울,
  ...regionGroups.경기,
  ...regionGroups.인천,
  ...regionGroups.부산,
  ...regionGroups.경상,
  ...regionGroups.충청,
  ...regionGroups.전라,
  ...regionGroups.강원,
  ...regionGroups.제주
] as const;

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

const schema = z
  .object({
    stageName: z.string().min(1, "활동명을 입력해 주세요."),
    shortIntro: z
      .string()
      .min(1, "나를 한 마디로 소개해 주세요.")
      .max(50, "한 줄 소개는 50자 이내로 부탁드려요."),
    portfolioText: z.string().optional(),
    roles: z
      .array(
        z.enum([
          "PRODUCER",
          "SINGER",
          "MIXING_ENGINEER",
          "SONGWRITER",
          "MASTERING_ENGINEER",
          "SESSION_MUSICIAN"
        ])
      )
      .min(1, "포지션을 하나 이상 선택해 주세요."),
    mainGenre: z.enum(["POP", "HIPHOP", "RNB", "ELECTRONIC", "ROCK", "ACOUSTIC", "JAZZ", "CINEMATIC", "WORLD", "GOSPEL", "INDIE"]),
    subGenres: z.array(
      z.enum(["POP", "HIPHOP", "RNB", "ELECTRONIC", "ROCK", "ACOUSTIC", "JAZZ", "CINEMATIC", "WORLD", "GOSPEL", "INDIE"])
    ).min(1, "서브 장르를 하나 이상 선택해 주세요."),
    onlineAvailable: z.boolean().optional(),
    offlineAvailable: z.boolean().optional(),
    offlineRegions: z.array(z.enum(regionOptions)).optional(),
    averageWorkDuration: z.string().optional(),
    portfolioLinks: z.array(z.string().url()).optional(),
    avatarUrl: z.string().optional(),
    avatarKey: z.string().optional()
  })
  .refine(
    (data) => !data.offlineAvailable || (data.offlineRegions && data.offlineRegions.length > 0),
    {
      message: "오프라인 가능 시 지역을 선택하세요",
      path: ["offlineRegions"]
    }
  );

type FormValues = z.infer<typeof schema>;

type PendingPayload = Omit<FormValues, "portfolioLinks" | "subGenres"> & {
  portfolioLinks?: string[];
  genres: string[];
  tracks?: {
    title?: string;
    sourceType: "UPLOAD";
    url: string;
    fileKey?: string;
  }[];
  videos?: {
    title?: string;
    url: string;
  }[];
  equipment?: {
    category: "INSTRUMENT" | "GEAR";
    name: string;
    sortOrder: number;
  }[];
  rates?: {
    title: string;
    amount: number;
    sortOrder: number;
  }[];
  photos?: {
    url: string;
    fileKey?: string;
    isMain: boolean;
    sortOrder: number;
  }[];
};

async function presignUpload(file: File, folder: string) {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder,
      fileName: file.name,
      contentType: file.type
    })
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

export default function NewArtistPage() {
  const router = useRouter();
  const [editModeFlag, setEditModeFlag] = useState(false);
  const { data: session, status } = useSession();
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [equipmentCategory, setEquipmentCategory] = useState<EquipmentItem["category"]>("INSTRUMENT");
  const [equipmentName, setEquipmentName] = useState("");
  const [rates, setRates] = useState<RateItem[]>([]);
  const [rateTitle, setRateTitle] = useState("");
  const [rateAmount, setRateAmount] = useState("");
  const [uploadingTrack, setUploadingTrack] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingTitle, setPendingTitle] = useState("");
  const [photosUploading, setPhotosUploading] = useState(false);
  const [photos, setPhotos] = useState<
    { url: string; fileKey?: string; isMain: boolean; sortOrder: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<PendingPayload | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      stageName: "",
      shortIntro: "",
      roles: [],
      mainGenre: undefined as any,
      subGenres: [],
      onlineAvailable: false,
      offlineAvailable: false,
      offlineRegions: [],
      averageWorkDuration: "",
      portfolioText: "",
      portfolioLinks: [],
      avatarUrl: "",
      avatarKey: ""
    }
  });

  const values = form.watch();

  const steps = [
    { key: "basic", title: "기본 정보를 입력해 주세요.", optional: false },
    { key: "genresSelect", title: "어떤 음악을 하시나요?", optional: false },
    { key: "mainGenre", title: "메인 장르는 무엇인가요?", optional: false },
    { key: "shortIntro", title: "나를 한 마디로 소개해 주세요.", optional: false },
    { key: "portfolioText", title: "포트폴리오를 간단히 소개해 주세요.", optional: true },
    { key: "availability", title: "어떤 작업이 가능한가요?", optional: false },
    { key: "photos", title: "프로필 사진을 올려주세요.", optional: false }
  ] as const;
  const currentStep = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  const selectedGenres = useMemo(
    () => [values.mainGenre, ...(values.subGenres || [])].filter(Boolean),
    [values.mainGenre, values.subGenres]
  );
  const selectedMainGenre = values.mainGenre;
  const selectedRoles = useMemo(() => values.roles || [], [values.roles]);
  const [selectedGroup, setSelectedGroup] = useState<RegionGroup>("서울");
  const selectedRegions = useMemo(() => values.offlineRegions || [], [values.offlineRegions]);

  const selectMainGenre = (value: FormValues["mainGenre"]) => {
    form.setValue("mainGenre", value, { shouldValidate: true });
    const nextSubs = (values.subGenres || []).filter((g) => g !== value);
    form.setValue("subGenres", nextSubs, { shouldValidate: true });
  };

  const toggleSubGenre = (value: NonNullable<FormValues["subGenres"]>[number]) => {
    const current = values.subGenres || [];
    const next = current.includes(value)
      ? current.filter((g) => g !== value)
      : [...current, value];
    form.setValue("subGenres", next, { shouldValidate: true });
  };

  const toggleRole = (value: FormValues["roles"][number]) => {
    const next = selectedRoles.includes(value)
      ? selectedRoles.filter((r) => r !== value)
      : [...selectedRoles, value];
    form.setValue("roles", next, { shouldValidate: true });
  };

  const toggleRegion = (value: RegionOption) => {
    const next = selectedRegions.includes(value)
      ? selectedRegions.filter((r) => r !== value)
      : [...selectedRegions, value];
    form.setValue("offlineRegions", next, { shouldValidate: true });
  };

  const validateStep = async (index: number) => {
    setError(null);
    switch (steps[index].key) {
      case "basic": {
        const ok = await form.trigger("stageName");
        return ok && (await form.trigger("roles"));
      }
      case "shortIntro":
        return form.trigger("shortIntro");
      case "portfolioText":
        return true;
      case "genresSelect":
        if (!values.subGenres || values.subGenres.length === 0) {
          setError("장르는 하나 이상 선택해 주세요.");
          return false;
        }
        return true;
      case "mainGenre":
        if (!values.mainGenre) {
          setError("메인 장르를 선택해 주세요.");
          return false;
        }
        if (!values.subGenres || !values.subGenres.includes(values.mainGenre)) {
          setError("선택한 장르 중에서 메인 장르를 골라 주세요.");
          return false;
        }
        return true;
      case "availability":
        if (!values.onlineAvailable && !values.offlineAvailable) {
          setError("온라인/오프라인 중 하나 이상 선택해 주세요.");
          return false;
        }
        if (values.offlineAvailable && (!values.offlineRegions || values.offlineRegions.length === 0)) {
          setError("오프라인 가능 시 지역을 선택해 주세요.");
          return false;
        }
        return true;
      case "photos":
        if (photos.length === 0) {
          setError("프로필 사진을 최소 1장 업로드해 주세요.");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const goNext = async () => {
    const ok = await validateStep(stepIndex);
    if (!ok) return;
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const goPrev = () => {
    setError(null);
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const skipStep = () => {
    setError(null);
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const generateShortIntro = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/short-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageName: values.stageName,
          roles: values.roles,
          genres: values.subGenres,
          portfolioText: values.portfolioText
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "AI 생성에 실패했습니다.");
        return;
      }
      const data = await res.json();
      if (data?.reply) {
        form.setValue("shortIntro", String(data.reply).trim(), { shouldValidate: true });
      }
    } catch {
      setError("AI 생성에 실패했습니다.");
    } finally {
      setAiLoading(false);
    }
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
      setError("유튜브 링크만 추가할 수 있습니다.");
      return;
    }
    setVideos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: videoTitle.trim(), url }
    ]);
    setVideoTitle("");
    setVideoUrl("");
    setError(null);
  };

  const removeVideo = (id: string) => {
    setVideos((prev) => prev.filter((video) => video.id !== id));
  };

  const addEquipment = () => {
    const name = equipmentName.trim();
    if (!name) return;
    setEquipment((prev) => [
      ...prev,
      { id: crypto.randomUUID(), category: equipmentCategory, name }
    ]);
    setEquipmentName("");
  };

  const removeEquipment = (id: string) => {
    setEquipment((prev) => prev.filter((item) => item.id !== id));
  };

  const addRate = () => {
    const title = rateTitle.trim();
    const normalized = rateAmount.replace(/[^\d]/g, "");
    const amount = Number(normalized);
    if (!title) {
      setError("비용 제목을 입력하세요.");
      return;
    }
    if (!normalized || Number.isNaN(amount)) {
      setError("가격은 숫자만 입력해주세요.");
      return;
    }
    if (rates.length >= 3) {
      setError("비용은 최대 3개까지 등록할 수 있습니다.");
      return;
    }
    setRates((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title, amount: String(amount) }
    ]);
    setRateTitle("");
    setRateAmount("");
  };

  const removeRate = (id: string) => {
    setRates((prev) => prev.filter((rate) => rate.id !== id));
  };

  const handlePhotosUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (photos.length >= 5) return;
    setPhotosUploading(true);
    setError(null);
    try {
      const fileList = Array.from(files).slice(0, 5 - photos.length);
      const uploaded = [];
      for (const file of fileList) {
        const compressed = await compressImage(file);
        const { url, key } = await uploadFile(compressed, "artists/photos");
        uploaded.push({
          url,
          fileKey: key,
          isMain: false,
          sortOrder: photos.length + uploaded.length
        });
      }
      const next = [...photos, ...uploaded].map((item, index) => ({
        ...item,
        sortOrder: index
      }));
      if (!next.some((item) => item.isMain) && next.length > 0) {
        next[0].isMain = true;
      }
      setPhotos(next);
    } catch {
      setError("사진 업로드에 실패했습니다.");
    } finally {
      setPhotosUploading(false);
    }
  };

  const setMainPhoto = (index: number) => {
    setPhotos((prev) =>
      prev.map((item, idx) => ({
        ...item,
        isMain: idx === index
      }))
    );
  };

  const movePhoto = (from: number, to: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((p, idx) => ({ ...p, sortOrder: idx }));
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length > 0 && !next.some((item) => item.isMain)) {
        next[0].isMain = true;
      }
      return next.map((p, idx) => ({ ...p, sortOrder: idx }));
    });
  };

  const handleUploadSelect = (file: File | null) => {
    if (!file) return;
    if (tracks.length >= 3) {
      setError("음원은 최대 3개까지 등록할 수 있습니다.");
      return;
    }
    if (file.type !== "audio/mpeg" && !file.name.toLowerCase().endsWith(".mp3")) {
      setError("mp3 파일만 업로드할 수 있습니다.");
      return;
    }
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError("mp3 파일은 10MB 이하만 업로드할 수 있습니다.");
      return;
    }
    setPendingFile(file);
    setPendingTitle("");
    setUploadModalOpen(true);
  };

  const addUploadTrack = async () => {
    if (!pendingFile) return;
    if (tracks.length >= 3) {
      setError("음원은 최대 3개까지 등록할 수 있습니다.");
      return;
    }
    setUploadingTrack(true);
    setError(null);
    try {
      const { url, key } = await uploadFile(pendingFile, "artists/tracks");
      setTracks((prev) => [
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
      setError("오디오 업로드에 실패했습니다.");
    } finally {
      setUploadingTrack(false);
    }
  };

  const removeTrack = (id: string) => {
    setTracks((prev) => prev.filter((track) => track.id !== id));
  };

  const buildPayload = (data: FormValues): PendingPayload => {
    const payloadTracks = tracks
      .filter((track) => track.url)
      .map((track) => ({
        title: track.title || undefined,
        sourceType: track.type,
        url: track.url,
        fileKey: track.fileKey || undefined
      }));

    const { subGenres, ...rest } = data;
    return {
      ...rest,
      genres: [data.mainGenre, ...(subGenres || [])],
      averageWorkDuration: data.averageWorkDuration?.trim() || undefined,
      portfolioText: data.portfolioText?.trim() || undefined,
      portfolioLinks:
        (data.portfolioLinks || []).filter(Boolean).length > 0
          ? (data.portfolioLinks || []).filter(Boolean)
          : undefined,
      avatarUrl: data.avatarUrl?.trim() ? data.avatarUrl.trim() : undefined,
      avatarKey: data.avatarKey?.trim() ? data.avatarKey.trim() : undefined,
      tracks: payloadTracks.length ? payloadTracks : undefined,
      videos: videos.length
        ? videos.map((video) => ({
            title: video.title || undefined,
            url: video.url
          }))
        : undefined,
      equipment: equipment.length
        ? equipment.map((item, index) => ({
            category: item.category,
            name: item.name,
            sortOrder: index
          }))
        : undefined,
      rates: rates.length
        ? rates.map((rate, index) => ({
            title: rate.title,
            amount: Number(rate.amount.replace(/[^\d]/g, "")),
            sortOrder: index
          }))
        : undefined,
      photos: photos.length ? photos : undefined
    };
  };

  const submitPayload = async (payload: PendingPayload) => {
    const res = await fetch(isEdit ? "/api/me/artist" : "/api/artists", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.error === "UNAUTHORIZED") {
        setPendingPayload(payload);
        setLoginOpen(true);
        return;
      }
      if (typeof data?.error === "string") {
        const messageMap: Record<string, string> = {
          MAIN_GENRE_REQUIRED: "메인 장르를 선택해 주세요.",
          MAIN_GENRE_INVALID: "메인 장르는 선택한 장르 안에서만 가능합니다.",
          ALREADY_EXISTS: "이미 등록된 프로필이 있어요. 수정 화면으로 이동할게요.",
          NOT_FOUND: "아티스트 정보를 찾을 수 없습니다."
        };
        setError(messageMap[data.error] ?? "등록에 실패했습니다. 다시 시도해주세요.");
        if (data.error === "ALREADY_EXISTS") {
          setTimeout(() => {
            router.push("/artists/new?edit=1");
          }, 900);
        }
        return;
      }
      const fieldErrors = data?.error?.fieldErrors;
      const fieldMessage =
        fieldErrors && typeof fieldErrors === "object"
          ? Object.values(fieldErrors)
              .flat()
              .filter(Boolean)
              .join(" / ")
          : null;
      setError(fieldMessage ? `입력 오류: ${fieldMessage}` : "등록에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    const result = await res.json();
    setToast(true);
    setTimeout(() => {
      const slug = result?.artist?.slug || editSlug;
      router.push(slug ? `/${slug}` : "/");
    }, 1200);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setError(null);
    const payload = buildPayload(data);

    if (!session?.user?.id) {
      setPendingPayload(payload);
      setLoginOpen(true);
      return;
    }

    await submitPayload(payload);
  });

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!pendingPayload) return;
    submitPayload(pendingPayload);
    setPendingPayload(null);
    setLoginOpen(false);
  }, [pendingPayload, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (initialLoaded) return;
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const shouldEdit = sp.get("edit") === "1";
    const load = async () => {
      try {
        const res = await fetch("/api/me/artist", { cache: "no-store" });
        const data = await res.json();
        if (data?.artist) {
          setIsEdit(!!shouldEdit);
          setEditSlug(data.artist.slug ?? null);
          form.reset({
            stageName: data.artist.stageName ?? "",
            shortIntro: data.artist.shortIntro ?? "",
            portfolioText: data.artist.portfolioText ?? "",
            roles: data.artist.roles ?? [],
            mainGenre: data.artist.mainGenre ?? data.artist.genres?.[0],
            subGenres: (data.artist.genres ?? []).filter(
              (g: string) => g !== (data.artist.mainGenre ?? data.artist.genres?.[0])
            ),
            onlineAvailable: data.artist.onlineAvailable ?? false,
            offlineAvailable: data.artist.offlineAvailable ?? false,
            offlineRegions: data.artist.offlineRegions ?? [],
            averageWorkDuration: data.artist.averageWorkDuration ?? "",
            portfolioLinks: data.artist.portfolioLinks ?? [],
            avatarUrl: data.artist.avatarUrl ?? "",
            avatarKey: data.artist.avatarKey ?? ""
          });
          setPhotos(
            (data.artist.photos ?? []).map((photo: any, idx: number) => ({
              url: photo.url,
              fileKey: photo.fileKey,
              isMain: photo.isMain ?? idx === 0,
              sortOrder: photo.sortOrder ?? idx
            }))
          );
          setTracks(
            (data.artist.tracks ?? [])
              .filter((track: any) => track.sourceType === "UPLOAD")
              .map((track: any) => ({
                id: track.id ?? crypto.randomUUID(),
                title: track.title ?? "",
                type: "UPLOAD",
                url: track.url,
                fileKey: track.fileKey
              }))
          );
          setVideos(
            (data.artist.videos ?? []).map((video: any) => ({
              id: video.id ?? crypto.randomUUID(),
              title: video.title ?? "",
              url: video.url
            }))
          );
          setEquipment(
            (data.artist.equipment ?? []).map((item: any) => ({
              id: item.id ?? crypto.randomUUID(),
              category: item.category ?? "INSTRUMENT",
              name: item.name ?? ""
            }))
          );
          setRates(
            (data.artist.rates ?? []).map((rate: any) => ({
              id: rate.id ?? crypto.randomUUID(),
              title: rate.title ?? "",
              amount: String(rate.amount ?? "")
            }))
          );
        }
      } catch {
        // ignore
      } finally {
        setInitialLoaded(true);
      }
    };
    if (shouldEdit) load();
    else setInitialLoaded(true);
  }, [status, initialLoaded, form]);

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#151a22] text-[#e7e9ee]">
      <AppSidebar active="artists" />

      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">아티스트 등록</h1>
            <p className="mt-1 text-sm text-[#9aa3b2]">기본 정보를 입력해 주세요.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mx-auto max-w-[560px] space-y-6">
          <div className="rounded-xl border border-[#232936] bg-[#151a22] p-6">
            <div className="flex items-center justify-between text-sm text-[#9aa3b2]">
              <span>
                Step {stepIndex + 1} / {steps.length}
              </span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-[#10141b]">
              <div className="h-2 rounded-full bg-[#23D3FF]" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-[#e7e9ee]">{currentStep.title}</h2>
              {currentStep.key === "shortIntro" && (
                <button
                  type="button"
                  onClick={generateShortIntro}
                  className="shrink-0 rounded-md border border-[#232936] px-4 py-2 text-sm font-semibold text-[#23D3FF] hover:bg-[#23D3FF]/10"
                >
                  {aiLoading ? "작성 중..." : "AI로 작성"}
                </button>
              )}
            </div>

            <div className="mt-5 transition-all duration-300 ease-out">
              {currentStep.key === "basic" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Input {...form.register("stageName")} className="h-12" placeholder="활동명" />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-[#9aa3b2]">*중복 선택 가능</p>
                    <div className="flex flex-wrap gap-2">
                      {roleOptions.map((role) => (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => toggleRole(role.value)}
                          className={cn(
                            "rounded-lg border px-4 py-2 text-sm",
                            selectedRoles.includes(role.value)
                              ? "border-[#23D3FF] text-[#e7e9ee]"
                              : "border-[#232936] text-[#9aa3b2]"
                          )}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-red-500">{form.formState.errors.roles?.message}</p>
                  </div>
                </div>
              )}

              {currentStep.key === "shortIntro" && (
                <div className="space-y-2">
                  <Textarea {...form.register("shortIntro")} className="min-h-[120px]" placeholder="한 줄로 소개해 주세요." />
                  <p className="text-xs text-gray-400">최대 50자</p>
                </div>
              )}

              {currentStep.key === "portfolioText" && (
                <div className="space-y-2">
                  <Textarea {...form.register("portfolioText")} className="min-h-[160px]" placeholder="대표 작업이나 스타일을 알려주세요." />
                </div>
              )}


            {currentStep.key === "genresSelect" && (
              <div className="space-y-4">
                <p className="text-sm text-[#9aa3b2]">*중복 선택 가능</p>
                <div className="flex flex-wrap gap-2">
                  {genreOptions.map((genre) => (
                    <button
                      key={genre.value}
                      type="button"
                      onClick={() => toggleSubGenre(genre.value)}
                      className={cn(
                        "rounded-lg border px-4 py-2 text-sm",
                        (values.subGenres || []).includes(genre.value)
                          ? "border-[#23D3FF] text-[#e7e9ee]"
                          : "border-[#232936] text-[#9aa3b2]"
                      )}
                    >
                      {genre.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep.key === "mainGenre" && (
              <div className="space-y-3">
                <p className="text-sm text-[#9aa3b2]">선택한 장르 중에서 메인 장르를 골라 주세요.</p>
                <div className="flex flex-wrap gap-2">
                  {(values.subGenres || []).map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => form.setValue("mainGenre", genre as FormValues["mainGenre"], { shouldValidate: true })}
                      className={cn(
                        "rounded-lg border px-4 py-2 text-sm",
                        values.mainGenre === genre
                          ? "border-[#23D3FF] text-[#e7e9ee]"
                          : "border-[#232936] text-[#9aa3b2]"
                      )}
                    >
                      {genreOptions.find((g) => g.value === genre)?.label ?? genre}
                    </button>
                  ))}
                </div>
              </div>
            )}

              {currentStep.key === "availability" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => form.setValue("onlineAvailable", !values.onlineAvailable, { shouldValidate: true })}
                      className={cn(
                        "rounded-lg border px-5 py-3 text-base",
                        values.onlineAvailable
                          ? "border-[#23D3FF] text-[#e7e9ee]"
                          : "border-[#232936] text-[#9aa3b2]"
                      )}
                    >
                      온라인
                    </button>
                    <button
                      type="button"
                      onClick={() => form.setValue("offlineAvailable", !values.offlineAvailable, { shouldValidate: true })}
                      className={cn(
                        "rounded-lg border px-5 py-3 text-base",
                        values.offlineAvailable
                          ? "border-[#23D3FF] text-[#e7e9ee]"
                          : "border-[#232936] text-[#9aa3b2]"
                      )}
                    >
                      오프라인
                    </button>
                  </div>
                  {values.offlineAvailable && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(regionGroups).map((group) => (
                          <button
                            key={group}
                            type="button"
                            onClick={() => setSelectedGroup(group as RegionGroup)}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-sm",
                              selectedGroup === group
                                ? "border-[#23D3FF] text-[#e7e9ee]"
                                : "border-[#232936] text-[#9aa3b2]"
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
                            onClick={() => toggleRegion(region)}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-sm",
                              selectedRegions.includes(region)
                                ? "border-[#23D3FF] text-[#e7e9ee]"
                                : "border-[#232936] text-[#9aa3b2]"
                            )}
                          >
                            {region}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep.key === "photos" && (
                <div className="space-y-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handlePhotosUpload(event.target.files)}
                    disabled={photosUploading}
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                  {photos.map((photo, index) => (
                    <div key={photo.url} className="relative rounded-lg border border-[#232936] p-2">
                      <img src={photo.url} alt="" className="h-32 w-full rounded-md object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute bottom-2 right-2 rounded-md bg-[#151a22]/90 px-2 py-1 text-xs text-[#c7ccd6] shadow"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              )}

            </div>

            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

            <div className="mt-6 space-y-3">
              {currentStep.optional && stepIndex < steps.length - 1 && (
                <Button type="button" variant="ghost" onClick={skipStep} className="w-full rounded-md">
                  나중에 할게요
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                {stepIndex > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={goPrev}
                    className="w-full rounded-md"
                  >
                    이전
                  </Button>
                ) : (
                  <div />
                )}
                {stepIndex === steps.length - 1 ? (
                  <Button type="submit" className="w-full rounded-md bg-[#23D3FF] text-white">
                    {isEdit ? "수정 완료" : "등록 완료"}
                  </Button>
                ) : (
                  <Button type="button" className="w-full rounded-md bg-[#23D3FF] text-white" onClick={goNext}>
                    다음
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </main>

      {toast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg border border-[#23D3FF] bg-[#151a22] px-6 py-3 text-base text-[#e7e9ee]">
          {isEdit ? "아티스트 정보가 수정되었습니다" : "아티스트가 성공적으로 등록되었습니다"}
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
  );
}
