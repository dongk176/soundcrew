"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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


const schema = z
  .object({
  stageName: z.string().min(1, "활동명을 입력하세요"),
  shortIntro: z
    .string()
    .min(10, "짧은 소개를 입력하세요")
    .max(50, "짧은 소개는 50자 이내로 입력해주세요"),
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
    .min(1, "역할을 선택하세요"),
  mainGenre: z.enum(["POP", "HIPHOP", "RNB", "ELECTRONIC", "ROCK", "ACOUSTIC", "JAZZ", "CINEMATIC", "WORLD", "GOSPEL", "INDIE"]),
  subGenres: z.array(z.enum(["POP", "HIPHOP", "RNB", "ELECTRONIC", "ROCK", "ACOUSTIC", "JAZZ", "CINEMATIC", "WORLD", "GOSPEL", "INDIE"])).optional(),
  onlineAvailable: z.boolean().optional(),
  offlineAvailable: z.boolean().optional(),
  offlineRegions: z.array(z.enum(regionOptions)).optional(),
  averageWorkDuration: z.string().min(1, "평균 작업기간을 입력하세요"),
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
  )
  ;

type FormValues = z.infer<typeof schema>;
type PendingPayload = Omit<FormValues, "portfolioLinks" | "subGenres"> & {
  portfolioLinks: string[];
  genres: string[];
  tracks: {
    title?: string;
    sourceType: "UPLOAD";
    url: string;
    fileKey?: string;
  }[];
  photos: {
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
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [tracks, setTracks] = useState<TrackItem[]>([]);
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
    if (value === values.mainGenre) return;
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
      portfolioText: data.portfolioText?.trim() || undefined,
      portfolioLinks: (data.portfolioLinks || []).filter(Boolean),
      avatarUrl: data.avatarUrl?.trim() ? data.avatarUrl.trim() : undefined,
      avatarKey: data.avatarKey?.trim() ? data.avatarKey.trim() : undefined,
      tracks: payloadTracks,
      photos
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
      setError("등록에 실패했습니다. 다시 시도해주세요.");
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
    const shouldEdit = searchParams?.get("edit") === "1";
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
            portfolioText: data.artist.portfolioText ?? "",
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
        }
      } catch {
        // ignore
      } finally {
        setInitialLoaded(true);
      }
    };
    if (shouldEdit) load();
    else setInitialLoaded(true);
  }, [status, initialLoaded, searchParams, form]);

  return (
    <div className="min-h-screen bg-white">
      <AppHeader showSearch={false} />
      <div className="mx-auto max-w-4xl px-6 pb-16 pt-10 text-base">
        <h1 className="text-3xl font-semibold">{isEdit ? "아티스트 수정" : "아티스트 등록"}</h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-8">
          <Card className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">기본 정보</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-muted">활동명</label>
                <Input
                  {...form.register("stageName")}
                  placeholder="예: ARIA"
                  className="h-12 text-base"
                />
                <p className="text-sm text-red-500">
                  {form.formState.errors.stageName?.message}
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-muted">나를 한 마디로 소개해 주세요.</label>
                <Textarea
                  {...form.register("shortIntro")}
                  placeholder="최대 50자 이내로 작성"
                  maxLength={50}
                  className="min-h-[110px] text-base"
                />
                <p className="text-sm text-red-500">
                  {form.formState.errors.shortIntro?.message}
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-muted">포트폴리오</label>
                <Textarea
                  {...form.register("portfolioText")}
                  placeholder="포트폴리오/작업 이력/소개를 자유롭게 작성해 주세요."
                  className="min-h-[140px] text-base"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted">평균 작업기간</label>
                <Input
                  {...form.register("averageWorkDuration")}
                  placeholder="예: 3~5일"
                  className="h-12 text-base"
                />
                <p className="text-sm text-red-500">
                  {form.formState.errors.averageWorkDuration?.message}
                </p>
              </div>
              <div className="space-y-3">
                <label className="text-sm text-muted">프로필 사진 (최대 5장)</label>
                <div className="rounded-2xl border border-dashed border-border bg-slate-50 px-4 py-6">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-white px-5 py-3 text-base font-medium text-foreground hover:bg-slate-100">
                      파일 선택
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => handlePhotosUpload(event.target.files)}
                      />
                    </label>
                    {photosUploading && <p className="text-sm text-muted">업로드 중...</p>}
                  </div>
                  {photos.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {photos.map((photo, index) => (
                        <div
                          key={`${photo.url}-${index}`}
                          className="rounded-2xl border border-border bg-white p-3"
                        >
                          <img
                            src={photo.url}
                            alt="업로드 사진"
                            className="h-24 w-full rounded-xl object-cover"
                          />
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setMainPhoto(index)}
                              className={cn(
                                "rounded-lg border px-3 py-1 text-xs",
                                photo.isMain
                                  ? "border-accent text-foreground"
                                  : "border-border text-muted"
                              )}
                            >
                              {photo.isMain ? "메인" : "메인 지정"}
                            </button>
                            <button
                              type="button"
                              onClick={() => movePhoto(index, Math.max(0, index - 1))}
                              className="rounded-lg border border-border px-3 py-1 text-xs text-muted"
                            >
                              위로
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                movePhoto(index, Math.min(photos.length - 1, index + 1))
                              }
                              className="rounded-lg border border-border px-3 py-1 text-xs text-muted"
                            >
                              아래로
                            </button>
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="rounded-lg border border-border px-3 py-1 text-xs text-muted"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-base text-muted">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...form.register("onlineAvailable")} />
                온라인 가능
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...form.register("offlineAvailable")} />
                오프라인 가능
              </label>
            </div>
            {values.offlineAvailable && (
              <div className="space-y-2">
                <p className="text-sm text-muted">오프라인 지역 선택</p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(regionGroups).map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setSelectedGroup(group as RegionGroup)}
                      className={cn(
                        "rounded-lg border px-4 py-2 text-sm",
                        selectedGroup === group
                          ? "border-accent text-foreground"
                          : "border-border text-muted"
                      )}
                    >
                      {group}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {regionGroups[selectedGroup].map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => toggleRegion(region)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm text-left transition-colors",
                        selectedRegions.includes(region)
                          ? "border-accent text-foreground"
                          : "border-border text-muted"
                      )}
                    >
                      {region}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-red-500">
                  {form.formState.errors.offlineRegions?.message}
                </p>
              </div>
            )}
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">장르 선택</h2>
            {!selectedMainGenre ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">메인 장르를 선택해 주세요.</p>
                <div className="flex flex-wrap gap-2">
                  {genreOptions.map((genre) => (
                    <button
                      key={genre.value}
                      type="button"
                      onClick={() => selectMainGenre(genre.value)}
                      className={cn(
                        "rounded-lg border px-4 py-2 text-sm",
                        "border-border text-muted hover:text-foreground"
                      )}
                    >
                      {genre.label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-red-500">{form.formState.errors.mainGenre?.message}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  선택된 메인 장르:{" "}
                  <span className="font-semibold text-foreground">
                    {genreOptions.find((g) => g.value === selectedMainGenre)?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue("mainGenre", undefined as any, { shouldValidate: true });
                      form.setValue("subGenres", [], { shouldValidate: true });
                    }}
                    className="ml-3 rounded-lg border border-border px-3 py-1 text-xs text-muted hover:text-foreground"
                  >
                    메인 변경
                  </button>
                </p>
                <p className="text-sm text-muted">서브 장르를 선택해 주세요.</p>
                <div className="flex flex-wrap gap-2">
                  {genreOptions
                    .filter((genre) => genre.value !== selectedMainGenre)
                    .map((genre) => (
                      <button
                        key={genre.value}
                        type="button"
                        onClick={() => toggleSubGenre(genre.value)}
                        className={cn(
                          "rounded-lg border px-4 py-2 text-sm",
                          (values.subGenres || []).includes(genre.value)
                            ? "border-accent text-foreground"
                            : "border-border text-muted"
                        )}
                      >
                        {genre.label}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">역할 선택</h2>
            <div className="flex flex-wrap gap-2">
              {roleOptions.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => toggleRole(role.value)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm",
                    selectedRoles.includes(role.value)
                      ? "border-accent text-foreground"
                      : "border-border text-muted"
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-red-500">{form.formState.errors.roles?.message}</p>
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">음원</h2>
            <p className="text-sm text-muted">mp3 파일만 업로드할 수 있습니다.</p>
            <div className="space-y-6">
              <div className="rounded-2xl border border-dashed border-border bg-slate-50 px-4 py-6">
                <p className="text-sm font-semibold">mp3 업로드</p>
                <label className="mt-4 block cursor-pointer rounded-2xl border border-border bg-white/0 px-4 py-8 text-center text-base font-medium text-foreground hover:bg-slate-100/60">
                  파일 선택
                  <input
                    type="file"
                    accept="audio/mpeg"
                    className="hidden"
                    onChange={(event) => handleUploadSelect(event.target.files?.[0] ?? null)}
                  />
                </label>
                {pendingFile && (
                  <p className="mt-3 text-center text-sm text-muted">{pendingFile.name}</p>
                )}
              </div>

              <div className="space-y-2">
                {tracks.length === 0 ? (
                  <p className="text-sm text-muted">추가된 음원이 없습니다.</p>
                ) : (
                  tracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between rounded-2xl border border-border px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {track.title || "제목 없음"}{" "}
                        </p>
                        <p className="text-xs text-muted">{track.url}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTrack(track.id)}
                        className="text-sm text-muted"
                      >
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">SNS 링크</h2>
            <p className="text-sm text-muted">링크를 여러 개 추가할 수 있습니다.</p>
            <PortfolioLinksInput
              links={values.portfolioLinks || []}
              onChange={(next) => form.setValue("portfolioLinks", next)}
            />
          </Card>

          {error && <p className="text-base text-red-500">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" className="text-base px-6 py-3">
              {isEdit ? "수정 완료" : "등록 완료"}
            </Button>
          </div>
        </form>
      </div>

      {toast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg border border-accent bg-white px-6 py-3 text-base text-foreground shadow-subtle">
          {isEdit ? "아티스트 정보가 수정되었습니다" : "아티스트가 성공적으로 등록되었습니다"}
        </div>
      )}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-subtle">
            <h3 className="text-lg font-semibold">트랙 제목 입력</h3>
            <p className="mt-2 text-sm text-muted">
              파일: {pendingFile?.name ?? "선택된 파일 없음"}
            </p>
            <div className="mt-4 space-y-2">
              <label className="text-sm text-muted">트랙 제목</label>
              <Input
                value={pendingTitle}
                onChange={(event) => setPendingTitle(event.target.value)}
                placeholder="예: Pop Samples"
                className="h-12 text-base"
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
              <Button
                type="button"
                onClick={addUploadTrack}
                disabled={!pendingFile || uploadingTrack}
              >
                {uploadingTrack ? "업로드 중..." : "업로드"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        callbackUrl="/artists/new"
        disableClose
      />
    </div>
  );
}

function PortfolioLinksInput({
  links,
  onChange
}: {
  links: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addLink = () => {
    if (!draft.trim()) return;
    onChange([...links, draft.trim()]);
    setDraft("");
  };

  const removeLink = (link: string) => {
    onChange(links.filter((item) => item !== link));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="https://"
          className="h-12 flex-1 text-base"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={addLink}
          className="text-base px-5 py-3 whitespace-nowrap"
        >
          추가
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Badge key={link} className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-2">
              <img
                src={getSnsIconPath(link)}
                alt="sns icon"
                className="h-4 w-4"
              />
              <span className="max-w-[220px] truncate">{link}</span>
            </span>
            <button type="button" onClick={() => removeLink(link)}>
              ✕
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

function getSnsIconPath(link: string) {
  const url = link.toLowerCase();
  const base = "/sns%20icons";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return `${base}/youtube.png`;
  if (url.includes("instagram.com")) return `${base}/instagram.png`;
  if (url.includes("soundcloud.com")) return `${base}/soundcloud.png`;
  if (url.includes("tiktok.com")) return `${base}/tiktok.png`;
  if (url.includes("spotify.com")) return `${base}/spotify.png`;
  if (url.includes("facebook.com")) return `${base}/facebook.png`;
  if (url.includes("twitter.com") || url.includes("x.com")) return `${base}/x.png`;
  if (url.includes("bandcamp.com")) return `${base}/bandcamp.png`;
  return `${base}/link.png`;
}
