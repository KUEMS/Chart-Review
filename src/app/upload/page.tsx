"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";

type FileStatus = "pending" | "processing" | "complete" | "error";

interface QueueItem {
  file: File;
  status: FileStatus;
  reviewId?: string;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<QueueItem[]>([]);
  const [grammarLevel, setGrammarLevel] = useState(2);
  const [chartId, setChartId] = useState("");
  const [providerName, setProviderName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const pdfFiles = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    if (pdfFiles.length === 0) return;
    setFiles((prev) => [
      ...prev,
      ...pdfFiles.map((file) => ({ file, status: "pending" as FileStatus })),
    ]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
    },
    [addFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleUpload() {
    if (files.length === 0) return;
    setProcessing(true);

    if (files.length === 1) {
      // Single upload
      const item = files[0];
      setFiles([{ ...item, status: "processing" }]);

      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("grammarLevel", String(grammarLevel));
      if (chartId) formData.append("chartId", chartId);
      if (providerName) formData.append("providerName", providerName);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (res.ok) {
          setFiles([
            { ...item, status: "complete", reviewId: data.id },
          ]);
          // Navigate to review detail after brief delay
          setTimeout(() => router.push(`/reviews/${data.id}`), 500);
        } else {
          setFiles([
            {
              ...item,
              status: "error",
              error: data.error || "Upload failed",
            },
          ]);
        }
      } catch {
        setFiles([
          { ...item, status: "error", error: "Network error" },
        ]);
      }
    } else {
      // Batch upload
      const formData = new FormData();
      for (const item of files) {
        formData.append("files", item.file);
      }
      formData.append("grammarLevel", String(grammarLevel));

      // Mark all as processing
      setFiles((prev) => prev.map((f) => ({ ...f, status: "processing" as FileStatus })));

      try {
        const res = await fetch("/api/batch", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (res.ok && data.results) {
          setFiles((prev) =>
            prev.map((item, i) => {
              const result = data.results[i];
              if (!result) return item;
              return {
                ...item,
                status: result.error ? "error" : "complete",
                reviewId: result.reviewId,
                error: result.error,
              };
            })
          );
        } else {
          setFiles((prev) =>
            prev.map((f) => ({
              ...f,
              status: "error" as FileStatus,
              error: data.error || "Batch failed",
            }))
          );
        }
      } catch {
        setFiles((prev) =>
          prev.map((f) => ({
            ...f,
            status: "error" as FileStatus,
            error: "Network error",
          }))
        );
      }
    }

    setProcessing(false);
  }

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Upload Charts</h1>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <div className="text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm">
              Drag and drop PDF files here, or{" "}
              <label className="text-blue-600 hover:underline cursor-pointer">
                browse
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PDF only, max 10MB per file, up to 50 files
            </p>
          </div>
        </div>

        {/* File Queue */}
        {files.length > 0 && (
          <div className="mt-6 space-y-2">
            {files.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileStatusIcon status={item.status} />
                  <span className="text-sm truncate">{item.file.name}</span>
                  <span className="text-xs text-gray-400">
                    {(item.file.size / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.error && (
                    <span className="text-xs text-red-600">{item.error}</span>
                  )}
                  {item.reviewId && (
                    <button
                      onClick={() => router.push(`/reviews/${item.reviewId}`)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  )}
                  {item.status === "pending" && (
                    <button
                      onClick={() => removeFile(i)}
                      className="text-gray-400 hover:text-red-500 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Options */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grammar Level
            </label>
            <div className="flex gap-4">
              {[
                { value: 1, label: "Lenient", desc: "Safety-affecting only" },
                { value: 2, label: "Standard", desc: "Spelling, terminology, grammar" },
                { value: 3, label: "Strict", desc: "Professional prose" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex-1 p-3 border rounded-md cursor-pointer text-center transition-colors ${
                    grammarLevel === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="grammarLevel"
                    value={opt.value}
                    checked={grammarLevel === opt.value}
                    onChange={() => setGrammarLevel(opt.value)}
                    className="sr-only"
                  />
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {opt.desc}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {files.length === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chart ID / PRID (optional)
                </label>
                <input
                  type="text"
                  value={chartId}
                  onChange={(e) => setChartId(e.target.value)}
                  placeholder="e.g., 12345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider Name (optional)
                </label>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="e.g., Smith, J."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || processing}
            className="w-full py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing
              ? "Processing..."
              : files.length > 1
                ? `Upload All (${files.length} files)`
                : "Upload & Review"}
          </button>
        </div>
      </main>
    </>
  );
}

function FileStatusIcon({ status }: { status: FileStatus }) {
  switch (status) {
    case "processing":
      return (
        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
      );
    case "complete":
      return <span className="text-green-500 text-sm">&#10003;</span>;
    case "error":
      return <span className="text-red-500 text-sm">&#10007;</span>;
    default:
      return <span className="text-gray-400 text-sm">&#9679;</span>;
  }
}
