import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

const useVideoCallStates = create(
    subscribeWithSelector((set, get) => ({
        // Call state
        currentCall: null,
        incomingCall: null,
        isCallActive: false,
        callType: null,

        // Media state
        localStream: null,
        remoteStream: null,
        isVideoEnabled: true,
        isAudioEnabled: true,

        // WebRTC
        peerConnection: null,
        iceCandidatesQueue: [],

        isCallModelOpen: false,
        callStatus: "idle", // idle, calling, ringing, connecting, connected, failed

        // function to start a call (set by the VideoCall component)
        initiateCall: null,

        // Actions
        setCurrentCall: (call) => {
            set({ currentCall: call });
        },

        setIncommingCall: (call) => {
            set({ incomingCall: call });
        },

        setCallActive: (active) => {
            set({ isCallActive: active });
        },

        setCallType: (type) => {
            set({ callType: type });
        },

        setLocalStream: (stream) => {
            set({ localStream: stream });
        },

        setRemoteStream: (stream) => {
            set({ remoteStream: stream });
        },

        setPeerConnection: (pc) => {
            set({ peerConnection: pc });
        },

        setCallModelOpen: (open) => {
            set({ isCallModelOpen: open });
        },

        setCallStatus: (status) => {
            set({ callStatus: status });
        },

        addIceCandidate: (candidate) => {
            const { iceCandidatesQueue } = get();
            set({ iceCandidatesQueue: [...iceCandidatesQueue, candidate] });
        },

        processQueuedIceCandidates: async () => {
            const { peerConnection, iceCandidatesQueue } = get();

            if (
                peerConnection &&
                peerConnection.remoteDescription &&
                iceCandidatesQueue.length > 0
            ) {
                for (const candidate of iceCandidatesQueue) {
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (err) {
                        console.error("Error while processing ICE candidates", err);
                    }
                }
                set({ iceCandidatesQueue: [] });
            }
        },

        toggleVideo: () => {
            const { localStream, isVideoEnabled } = get();
            const videoTrack = localStream?.getVideoTracks()[0];

            if (videoTrack) {
                videoTrack.enabled = !isVideoEnabled;
                set({ isVideoEnabled: !isVideoEnabled });
            }
        },

        toggleAudio: () => {
            const { localStream, isAudioEnabled } = get();
            const audioTrack = localStream?.getAudioTracks()[0];

            if (audioTrack) {
                audioTrack.enabled = !isAudioEnabled;
                set({ isAudioEnabled: !isAudioEnabled });
            }
        },

        endCall: () => {
            const { localStream, peerConnection } = get();

            if (localStream) {
                localStream.getTracks().forEach((track) => track.stop());
            }

            if (peerConnection) {
                peerConnection.close();
            }

            set({
                currentCall: null,
                incomingCall: null,
                isCallActive: false,
                callType: null,
                localStream: null,
                remoteStream: null,
                isVideoEnabled: true,
                isAudioEnabled: true,
                peerConnection: null,
                iceCandidatesQueue: [],
                isCallModelOpen: false,
                callStatus: "idle",
            });
        },

        clearIncommingCall: () => {
            set({ incomingCall: null });
        },
    }))
);

export default useVideoCallStates;