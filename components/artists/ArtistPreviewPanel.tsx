import Link from "next/link";
import { Artist } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const ArtistPreviewPanel = ({ artist }: { artist: Artist }) => {
  return (
    <Card className="sticky top-24 space-y-4 p-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-2xl border border-border bg-slate-100">
          {artist.avatarUrl ? (
            <img
              src={artist.avatarUrl}
              alt={`${artist.stageName} 프로필`}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{artist.stageName}</h3>
        </div>
      </div>
      {artist.shortIntro && (
        <p className="text-xs text-muted whitespace-pre-line">{artist.shortIntro}</p>
      )}
      <div className="text-xs text-muted">
        {[artist.onlineAvailable ? "온라인" : null, artist.offlineAvailable ? "오프라인" : null]
          .filter(Boolean)
          .join(" · ")}
        {artist.averageWorkDuration ? ` · 평균 ${artist.averageWorkDuration}` : ""}
      </div>
      {artist.offlineAvailable && artist.offlineRegions?.length ? (
        <div className="text-xs text-muted">
          오프라인 지역: {artist.offlineRegions.join(" · ")}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {artist.genres.map((genre) => (
          <Badge key={genre}>{genre}</Badge>
        ))}
        {artist.roles?.map((role) => (
          <Badge key={role}>{role}</Badge>
        ))}
      </div>
      <div className="space-y-2">
        <Link href={artist.slug ? `/${artist.slug}` : "/"}>
          <Button className="w-full">포트폴리오 보기</Button>
        </Link>
        <Button variant="secondary" className="w-full">
          메시지 보내기
        </Button>
      </div>
    </Card>
  );
};
