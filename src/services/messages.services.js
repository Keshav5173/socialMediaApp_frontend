import api from "./auth.services";

async function fetchFriends() {
    const { data } = await api.get("/chat/fetchFriendList");
    return data.data;
}

async function fetchMessages(friendId) {
    // if your route uses a URL param instead, use: api.get(`/message/fetch-messages/${friendId}`)
    console.log("friendId in prams", friendId);
    const { data } = await api.get(`/chat/fetchMessages/${friendId}`);
    return data.data;
}

async function searchUsersByUsername(username) {
    const { data } = await api.get("/chat/searchUsers", { params: { username } });
    return data.data;
}

async function addFriend(friendId) {
    const { data } = await api.post("/chat/addFriend", { friendId });
    return data.data;
}

export {
    fetchFriends,
    fetchMessages,
    searchUsersByUsername,
    addFriend
}