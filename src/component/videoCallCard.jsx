import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone } from "lucide-react";
import useVideoCallStates from "../store/videoCall.store.js";

const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function VideoCallCard({ acceptCall, rejectCall, hangUp }) {
    const {
        isCallModelOpen,
        callStatus,
        callType,
        incomingCall,
        currentCall,
        localStream,
        remoteStream,
        isVideoEnabled,
        isAudioEnabled,
        toggleVideo,
        toggleAudio,
    } = useVideoCallStates();

    const localRef = useRef(null);
    const remoteRef = useRef(null);
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (localRef.current) localRef.current.srcObject = localStream;
    }, [localStream, isCallModelOpen]);

    useEffect(() => {
        if (remoteRef.current) remoteRef.current.srcObject = remoteStream;
    }, [remoteStream, isCallModelOpen]);

    // call timer
    useEffect(() => {
        if (callStatus !== "connected") {
            setSeconds(0);
            return;
        }
        const id = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [callStatus]);

    if (!isCallModelOpen) return null;

    const name = incomingCall?.callerName || currentCall?.participantName || "Unknown";
    const isVideoCall = callType === "video";
    const isRinging = callStatus === "ringing";
    const isConnected = callStatus === "connected";
    const showRemoteVideo = isVideoCall && isConnected && !!remoteStream;
    const showLocalVideo = isVideoCall && !!localStream && isVideoEnabled;

    const statusText = {
        ringing: `Incoming ${isVideoCall ? "video" : "voice"} call`,
        calling: "Calling...",
        connecting: "Connecting...",
        connected: formatTime(seconds),
        failed: "Call failed",
    }[callStatus];

    return (
        <div className="fixed inset-0 z-[1000] flex flex-col overflow-hidden bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-white">
            {/* Remote video (full screen) */}
            <video
                ref={remoteRef}
                autoPlay
                playsInline
                className={`absolute inset-0 h-full w-full object-cover ${showRemoteVideo ? "" : "hidden"}`}
            />

            {/* Dark overlays so text and buttons stay readable over video */}
            {showRemoteVideo && (
                <>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
                </>
            )}

            {/* Top info */}
            <div
                className={`relative z-10 flex flex-col items-center px-4 pt-12 ${
                    showRemoteVideo ? "" : "flex-1 justify-center pb-24"
                }`}
            >
                {/* Avatar (shown when there is no remote video) */}
                {!showRemoteVideo && (
                    <div className="relative mb-6 flex items-center justify-center">
                        {(isRinging || callStatus === "calling") && (
                            <>
                                <span className="absolute h-36 w-36 animate-ping rounded-full bg-white/10" />
                                <span className="absolute h-44 w-44 animate-pulse rounded-full bg-white/5" />
                            </>
                        )}
                        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-5xl font-semibold uppercase shadow-2xl">
                            {name.charAt(0)}
                        </div>
                    </div>
                )}

                <h2 className={`font-semibold drop-shadow ${showRemoteVideo ? "text-lg" : "text-3xl"}`}>
                    {name}
                </h2>
                <p
                    className={`mt-1 text-sm drop-shadow ${
                        callStatus === "failed" ? "text-red-400" : "text-zinc-300"
                    }`}
                >
                    {statusText}
                </p>
            </div>

            {/* Self view (picture-in-picture) */}
            <video
                ref={localRef}
                autoPlay
                playsInline
                muted
                className={`absolute right-4 top-16 z-20 h-40 w-28 -scale-x-100 rounded-2xl border border-white/20 bg-zinc-800 object-cover shadow-xl sm:h-48 sm:w-36 ${
                    showLocalVideo ? "" : "hidden"
                }`}
            />

            {/* Controls */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-10">
                {isRinging ? (
                    // Incoming call: decline / accept
                    <div className="flex items-center gap-16">
                        <div className="flex flex-col items-center gap-2">
                            <button
                                onClick={rejectCall}
                                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg transition hover:bg-red-600 active:scale-95"
                            >
                                <PhoneOff size={28} />
                            </button>
                            <span className="text-xs text-zinc-300">Decline</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <button
                                onClick={acceptCall}
                                className="flex h-16 w-16 animate-bounce items-center justify-center rounded-full bg-green-500 shadow-lg transition hover:bg-green-600 active:scale-95"
                            >
                                {isVideoCall ? <Video size={28} /> : <Phone size={28} />}
                            </button>
                            <span className="text-xs text-zinc-300">Accept</span>
                        </div>
                    </div>
                ) : (
                    // In call: mute / camera / end
                    <div className="flex items-center gap-4 rounded-full bg-white/10 px-6 py-3 backdrop-blur-md">
                        <button
                            onClick={toggleAudio}
                            className={`flex h-14 w-14 items-center justify-center rounded-full transition active:scale-95 ${
                                isAudioEnabled ? "bg-white/20 hover:bg-white/30" : "bg-white text-black"
                            }`}
                        >
                            {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                        </button>

                        {isVideoCall && (
                            <button
                                onClick={toggleVideo}
                                className={`flex h-14 w-14 items-center justify-center rounded-full transition active:scale-95 ${
                                    isVideoEnabled ? "bg-white/20 hover:bg-white/30" : "bg-white text-black"
                                }`}
                            >
                                {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                            </button>
                        )}

                        <button
                            onClick={hangUp}
                            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 transition hover:bg-red-600 active:scale-95"
                        >
                            <PhoneOff size={24} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VideoCallCard;