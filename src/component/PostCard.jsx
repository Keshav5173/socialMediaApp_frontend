import { useRef, useState } from "react";
import {
    loadComments,
    createComment,
    createLike,
} from "../services/post.services.js";

function HeartIcon({ filled }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill={filled ? "#D97757" : "none"}
            stroke={filled ? "#D97757" : "currentColor"}
            strokeWidth="1.8"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.5s-7.5-4.6-10-9.3C.5 7.8 2.3 4.5 5.7 4c2-.3 3.8.6 5 2.2 1.2-1.6 3-2.5 5-2.2 3.4.5 5.2 3.8 3.7 7.2-2.5 4.7-10 9.3-10 9.3z"
            />
        </svg>
    );
}

function CommentIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 11.5a8.5 8.5 0 0 1-8.9 8.5c-1.3 0-2.5-.3-3.6-.8L3 21l1.9-5.1a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z"
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

function getCommentName(c) {
    return c.owner?.username || c.owner?.fullName || c.username || "user";
}

function getCommentText(c) {
    return c.content ?? c.text ?? "";
}


export default function PostCard({ post }) {
    const {
        _id: postId,
        postFile,
        caption,
        type,
        owner,
        likeCount: initialLikeCount = 0,
        isLiked: initialLiked = false,
    } = post;

    const [liked, setLiked] = useState(Boolean(initialLiked));
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [liking, setLiking] = useState(false);

    const [commentsOpen, setCommentsOpen] = useState(false);
    const [comments, setComments] = useState(null); // null = not fetched yet
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsError, setCommentsError] = useState("");

    const [newComment, setNewComment] = useState("");
    const [posting, setPosting] = useState(false);
    const [postError, setPostError] = useState("");
    const listRef = useRef(null); // comment list, used to scroll to the newest comment

    // Optimistic like: update the UI immediately, roll back if the request fails.
    async function handleLike() {
        if (liked || liking) return;

        setLiking(true);
        setLiked(true);
        setLikeCount((prev) => prev + 1);

        try {
            await createLike(postId);
        } catch (err) {
            console.error("Failed to like post", err);
            setLiked(false);
            setLikeCount((prev) => prev - 1);
        } finally {
            setLiking(false);
        }
    }

    // Called every time the user clicks the comment icon or "View comments"
    async function openComments() {
        setCommentsOpen(true);
        setCommentsLoading(true);
        setCommentsError("");

        try {
            const data = await loadComments(postId);
            setComments(data);
        } catch (err) {
            console.error("Failed to load comments", err);
            setCommentsError("Could not load comments.");
        } finally {
            setCommentsLoading(false);
        }
    }

    async function handleAddComment() {
        const content = newComment.trim();
        if (!content || posting) return;

        setPosting(true);
        setPostError("");

        try {
            await createComment(postId, content);
            setNewComment("");
        } catch (err) {
            console.error("Failed to post comment", err);
            setPostError("Could not post comment. Try again.");
            setPosting(false);
            return;
        }

        // Comment is saved. Refresh the list so it shows the server's version
        // (with the commenter's name), then scroll to it.
        try {
            setComments(await loadComments(postId));
            requestAnimationFrame(() => {
                listRef.current?.scrollTo({
                    top: listRef.current.scrollHeight,
                    behavior: "smooth",
                });
            });
        } catch (err) {
            console.error("Failed to refresh comments", err);
        } finally {
            setPosting(false);
        }
    }

    const ownerInitial = owner?.fullName?.[0]?.toUpperCase() || "?";

    return (
        <div className="relative w-full max-w-[420px] mx-auto">
            <div className="rounded-2xl overflow-hidden bg-white border border-black/10 shadow-sm">
                {/* header */}
                <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-9 w-9 rounded-full bg-[#D97757] flex items-center justify-center text-white font-medium text-sm">
                        {ownerInitial}
                    </div>
                    <p className="font-medium text-sm text-[#1a1a1a]">{owner?.fullName}</p>
                </div>

                <div className="w-full bg-[#F4F1EA] flex items-center justify-center overflow-hidden">
                    {type === "Video" ? (
                        <video
                            src={postFile}
                            className="w-full h-auto max-h-[525px] object-contain"
                            controls
                            playsInline
                        />
                    ) : (
                        <img
                            src={postFile}
                            alt={caption}
                            className="w-full h-auto max-h-[525px] object-contain"
                        />
                    )}
                </div>

                {/* actions */}
                <div className="flex items-center gap-4 px-4 pt-3">
                    <button
                        onClick={handleLike}
                        className="cursor-pointer text-[#1a1a1a] active:scale-90 transition-transform"
                        aria-label={liked ? "Liked" : "Like"}
                        aria-pressed={liked}
                    >
                        <HeartIcon filled={liked} />
                    </button>
                    <button
                        onClick={openComments}
                        className="cursor-pointer text-[#1a1a1a] active:scale-90 transition-transform"
                        aria-label="Comment"
                    >
                        <CommentIcon />
                    </button>
                </div>

                {/* like count + caption */}
                <div className="px-4 pt-2 pb-4">
                    <p className="text-sm font-medium text-[#1a1a1a]">
                        {likeCount} {likeCount === 1 ? "like" : "likes"}
                    </p>
                    <p className="text-sm text-[#1a1a1a] mt-1">
                        <span className="font-medium">{owner?.fullName}</span> {caption}
                    </p>
                    <button
                        onClick={openComments}
                        className="cursor-pointer text-sm text-black/50 mt-1"
                    >
                        {comments ? `View all ${comments.length} comments` : "View comments"}
                    </button>
                </div>
            </div>

            {/* comment panel — slides in from the right */}
            {commentsOpen && (
                <>
                    <div
                        onClick={() => setCommentsOpen(false)}
                        className="fixed inset-0 bg-black/40 z-40"
                    />
                    <div className="fixed top-0 right-0 h-full w-[85vw] max-w-[360px] bg-white z-50 flex flex-col shadow-xl animate-[slideIn_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-4 py-4 border-b border-black/10">
                            <p className="font-medium text-[#1a1a1a]">Comments</p>
                            <button
                                onClick={() => setCommentsOpen(false)}
                                className="cursor-pointer text-[#1a1a1a]"
                                aria-label="Close comments"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div
                            ref={listRef}
                            className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4"
                        >
                            {commentsLoading && (
                                <p className="text-sm text-black/50">Loading comments...</p>
                            )}

                            {!commentsLoading && commentsError && (
                                <div className="text-sm">
                                    <p className="text-red-500">{commentsError}</p>
                                    <button
                                        onClick={openComments}
                                        className="cursor-pointer underline mt-1"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {!commentsLoading && !commentsError && comments?.length === 0 && (
                                <p className="text-sm text-black/50">No comments yet.</p>
                            )}

                            {!commentsLoading &&
                                !commentsError &&
                                comments?.map((c) => {
                                    const name = getCommentName(c);
                                    return (
                                        <div key={c._id} className="flex gap-3">
                                            <div className="h-8 w-8 shrink-0 rounded-full bg-[#F4F1EA] flex items-center justify-center text-[#1a1a1a] text-xs font-medium">
                                                {name[0].toUpperCase()}
                                            </div>
                                            <p className="text-sm text-[#1a1a1a]">
                                                <span className="font-medium">{name}</span>{" "}
                                                {getCommentText(c)}
                                            </p>
                                        </div>
                                    );
                                })}
                        </div>

                        <div className="px-4 py-3 border-t border-black/10">
                            {postError && (
                                <p className="text-xs text-red-500 mb-2">{postError}</p>
                            )}
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleAddComment();
                                    }}
                                    placeholder="Add a comment..."
                                    className="flex-1 text-sm px-3 py-2 rounded-full bg-[#F4F1EA] outline-none"
                                    disabled={posting}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={posting || !newComment.trim()}
                                    className="cursor-pointer text-sm font-medium text-[#D97757] disabled:opacity-40 disabled:cursor-default"
                                >
                                    {posting ? "Posting..." : "Post"}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}