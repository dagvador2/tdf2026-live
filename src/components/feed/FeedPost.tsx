import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Pin, Camera, Trophy, Zap } from "lucide-react";

interface FeedPostProps {
  type: string;
  content: string;
  photoUrl: string | null;
  pinned: boolean;
  createdAt: string | Date;
  isNew?: boolean;
}

const POST_TYPE_CONFIG: Record<string, { icon: typeof Pin; label: string; color: string }> = {
  text: { icon: Zap, label: "Actu", color: "bg-blue-100 text-blue-800" },
  photo: { icon: Camera, label: "Photo", color: "bg-purple-100 text-purple-800" },
  result: { icon: Trophy, label: "Résultat", color: "bg-green-100 text-green-800" },
  highlight: { icon: Zap, label: "Moment fort", color: "bg-yellow-100 text-yellow-800" },
};

export function FeedPost({ type, content, photoUrl, pinned, createdAt, isNew }: FeedPostProps) {
  const config = POST_TYPE_CONFIG[type] || POST_TYPE_CONFIG.text;
  const Icon = config.icon;
  const timeStr = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));

  return (
    <Card
      className={`overflow-hidden transition-all ${
        isNew ? "animate-in slide-in-from-top-2 border-primary/50" : ""
      } ${pinned ? "border-primary/30 bg-primary/5" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {pinned ? (
              <Pin className="h-4 w-4 text-primary" />
            ) : (
              <Icon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="secondary" className={`text-[10px] ${config.color}`}>
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{timeStr}</span>
              {pinned && (
                <Badge variant="outline" className="text-[10px] text-primary">
                  Épinglé
                </Badge>
              )}
            </div>
            <p className="text-sm leading-relaxed">{content}</p>
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="mt-2 max-h-64 rounded-md object-cover"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
