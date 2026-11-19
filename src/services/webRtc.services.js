import { useEffect, useCallback } from "react";
import useVideoCallStates from "../store/videoCall.store.js";

const ICE_CONFIG = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const store = useVideoCallStates; // use store.getState() to always read fresh values

function useWebRTC(socket, user) {
    // ---------- create camera stream + peer connection ----------
    const createPeer = useCallback(async () => {
        const { callType, setLocalStream, setRemoteStream, setPeerConnection } = store.getState();

        const stream = await navigator.mediaDevices.getUserMedia({
            video: callType === "video",
            audio: true,
        });
        setLocalStream(stream);

        const pc = new RTCPeerConnection(ICE_CONFIG);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // remote video/audio arrives here
        pc.ontrack = (e) => setRemoteStream(e.streams[0]);

        // send my ICE candidates to the other user
        pc.onicecandidate = (e) => {
            if (!e.candidate) return;
            const { currentCall } = store.getState();
            if (!currentCall) return;
            socket.emit("webrtc_ice_candidate", {
                candidate: e.candidate,
                receiverId: currentCall.participantId,
                callId: currentCall.callId,
            });
        };

        pc.onconnectionstatechange = () => {
            const { setCallStatus, setCallActive } = store.getState();
            if (pc.connectionState === "connected") {
                setCallStatus("connected");
                setCallActive(true);
            }
            if (pc.connectionState === "failed") {
                hangUp();
            }
        };

        setPeerConnection(pc);
        return pc;
    }, [socket]);

    // ---------- receiver clicks Accept ----------
    const acceptCall = useCallback(async () => {
        const { incomingCall, setCurrentCall, setCallStatus, clearIncommingCall } = store.getState();
        if (!incomingCall) return;

        setCurrentCall({
            callId: incomingCall.callId,
            participantId: incomingCall.callerId,
            participantName: incomingCall.callerName,
        });
        setCallStatus("connecting");

        try {
            await createPeer(); // camera ready BEFORE telling the caller
        } catch (err) {
            console.error(err);
            alert("Could not access camera/microphone");
            rejectCall();
            return;
        }

        socket.emit("accept_call", {
            callerId: incomingCall.callerId,
            callId: incomingCall.callId,
            receiverInfo: { username: user?.username },
        });
        clearIncommingCall();
    }, [socket, user, createPeer]);

    // ---------- receiver clicks Reject ----------
    const rejectCall = useCallback(() => {
        const { incomingCall, endCall } = store.getState();
        if (incomingCall) {
            socket.emit("reject_call", {
                callerId: incomingCall.callerId,
                callId: incomingCall.callId,
            });
        }
        endCall();
    }, [socket]);

    // ---------- hang up (or cancel while ringing) ----------
    const hangUp = useCallback(() => {
        const { currentCall, endCall } = store.getState();
        if (currentCall) {
            socket.emit("end_call", {
                participantId: currentCall.participantId,
                callId: currentCall.callId,
            });
        }
        endCall();
    }, [socket]);

    // ---------- socket listeners for signaling ----------
    useEffect(() => {
        if (!socket) return;

        // caller: receiver accepted, so start the offer
        const onCallAccepted = async () => {
            const { currentCall, setCallStatus } = store.getState();
            if (!currentCall) return;
            setCallStatus("connecting");

            try {
                const pc = await createPeer();
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                socket.emit("webrtc_offer", {
                    offer,
                    receiverId: currentCall.participantId,
                    callId: currentCall.callId,
                });
            } catch (err) {
                console.error(err);
                alert("Could not access camera/microphone");
                hangUp();
            }
        };

        // receiver: got the offer, so send an answer
        const onOffer = async ({ offer }) => {
            const { peerConnection: pc, currentCall, processQueuedIceCandidates } = store.getState();
            if (!pc || !currentCall) return;

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            await processQueuedIceCandidates();

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("webrtc_answer", {
                answer,
                receiverId: currentCall.participantId,
                callId: currentCall.callId,
            });
        };

        // caller: got the answer
        const onAnswer = async ({ answer }) => {
            const { peerConnection: pc, processQueuedIceCandidates } = store.getState();
            if (!pc) return;

            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            await processQueuedIceCandidates();
        };

        // both: got an ICE candidate
        const onIceCandidate = async ({ candidate }) => {
            const { peerConnection: pc, addIceCandidate } = store.getState();

            if (pc && pc.remoteDescription) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("ICE error", err);
                }
            } else {
                addIceCandidate(candidate); // queue until remote description is set
            }
        };

        socket.on("call_accepted", onCallAccepted);
        socket.on("webrtc_offer", onOffer);
        socket.on("webrtc_answer", onAnswer);
        socket.on("webrtc_ice_candidate", onIceCandidate);

        return () => {
            socket.off("call_accepted", onCallAccepted);
            socket.off("webrtc_offer", onOffer);
            socket.off("webrtc_answer", onAnswer);
            socket.off("webrtc_ice_candidate", onIceCandidate);
        };
    }, [socket, createPeer, hangUp]);

    return { acceptCall, rejectCall, hangUp };
}

export default useWebRTC;