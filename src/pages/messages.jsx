import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, UserPlus, Phone, Video, Send, X, MessageCircle, ArrowLeft } from 'lucide-react';
import { connectWebSocket } from '../services/ws.services.js';

function Messages() {
    /* ---------------------------------------------------------------------- */
    /*  STATE – these variables are what the UI displays.                     */
    /*  Fill them from your backend functions below.                          */
    /* ---------------------------------------------------------------------- */

    // Friend list. Each item: { id, name, username, lastMessage, time, unread }
    const [friends, setFriends] = useState([]);

    // Messages grouped by friend id.
    // Shape: { [friendId]: [{ id, from: 'me' | 'friend', text, time }] }
    const [chats, setChats] = useState({});

    // Matching users shown in the Add friend box. Each item: { id, name, username }
    const [userResults, setUserResults] = useState([]);

    const [activeId, setActiveId] = useState(null);
    const [friendSearch, setFriendSearch] = useState('');
    const [messageText, setMessageText] = useState('');

    // Add-friend modal
    const [showAdd, setShowAdd] = useState(false);
    const [userQuery, setUserQuery] = useState('');
    const [searching, setSearching] = useState(false);

    const bottomRef = useRef(null);

    /* ---------------------------------------------------------------------- */
    /*  BACKEND FUNCTIONS – add your logic inside each one                    */
    /* ---------------------------------------------------------------------- */

    // Load the logged-in user's friends, then call setFriends(data)
    const fetchFriends = async () => {
        // TODO: your backend logic here
    };

    // Load the chat history with one friend, then call:
    // setChats((prev) => ({ ...prev, [friendId]: data }))
    const fetchMessages = async (friendId) => {
        // TODO: your backend logic here
    };

    // Search users by username, then call setUserResults(data)
    const searchUsersByUsername = async (query) => {
        // TODO: your backend logic here
    };

    // Add the selected user as a friend, then refresh the list (setFriends or fetchFriends)
    const addFriend = async (user) => {
        // TODO: your backend logic here
    };

    // Send the message in `text` to the active friend (activeId), then update setChats / setFriends
    const sendMessage = async (text) => {
        // TODO: your backend logic here
    };

    /* ---------------------------------------------------------------------- */
    /*  DERIVED VALUES                                                        */
    /* ---------------------------------------------------------------------- */

    const activeFriend = friends.find((f) => f.id === activeId) || null;
    const activeMessages = activeFriend ? chats[activeFriend.id] || [] : [];

    const filteredFriends = useMemo(
        () =>
            friends.filter((f) =>
                `${f.name} ${f.username}`.toLowerCase().includes(friendSearch.trim().toLowerCase())
            ),
        [friends, friendSearch]
    );

    /* ---------------------------------------------------------------------- */
    /*  SCROLLBAR STYLES (different look for each scroll area)                */
    /* ---------------------------------------------------------------------- */

    // Friend list: slim green scrollbar
    const friendScrollbar =
        '[scrollbar-width:thin] [scrollbar-color:#1F5F4A66_transparent] ' +
        '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ' +
        '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1F5F4A]/40 ' +
        'hover:[&::-webkit-scrollbar-thumb]:bg-[#1F5F4A]/70';

    // Messages: wider sand-coloured scrollbar
    const messageScrollbar =
        '[scrollbar-width:thin] [scrollbar-color:#B8AF98_#E3DDCC] ' +
        '[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-[#E3DDCC] ' +
        '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 ' +
        '[&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-[#E3DDCC] ' +
        '[&::-webkit-scrollbar-thumb]:bg-[#B8AF98]';

    /* ---------------------------------------------------------------------- */
    /*  UI HELPERS                                                            */
    /* ---------------------------------------------------------------------- */

    const avatarColors = ['#2F6F5E', '#B5651D', '#4A5D8F', '#8A4F7D', '#5B7B3A', '#9C4A4A'];

    // Plain helper (not a component) that returns the avatar markup
    const renderAvatar = (name = '?', size = 'h-12 w-12 text-base') => (
        <div
            className={`${size} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
            style={{ backgroundColor: avatarColors[name.charCodeAt(0) % avatarColors.length] }}
        >
            {name
                .split(' ')
                .map((w) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
        </div>
    );

    const openChat = (friend) => {
        setActiveId(friend.id);
        setFriends((prev) => prev.map((f) => (f.id === friend.id ? { ...f, unread: 0 } : f)));
    };

    const closeAddModal = () => {
        setShowAdd(false);
        setUserQuery('');
        setUserResults([]);
    };

    const handleAddFriend = async (user) => {
        await addFriend(user);
        closeAddModal();
    };

    const handleSend = async () => {
        const value = messageText.trim();
        if (!value || !activeId) return;
        setMessageText('');
        await sendMessage(value);
    };

    /* ---------------------------------------------------------------------- */
    /*  USEEFFECTS                                                               */
    /* ---------------------------------------------------------------------- */



    // SETUP WEBSOCKET CONNECTION

    const socketRef = useRef(null);

    useEffect(() => {
        const socket = connectWebSocket();
        socketRef.current = socket;

        socket.on("connect", () => console.log("connected", socket.id));
        socket.on("connect_error", (err) => console.log("socket error:", err.message));

        return () => {
            socket.disconnect();  
        };
    }, []);   


    // Load friends and establish websocket when the page opens
    useEffect(() => {
        fetchFriends();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load messages when a friend is selected
    useEffect(() => {
        if (activeId) fetchMessages(activeId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId]);

    // Scroll to newest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeMessages.length, activeId]);

    // Debounced username search for the add-friend modal
    useEffect(() => {
        if (!showAdd) return;
        if (!userQuery.trim()) {
            setUserResults([]);
            return;
        }
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                await searchUsersByUsername(userQuery.trim());
            } catch (err) {
                console.error(err);
                setUserResults([]);
            } finally {
                setSearching(false);
            }
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userQuery, showAdd]);

    /* ---------------------------------------------------------------------- */
    /*  UI                                                                    */
    /* ---------------------------------------------------------------------- */

    return (
        <>
            {/* Full-screen wrapper: never scrolls itself, only the inner areas do */}
            <div className="fixed inset-0 flex overflow-hidden bg-[#F4F1EA]">
                {/* ============ LEFT: FRIEND LIST (30% on desktop, full on mobile) ============ */}
                <aside
                    className={`${
                        activeFriend ? 'hidden md:flex' : 'flex'
                    } h-full min-h-0 w-full flex-col border-r border-[#E7E2D6] md:w-[30%] md:min-w-[300px]`}
                >
                    {/* Header (fixed) */}
                    <div className="shrink-0 px-4 pb-2 pt-4">
                        <div className="flex items-center justify-between gap-2">
                            <h1 className="text-xl font-semibold text-[#1E2420]">Chats</h1>
                            <button
                                onClick={() => setShowAdd(true)}
                                className="flex items-center gap-1.5 rounded-full bg-[#1F5F4A] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#184B3A]"
                            >
                                <UserPlus size={16} />
                                Add friend
                            </button>
                        </div>

                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#E9E4D6] px-3 py-2 focus-within:ring-1 focus-within:ring-[#1F5F4A]">
                            <Search size={16} className="text-[#7A7568]" />
                            <input
                                value={friendSearch}
                                onChange={(e) => setFriendSearch(e.target.value)}
                                placeholder="Search friends"
                                className="w-full bg-transparent text-sm outline-none placeholder:text-[#8A8579]"
                            />
                        </div>
                    </div>

                    {/* Scrollable friend list */}
                    <div className={`min-h-0 flex-1 overflow-y-auto border-t border-[#E7E2D6] ${friendScrollbar}`}>
                        {filteredFriends.length === 0 ? (
                            <p className="px-6 py-10 text-center text-sm text-[#7A7568]">
                                {friends.length === 0
                                    ? 'No friends yet. Use “Add friend” to find someone by username.'
                                    : `No friends match “${friendSearch}”.`}
                            </p>
                        ) : (
                            filteredFriends.map((friend) => (
                                <button
                                    key={friend.id}
                                    onClick={() => openChat(friend)}
                                    className={`flex w-full items-center gap-3 border-b border-[#E7E2D6] px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1F5F4A] ${
                                        friend.id === activeId ? 'bg-[#E6E0D0]' : 'hover:bg-[#EFEADD]'
                                    }`}
                                >
                                    {renderAvatar(friend.name)}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className="truncate font-medium text-[#1E2420]">{friend.name}</p>
                                            <span
                                                className={`shrink-0 text-xs ${
                                                    friend.unread ? 'font-semibold text-[#1F5F4A]' : 'text-[#7A7568]'
                                                }`}
                                            >
                                                {friend.time}
                                            </span>
                                        </div>
                                        <div className="mt-0.5 flex items-center justify-between gap-2">
                                            <p className="truncate text-sm text-[#6B675B]">{friend.lastMessage}</p>
                                            {friend.unread > 0 && (
                                                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#1F5F4A] px-1.5 text-xs font-semibold text-white">
                                                    {friend.unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                {/* ============ RIGHT: CHAT AREA ============ */}
                <section
                    className={`${activeFriend ? 'flex' : 'hidden md:flex'} h-full min-h-0 min-w-0 flex-1 flex-col`}
                >
                    {activeFriend ? (
                        <>
                            {/* Chat header (fixed at top) */}
                            <header className="flex shrink-0 items-center gap-2 border-b border-[#E7E2D6] bg-[#FBF9F4] px-2 py-3 sm:gap-3 sm:px-4">
                                <button
                                    onClick={() => setActiveId(null)}
                                    aria-label="Back to friends"
                                    className="rounded-full p-2 text-[#4A4A42] hover:bg-[#EFEADD] md:hidden"
                                >
                                    <ArrowLeft size={20} />
                                </button>

                                {renderAvatar(activeFriend.name, 'h-10 w-10 text-sm')}

                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-[#1E2420]">{activeFriend.name}</p>
                                    <p className="truncate text-xs text-[#7A7568]">@{activeFriend.username}</p>
                                </div>

                                <button
                                    aria-label="Voice call"
                                    className="rounded-full p-2.5 text-[#4A4A42] transition hover:bg-[#EFEADD]"
                                >
                                    <Phone size={20} />
                                </button>
                                <button
                                    aria-label="Video call"
                                    className="rounded-full p-2.5 text-[#4A4A42] transition hover:bg-[#EFEADD]"
                                >
                                    <Video size={20} />
                                </button>
                            </header>

                            {/* Scrollable messages (only this area scrolls) */}
                            <div
                                className={`min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#ECE7DA] px-3 py-4 sm:px-6 md:px-8 ${messageScrollbar}`}
                            >
                                {activeMessages.length === 0 && (
                                    <p className="pt-10 text-center text-sm text-[#7A7568]">
                                        No messages yet. Say hi to {activeFriend.name.split(' ')[0]}.
                                    </p>
                                )}

                                {activeMessages.map((m) => {
                                    const mine = m.from === 'me';
                                    return (
                                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm sm:max-w-[70%] ${
                                                    mine
                                                        ? 'rounded-br-sm bg-[#1F5F4A] text-white'
                                                        : 'rounded-bl-sm bg-white text-[#1E2420]'
                                                }`}
                                            >
                                                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                                    {m.text}
                                                </p>
                                                <p
                                                    className={`mt-1 text-right text-[11px] ${
                                                        mine ? 'text-white/70' : 'text-[#8A8579]'
                                                    }`}
                                                >
                                                    {m.time}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>

                            {/* Message input (pinned to bottom) */}
                            <footer className="flex shrink-0 items-end gap-2 border-t border-[#E7E2D6] bg-[#FBF9F4] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
                                <textarea
                                    rows={1}
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Type a message"
                                    className="max-h-32 min-w-0 flex-1 resize-none rounded-2xl border border-[#D9D3C3] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1F5F4A] focus:ring-1 focus:ring-[#1F5F4A]"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!messageText.trim()}
                                    aria-label="Send message"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1F5F4A] text-white transition hover:bg-[#184B3A] disabled:bg-[#C9C4B5]"
                                >
                                    <Send size={18} />
                                </button>
                            </footer>
                        </>
                    ) : (
                        // Empty state (desktop only, mobile shows the friend list instead)
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#ECE7DA] px-6 text-center">
                            <MessageCircle size={48} className="text-[#1F5F4A]" strokeWidth={1.5} />
                            <p className="text-lg font-medium text-[#1E2420]">Pick a friend to start chatting</p>
                            <p className="max-w-xs text-sm text-[#7A7568]">
                                Choose someone from your list, or add a new friend by username.
                            </p>
                        </div>
                    )}
                </section>
            </div>

            {/* ============ ADD FRIEND MODAL ============ */}
            {showAdd && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
                    onClick={closeAddModal}
                >
                    <div
                        role="dialog"
                        aria-label="Add friend"
                        className="w-full max-w-md rounded-t-2xl bg-[#FBF9F4] shadow-xl sm:rounded-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-[#E7E2D6] px-5 py-4">
                            <h2 className="text-lg font-semibold text-[#1E2420]">Add a friend</h2>
                            <button
                                onClick={closeAddModal}
                                aria-label="Close"
                                className="rounded-full p-1.5 text-[#6B675B] hover:bg-[#EFEADD]"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5">
                            <input
                                autoFocus
                                value={userQuery}
                                onChange={(e) => setUserQuery(e.target.value)}
                                placeholder="Enter a username"
                                className="w-full rounded-lg border border-[#D9D3C3] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1F5F4A] focus:ring-1 focus:ring-[#1F5F4A]"
                            />

                            <div className={`mt-4 max-h-64 overflow-y-auto ${friendScrollbar}`}>
                                {searching && (
                                    <p className="py-6 text-center text-sm text-[#7A7568]">Searching…</p>
                                )}

                                {!searching && !userQuery.trim() && (
                                    <p className="py-6 text-center text-sm text-[#7A7568]">
                                        Type a username to find people.
                                    </p>
                                )}

                                {!searching && userQuery.trim() && userResults.length === 0 && (
                                    <p className="py-6 text-center text-sm text-[#7A7568]">
                                        No one found with “{userQuery}”. Check the spelling and try again.
                                    </p>
                                )}

                                {!searching &&
                                    userResults.map((user) => {
                                        const already = friends.some((f) => f.id === user.id);
                                        return (
                                            <div
                                                key={user.id}
                                                className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-[#F1ECDF]"
                                            >
                                                {renderAvatar(user.name, 'h-10 w-10 text-sm')}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-[#1E2420]">
                                                        {user.name}
                                                    </p>
                                                    <p className="truncate text-xs text-[#7A7568]">@{user.username}</p>
                                                </div>
                                                <button
                                                    disabled={already}
                                                    onClick={() => handleAddFriend(user)}
                                                    className="rounded-full bg-[#1F5F4A] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#184B3A] disabled:bg-[#C9C4B5] disabled:text-[#6B675B]"
                                                >
                                                    {already ? 'Added' : 'Add'}
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Messages;