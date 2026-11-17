import api from "./auth.services";

async function fetchFriends() {
    const { data } = await api.get("/chat/fetchFriendList");
    return data.data;
}

async function fetchMessages(friendId) {
    // if your route uses a URL param instead, use: api.get(`/message/fetch-messages/${friendId}`)
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

async function uploadAttachment(file) {
    const form = new FormData();
    form.append("file", file);

    const { data } = await api.post("/chat/upload", form, {
        headers: { "Content-Type": undefined },
    });
    console.log("file url: ", data.data);
    const url = data.data;
    return { url };
}

export {
    fetchFriends,
    fetchMessages,
    searchUsersByUsername,
    addFriend,
    uploadAttachment,
};