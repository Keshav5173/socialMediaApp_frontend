import { useCallback, useEffect, useRef, useState } from "react";

import connectoLogo from "../assets/connectoLogo.png";
import profileLogo from "../assets/profileLogo.webp";
import api, { logout } from "../services/auth.services";
import { loadPosts } from "../services/post.services.js";
import PostCard from "../component/PostCard";

function Dashboard() {
    // profile
    const [profileClicked, setProfileClicked] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // mobile menu
    const [menuOpen, setMenuOpen] = useState(false);

    // feed
    const [posts, setPosts] = useState([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [postsError, setPostsError] = useState("");

    const feedRef = useRef(null);      // scroll container (observer root)
    const sentinelRef = useRef(null);  // invisible div at the bottom of the feed
    const inFlightRef = useRef(false); // blocks overlapping requests

    // ---- close mobile menu with Escape ----
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // ---- profile ----
    useEffect(() => {
        async function fetchProfile() {
            try {
                const response = await api.get("/users/viewProfile");
                setUser(response.data.data);
            } catch (err) {
                console.error("Failed to load profile", err);
                setError("Could not load profile.");
            } finally {
                setLoading(false);
            }
        }

        fetchProfile();
    }, []);

    // ---- feed ----
    const fetchMorePosts = useCallback(async () => {
        if (inFlightRef.current || !hasMore) return;

        inFlightRef.current = true;
        setLoadingMore(true);
        setPostsError("");

        try {
            const excludeIds = posts.map((p) => p._id);
            const newPosts = await loadPosts(excludeIds);

            if (newPosts.length === 0) {
                setHasMore(false);
            } else {
                // dedupe by _id as a safety net (e.g. React StrictMode double-invoke in dev)
                setPosts((prev) => {
                    const seen = new Set(prev.map((p) => p._id));
                    return [...prev, ...newPosts.filter((p) => !seen.has(p._id))];
                });
            }
        } catch (err) {
            console.error("Failed to load posts", err);
            setPostsError("Could not load posts.");
        } finally {
            inFlightRef.current = false;
            setLoadingMore(false);
        }
    }, [posts, hasMore]);

    // Loads the first page, then the next page whenever the sentinel scrolls into view.
    // The observer is recreated after each load, so if the screen still isn't
    // filled it fires again immediately.
    useEffect(() => {
        if (!hasMore || postsError) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) fetchMorePosts();
            },
            { root: feedRef.current, rootMargin: "300px" }
        );

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [fetchMorePosts, hasMore, postsError]);

    const handleCreatePostClick = () => {
        window.location.href = "/createPost";
    };

    const handleMessageClick=()=>{
        console.log("Clickked on messages");
        window.location.href="/messages";
    }

    return (
        <>
            <div className="w-screen h-screen relative bg-[#F4F1EA] overflow-hidden">

                {/* ---------- Header ---------- */}
                <div className="h-[10vh] w-screen flex items-center justify-between px-4 md:px-10">
                    <img className="w-[35vw] md:w-[20vw]" src={connectoLogo} alt="" />

                    {/* Desktop nav */}
                    <div className="hidden md:flex w-[50%] h-[10vh] items-center justify-evenly">
                        <button onClick={handleCreatePostClick} className="cursor-pointer">
                            Create Post
                        </button>
                        <button className="cursor-pointer" onClick={handleMessageClick} >
                            Messages
                        </button>

                        <button
                            className="cursor-pointer"
                            onClick={() => setProfileClicked((prev) => !prev)}
                        >
                            <img className="h-[5vh]" src={profileLogo} alt="" />
                        </button>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="md:hidden flex flex-col gap-[5px] p-2 cursor-pointer"
                        onClick={() => setMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <span className="block h-[2px] w-6 bg-black rounded" />
                        <span className="block h-[2px] w-6 bg-black rounded" />
                        <span className="block h-[2px] w-6 bg-black rounded" />
                    </button>
                </div>

                {/* ---------- Mobile backdrop ---------- */}
                <div
                    onClick={() => setMenuOpen(false)}
                    className={`md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
                        menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                />

                {/* ---------- Mobile slide-in drawer ---------- */}
                <aside
                    className={`md:hidden fixed top-0 right-0 h-full w-[75%] max-w-[320px] bg-[#F4F1EA] z-50 shadow-xl flex flex-col transform transition-transform duration-300 ${
                        menuOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                >
                    <div className="flex items-center justify-between px-5 h-[10vh] border-b border-black/10">
                        <span className="font-semibold text-lg">Menu</span>
                        <button
                            onClick={() => setMenuOpen(false)}
                            className="text-2xl cursor-pointer"
                            aria-label="Close menu"
                        >
                            ✕
                        </button>
                    </div>

                    <nav className="flex flex-col px-3 py-4 gap-1">
                        <button
                            onClick={() => {
                                setMenuOpen(false);
                                handleCreatePostClick();
                            }}
                            className="text-left px-3 py-3 rounded-lg hover:bg-black/5 cursor-pointer"
                        >
                            Create Post
                        </button>
                        <button
                            onClick={() => {
                                setMenuOpen(false)
                                handleMessageClick()
                            }}
                            className="text-left px-3 py-3 rounded-lg hover:bg-black/5 cursor-pointer"
                        >
                            Messages
                        </button>
                        <button
                            onClick={() => {
                                setMenuOpen(false);
                                setProfileClicked(true);
                            }}
                            className="flex items-center gap-3 text-left px-3 py-3 rounded-lg hover:bg-black/5 cursor-pointer"
                        >
                            <img className="h-8 w-8 rounded-full object-cover" src={profileLogo} alt="" />
                            Profile
                        </button>
                    </nav>

                    <div className="mt-auto p-5 border-t border-black/10">
                        <button
                            onClick={logout}
                            className="w-full cursor-pointer rounded-lg bg-[#D97757] px-6 py-2 font-medium text-white hover:bg-[#C4643F] transition-colors"
                        >
                            Log out
                        </button>
                    </div>
                </aside>

                {/* ---------- Profile popup ---------- */}
                {profileClicked && (
                    <div className="bg-black/50 w-[90vw] md:w-[40vw] h-[70vh] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[20px] flex flex-col items-center justify-center text-white px-8 gap-4 z-50">
                        {loading && <p>Loading profile...</p>}

                        {!loading && error && <p className="text-red-300">{error}</p>}

                        {!loading && !error && user && (
                            <>
                                <div className="text-center">
                                    <p className="text-sm opacity-70 text-white">Full Name</p>
                                    <p className="text-lg font-medium">{user.fullName}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm opacity-70">Username</p>
                                    <p className="text-lg font-medium">{user.username}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm opacity-70">Email</p>
                                    <p className="text-lg font-medium break-all">{user.email}</p>
                                </div>

                                <div
                                    className="absolute text-white top-8 text-2xl right-6 md:right-auto md:left-[80%] cursor-pointer"
                                    onClick={() => setProfileClicked(false)}
                                >
                                    X
                                </div>
                            </>
                        )}

                        <button
                            onClick={logout}
                            className="mt-4 cursor-pointer rounded-lg bg-[#D97757] px-6 py-2 font-medium hover:bg-[#C4643F] transition-colors"
                        >
                            Log out
                        </button>
                    </div>
                )}

                {/* ---------- Feed: this container scrolls, not the page ---------- */}
                <div
                    ref={feedRef}
                    className="h-[90vh] w-screen relative z-0 overflow-y-auto px-4 py-4 flex flex-col gap-6"
                >
                    {posts.map((post) => (
                        <PostCard key={post._id} post={post} />
                    ))}

                    {loadingMore && (
                        <p className="text-center text-sm text-black/50">Loading posts...</p>
                    )}

                    {postsError && (
                        <div className="text-center text-sm">
                            <p className="text-red-500">{postsError}</p>
                            <button
                                onClick={fetchMorePosts}
                                className="mt-2 cursor-pointer underline"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {!hasMore && (
                        <p className="text-center text-sm text-black/50">
                            {posts.length === 0 ? "No posts yet." : "You have digged all bottom"}
                        </p>
                    )}

                    {/* observer target */}
                    <div ref={sentinelRef} className="h-1 shrink-0" />
                </div>

            </div>
        </>
    );
}

export default Dashboard;
