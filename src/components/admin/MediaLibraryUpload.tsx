"use client";

import { useRouter } from "next/navigation";
import { MediaUploader } from "@/components/admin/MediaUploader";
import type { UploadInfo } from "@/lib/media-upload";

export function MediaLibraryUpload({ info }: { info?: UploadInfo }) {
  const router = useRouter();
  return <MediaUploader info={info} onUploaded={() => router.refresh()} />;
}
