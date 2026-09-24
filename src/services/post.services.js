import api from "./auth.services";

const POSTS_PER_PAGE = 10;

export async function loadPosts(excludeIds = []) {
    const params = { limit: POSTS_PER_PAGE };

    if (excludeIds.length) {
        params.exclude = excludeIds.join(",");
    }

    // adjust the path below to match wherever loadPost is actually mounted
    const { data } = await api.get("/post/load-post", { params });
    return data.data; 
}


export async function loadComments(postId) {
    console.log("Post Id for loading comment", postId)
    const { data } = await api.get("/post/load-comment", { params: { postId }  });
    return data.data;
}

export async function createComment(postId, content) {
    
    const { data } = await api.post("/post/create-comment", { content, postId });
    return data.data;
}

export async function createLike(postId){
    const { data } = await api.post("/post/like-post", {postId});

    return data.data;
}

export async function alreadyLiked(postId){
    const { data } = await api.get("/post/check-post-like", { params: { postId } });

    return data.data.alreadyLikedPost;
}

export async function createPost(formData) {
    console.log(formData);
    const { data } = await api.post("/post/create-post", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    window.location.href = "/dashboard";
    return data;
}
