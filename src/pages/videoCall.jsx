import { useCallback, useEffect, useState } from "react";
import api from "../services/auth.services.js"; 
import useVideoCallStates from "../store/videoCall.store";
import VideoCallCard from "../component/videoCallCard.jsx";
import useWebRTC from "../services/webRtc.services.js";

function VideoCall({ socket }) {
    const {
        setCurrentCall,
        setIncommingCall,
        setCallType,
        setCallModelOpen,
        setCallStatus,
        endCall,
    } = useVideoCallStates();
    
    
    const [user, setUser] = useState(null);
    
    const { acceptCall, rejectCall, hangUp } = useWebRTC(socket, user);
    
    // load profile
    useEffect(() => {
        async function fetchProfile() {
            try {
                const response = await api.get("/users/viewProfile");
                setUser(response.data.data);
            } catch (err) {
                console.error("Failed to load profile", err);
            }
        }
        fetchProfile();
    }, []);

    // socket listeners
    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = ({ callerId, callerName, callType, callId }) => {
            setIncommingCall({ callerId, callerName, callId });
            setCallType(callType);
            setCallModelOpen(true);
            setCallStatus("ringing");
        };

        const handleCallFailed = () => {
            setCallStatus("failed");
            setTimeout(() => endCall(), 2000);
        };

        const handleCallEnded = () => endCall();

        socket.on("incoming_call", handleIncomingCall);
        socket.on("call_failed", handleCallFailed);
        socket.on("call_rejected", handleCallEnded);
        socket.on("call_ended", handleCallEnded);

        return () => {
            socket.off("incoming_call", handleIncomingCall);
            socket.off("call_failed", handleCallFailed);
            socket.off("call_rejected", handleCallEnded);
            socket.off("call_ended", handleCallEnded);
        };
    }, [socket, setIncommingCall, setCallType, setCallModelOpen, setCallStatus, endCall]);

    // start a call
    const initiateCall = useCallback(
        (receiverId, receiverName, callType = "video") => {
            if (!socket || !user) return;

            const callId = `${user._id}-${receiverId}-${Date.now()}`;

            setCurrentCall({
                callId,
                participantId: receiverId,
                participantName: receiverName,
            });
            setCallType(callType);
            setCallModelOpen(true);
            setCallStatus("calling");

            socket.emit("initiate_call", {
                receiverId,
                callType,
                callId,
                callerInfo: { username: user.username },
            });
        },
        [user, socket, setCurrentCall, setCallType, setCallModelOpen, setCallStatus]
    );

    // make it available to any component through the store
    useEffect(() => {
        useVideoCallStates.setState({ initiateCall });
    }, [initiateCall]);

    return <VideoCallCard acceptCall={acceptCall} rejectCall={rejectCall} hangUp={hangUp} />;
}

export default VideoCall;