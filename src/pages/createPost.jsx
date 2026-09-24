import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPost } from "../services/post.services.js";

function UploadIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14"
            />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
    );
}

const SIZE_OPTIONS = [
    { value: "1:1", label: "Square" },
    { value: "4:5", label: "Portrait" },
    { value: "16:9", label: "Landscape" },
];

export default function CreatePost() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fileType, setFileType] = useState(null); // "Photo" | "Video"

    const [caption, setCaption] = useState("");
    const [size, setSize] = useState("1:1");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    function handleFileChange(e) {
        const selected = e.target.files?.[0];
        if (!selected) return;

        const isVideo = selected.type.startsWith("video/");
        const isImage = selected.type.startsWith("image/");

        if (!isVideo && !isImage) {
            setError("Please choose an image or video file.");
            return;
        }

        setError("");
        setFile(selected);
        setFileType(isVideo ? "Video" : "Photo");
        setPreviewUrl(URL.createObjectURL(selected));
    }

    function clearFile() {
        setFile(null);
        setFileType(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!file || submitting) return;

        if (!caption.trim()) {
            setError("Add a caption before posting.");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("post", file); // matches req.files.post on the backend
            formData.append("caption", caption.trim());
            formData.append("type", fileType);
            formData.append("size", size);

            const result = await createPost(formData);
            navigate(`/post/${result.data._id}`);
        } catch (err) {
            console.error("Failed to create post", err);
            setError(
                err?.response?.data?.message || "Could not create post. Try again."
            );
            setSubmitting(false);
        }
    }

    return (
        <div className="w-full max-w-[420px] mx-auto px-4 py-6">
            <h1 className="text-lg font-medium text-[#1a1a1a] mb-5">Create post</h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* file picker / preview */}
                <div className="rounded-2xl overflow-hidden bg-white border border-black/10 shadow-sm">
                    {!previewUrl ? (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="cursor-pointer w-full aspect-square bg-[#F4F1EA] flex flex-col items-center justify-center gap-2 text-[#1a1a1a]/50"
                        >
                            <UploadIcon />
                            <span className="text-sm">Tap to select photo or video</span>
                        </button>
                    ) : (
                        <div className="relative w-full aspect-square bg-[#F4F1EA]">
                            {fileType === "Video" ? (
                                <video
                                    src={previewUrl}
                                    className="w-full h-full object-cover"
                                    controls
                                />
                            ) : (
                                <img
                                    src={previewUrl}
                                    alt="Selected post"
                                    className="w-full h-full object-cover"
                                />
                            )}
                            <button
                                type="button"
                                onClick={clearFile}
                                className="cursor-pointer absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                                aria-label="Remove file"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* size / aspect ratio */}
                <div>
                    <p className="text-sm font-medium text-[#1a1a1a] mb-2">Format</p>
                    <div className="flex gap-2">
                        {SIZE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setSize(opt.value)}
                                className={`cursor-pointer flex-1 text-sm py-2 rounded-full border transition-colors ${
                                    size === opt.value
                                        ? "bg-[#D97757] border-[#D97757] text-white"
                                        : "bg-white border-black/10 text-[#1a1a1a]"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* caption */}
                <div>
                    <p className="text-sm font-medium text-[#1a1a1a] mb-2">Caption</p>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write a caption..."
                        rows={3}
                        className="w-full text-sm px-3 py-2 rounded-2xl bg-[#F4F1EA] outline-none resize-none text-[#1a1a1a]"
                        disabled={submitting}
                    />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                    type="submit"
                    disabled={!file || submitting}
                    className="cursor-pointer w-full text-sm font-medium text-white bg-[#D97757] rounded-full py-3 disabled:opacity-40 disabled:cursor-default active:scale-[0.98] transition-transform"
                >
                    {submitting ? "Posting..." : "Share post"}
                </button>
            </form>
        </div>
    );
}