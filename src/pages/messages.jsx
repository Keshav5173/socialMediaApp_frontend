import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Search, UserPlus, Phone, Video, Send, X, MessageCircle, ArrowLeft,
    Paperclip, Image as ImageIcon, Film, FileText,
} from 'lucide-react';
import { connectWebSocket } from '../services/ws.services.js';
import * as messageApi from '../services/messages.services.js';
import VideoCall from './videoCall.jsx';
import useVideoCallStates from '../store/videoCall.store.js';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function Messages() {
    /* ---------------------------------------------------------------------- */
    /*  STATE – these variables are what the UI displays.                     */
    /* ---------------------------------------------------------------------- */

    // Friend list. Each item: { id, name, username, lastMessage, time, unread }
    const [friends, setFriends] = useState([]);

    // Messages grouped by friend id.
    // Shape: { [friendId]: [{ id, from: 'me' | 'friend', type, text, file, time }] }
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

    // Attachment picked but not sent yet: { file, type, previewUrl }
    const [attachment, setAttachment] = useState(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [uploading, setUploading] = useState(false);

    // video/voice call
    const [activeSocket, setActiveSocket] = useState(null);
    const initiateCall = useVideoCallStates((s) => s.initiateCall); 

    /* ---------------------------------------------------------------------- */
    /*  REFS                                                                  */
    /* ---------------------------------------------------------------------- */

    const bottomRef = useRef(null);
    const socketRef = useRef(null);
    // The socket listener runs once, so it reads the open chat from this ref
    const activeIdRef = useRef(null);
    // Same idea: lets the socket listener see the latest friend list
    const friendsRef = useRef([]);

    // Hidden file inputs
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const docInputRef = useRef(null);

    /* ---------------------------------------------------------------------- */
    /*  BACKEND FUNCTIONS                                                     */
    /* ---------------------------------------------------------------------- */

    const formatTime = (date) =>
        date
            ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : '';

    const getFileType = (file) =>
        file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';

    const formatSize = (bytes = 0) =>
        bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

    // Text shown in the friend list for non-text messages
    const previewFor = (type, text) => {
        if (text) return text;
        if (type === 'image') return '📷 Photo';
        if (type === 'video') return '🎥 Video';
        if (type === 'document') return '📄 Document';
        return '';
    };

    // Updates preview text + time in the friend list, bumps unread, moves chat to top
    const updateFriendPreview = (friendId, text, time, isIncoming) => {
        setFriends((prev) => {
            const target = prev.find((f) => f.id === friendId);
            if (!target) return prev;

            const updated = {
                ...target,
                lastMessage: text,
                time,
                unread:
                    isIncoming && friendId !== activeIdRef.current ? (target.unread || 0) + 1 : target.unread,
            };
            return [updated, ...prev.filter((f) => f.id !== friendId)];
        });
    };

    const fetchFriendsList = async () => {
        try {
            const data = await messageApi.fetchFriends();
            setFriends(data.map((f) => ({ ...f, time: formatTime(f.time) })));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPrevMessages = async (friendId) => {
        try {
            const data = await messageApi.fetchMessages(friendId);
            const formatted = data.map((m) => ({ ...m, time: formatTime(m.time) }));
            setChats((prev) => ({ ...prev, [friendId]: formatted }));
        } catch (err) {
            console.error(err);
        }
    };

    // No try/catch here: the debounced search effect handles errors
    const searchUser = async (query) => {
        const data = await messageApi.searchUsersByUsername(query);
        setUserResults(data);
    };

    const addFriendList = async (user) => {
        try {
            await messageApi.addFriend(user.id);
            await fetchFriendsList();
        } catch (err) {
            console.error(err);
        }
    };

    // payload: { type: 'text'|'image'|'video'|'document', text, file?: { url, name, size, mimeType } }
    // Sends through the socket; the backend saves it and replies via the ack callback
    const sendMessage = async (payload) => {
        const friendId = activeId; // remember which chat this message belongs to

        socketRef.current?.emit('sendMessage', { friendId, ...payload }, (res) => {
            if (!res?.success) {
                console.error(res?.message);
                return;
            }
            const time = formatTime(res.data.time);
            const type = res.data.type || payload.type;

            setChats((prev) => ({
                ...prev,
                [friendId]: [
                    ...(prev[friendId] || []),
                    {
                        id: res.data.id,
                        from: 'me',
                        type,
                        text: res.data.text,
                        file: res.data.file || payload.file,
                        time,
                    },
                ],
            }));
            updateFriendPreview(friendId, previewFor(type, res.data.text), time, false);
        });
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

    // Renders the image / video / document part of a message bubble
    const renderAttachment = (m, mine) => {
        if (!m.file) return null;

        if (m.type === 'image') {
            return (
                <a href={m.file.url} target="_blank" rel="noreferrer">
                    <img
                        src={m.file.url}
                        alt={m.file.name}
                        loading="lazy"
                        className="mb-1 max-h-72 w-full rounded-lg object-cover"
                    />
                </a>
            );
        }

        if (m.type === 'video') {
            return (
                <video
                    src={m.file.url}
                    controls
                    preload="metadata"
                    className="mb-1 max-h-72 w-full rounded-lg bg-black"
                />
            );
        }

        return (
            <a
                href={m.file.url}
                target="_blank"
                rel="noreferrer"
                download={m.file.name}
                className={`mb-1 flex items-center gap-3 rounded-lg p-2 ${
                    mine ? 'bg-white/15' : 'bg-black/5'
                }`}
            >
                <FileText size={28} className="shrink-0" />
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.file.name}</p>
                    <p className="text-xs opacity-70">{formatSize(m.file.size)}</p>
                </div>
            </a>
        );
    };

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
        await addFriendList(user);
        closeAddModal();
    };

    const clearAttachment = () => {
        if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        setAttachment(null);
    };

    const handleFilePick = (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allows picking the same file again
        setShowAttachMenu(false);
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            alert('File is too large (max 25 MB).');
            return;
        }
        if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        setMessageText(''); // a file message carries no text
        const type = getFileType(file);
        setAttachment({
            file,
            type,
            previewUrl: type === 'document' ? null : URL.createObjectURL(file),
        });
    };

    const handleSend = async () => {
        const value = messageText.trim();
        if ((!value && !attachment) || !activeId || uploading) return;

        try {
            let payload = { type: 'text', text: value };

            if (attachment) {
                setUploading(true);
                const uploaded = await messageApi.uploadAttachment(attachment.file); // -> { url }
                payload = {
                    type: attachment.type,
                    text: '', // files are sent without text
                    file: {
                        url: uploaded.url,
                        name: attachment.file.name,
                        size: attachment.file.size,
                        mimeType: attachment.file.type,
                    },
                };
            }

            setMessageText('');
            clearAttachment();
            await sendMessage(payload);
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    /* ---------------------------------------------------------------------- */
    /*  USE EFFECTS                                                           */
    /* ---------------------------------------------------------------------- */

    // WebSocket: connect once when the page opens, listen for incoming messages
    useEffect(() => {
        const socket = connectWebSocket();
        socketRef.current = socket;

        setActiveSocket(socket);

        socket.on('connect', () => console.log('connected', socket.id));
        socket.on('connect_error', (err) => console.log('socket error:', err.message));

        // Someone added me: show them in my list instantly
        socket.on('friendAdded', (newFriend) => {
            setFriends((prev) =>
                prev.some((f) => f.id === newFriend.id)
                    ? prev
                    : [{ ...newFriend, time: formatTime(newFriend.time) }, ...prev]
            );
        });

        socket.on('receiveMessage', (data) => {
            // sender isn't in my list yet -> reload the list from the server
            if (!friendsRef.current.some((f) => f.id === data.friendId)) {
                fetchFriendsList();
            }

            const time = formatTime(data.time);
            const type = data.type || 'text';

            // add to that friend's chat
            setChats((prev) => ({
                ...prev,
                [data.friendId]: [
                    ...(prev[data.friendId] || []),
                    { id: data.id, from: 'friend', type, text: data.text, file: data.file, time },
                ],
            }));

            // update the friend list preview + unread badge
            updateFriendPreview(data.friendId, previewFor(type, data.text), time, true);
        });

        return () => {
            socket.off('receiveMessage');
            socket.off('friendAdded');
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the friends ref current for the socket listener
    useEffect(() => {
        friendsRef.current = friends;
    }, [friends]);

    // Load friends when the page opens
    useEffect(() => {
        fetchFriendsList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // When a friend is selected: keep the ref current and load their messages
    useEffect(() => {
        activeIdRef.current = activeId;
        if (activeId) fetchPrevMessages(activeId);
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
                await searchUser(userQuery.trim());
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

    // Drop any pending attachment when switching chats
    useEffect(() => {
        setAttachment((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
            return null;
        });
        setShowAttachMenu(false);
    }, [activeId]);

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
                                    onClick={() => initiateCall?.(activeFriend.id, activeFriend.name, 'video')}
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
                                                {renderAttachment(m, mine)}
                                                {m.text && (
                                                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                                        {m.text}
                                                    </p>
                                                )}
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

                            {/* Preview of the picked file */}
                            {attachment && (
                                <div className="flex shrink-0 items-center gap-3 border-t border-[#E7E2D6] bg-[#FBF9F4] px-4 py-2">
                                    {attachment.type === 'image' && (
                                        <img
                                            src={attachment.previewUrl}
                                            alt=""
                                            className="h-14 w-14 rounded-lg object-cover"
                                        />
                                    )}
                                    {attachment.type === 'video' && (
                                        <video
                                            src={attachment.previewUrl}
                                            className="h-14 w-14 rounded-lg bg-black object-cover"
                                        />
                                    )}
                                    {attachment.type === 'document' && (
                                        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#E9E4D6]">
                                            <FileText size={26} className="text-[#1F5F4A]" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-[#1E2420]">
                                            {attachment.file.name}
                                        </p>
                                        <p className="text-xs text-[#7A7568]">{formatSize(attachment.file.size)}</p>
                                    </div>
                                    <button
                                        onClick={clearAttachment}
                                        aria-label="Remove attachment"
                                        className="rounded-full p-1.5 text-[#6B675B] hover:bg-[#EFEADD]"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}

                            {/* Message input (pinned to bottom) */}
                            <footer className="flex shrink-0 items-end gap-2 border-t border-[#E7E2D6] bg-[#FBF9F4] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
                                {/* Hidden file inputs */}
                                <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleFilePick} />
                                <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={handleFilePick} />
                                <input
                                    ref={docInputRef}
                                    type="file"
                                    hidden
                                    onChange={handleFilePick}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                                />

                                {/* Attach button + popup menu */}
                                <div className="relative shrink-0">
                                    <button
                                        onClick={() => setShowAttachMenu((s) => !s)}
                                        aria-label="Attach file"
                                        className="flex h-10 w-10 items-center justify-center rounded-full text-[#4A4A42] transition hover:bg-[#EFEADD]"
                                    >
                                        <Paperclip size={20} />
                                    </button>

                                    {showAttachMenu && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setShowAttachMenu(false)}
                                            />
                                            <div className="absolute bottom-12 left-0 z-20 w-44 overflow-hidden rounded-xl border border-[#E7E2D6] bg-[#FBF9F4] py-1 shadow-lg">
                                                <button
                                                    onClick={() => imageInputRef.current?.click()}
                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#1E2420] hover:bg-[#EFEADD]"
                                                >
                                                    <ImageIcon size={18} className="text-[#4A5D8F]" /> Photo
                                                </button>
                                                <button
                                                    onClick={() => videoInputRef.current?.click()}
                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#1E2420] hover:bg-[#EFEADD]"
                                                >
                                                    <Film size={18} className="text-[#8A4F7D]" /> Video
                                                </button>
                                                <button
                                                    onClick={() => docInputRef.current?.click()}
                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#1E2420] hover:bg-[#EFEADD]"
                                                >
                                                    <FileText size={18} className="text-[#B5651D]" /> Document
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <textarea
                                    rows={1}
                                    value={messageText}
                                    disabled={!!attachment}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder={attachment ? 'Remove the file to type a message' : 'Type a message'}
                                    className="max-h-32 min-w-0 flex-1 resize-none rounded-2xl border border-[#D9D3C3] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1F5F4A] focus:ring-1 focus:ring-[#1F5F4A] disabled:cursor-not-allowed disabled:bg-[#EFEADD] disabled:placeholder:text-[#8A8579]"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={(!messageText.trim() && !attachment) || uploading}
                                    aria-label="Send message"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1F5F4A] text-white transition hover:bg-[#184B3A] disabled:bg-[#C9C4B5]"
                                >
                                    {uploading ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    ) : (
                                        <Send size={18} />
                                    )}
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
            <VideoCall socket={activeSocket} />
        </>
    );
}

export default Messages;