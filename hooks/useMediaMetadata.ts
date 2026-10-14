"use client";

import { useRef, useState } from "react";
import { toast } from "react-toastify";
import type { Info } from "../components/video-preview/types";

type MetadataPayload = {
  success?: boolean;
  error?: string;
  data?: Info;
};

export function useMediaMetadata() {
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metadataUrl, setMetadataUrl] = useState("");
  const metadataRequest = useRef<AbortController | null>(null);

  async function loadMetadata(inputUrl: string) {
    metadataRequest.current?.abort();
    const controller = new AbortController();
    metadataRequest.current = controller;
    setError("");
    setInfo(null);
    setMetadataUrl("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/media/info?url=${encodeURIComponent(inputUrl)}`,
        { signal: controller.signal },
      );
      const payload = (await response.json()) as MetadataPayload;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Unable to fetch media information");
      }

      setInfo(payload.data ?? null);
      setMetadataUrl(inputUrl);
      toast.success("Video information loaded.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      if (metadataRequest.current === controller) {
        metadataRequest.current = null;
        setLoading(false);
      }
    }
  }

  return {
    info,
    setInfo,
    loading,
    error,
    setError,
    metadataUrl,
    loadMetadata,
  };
}
