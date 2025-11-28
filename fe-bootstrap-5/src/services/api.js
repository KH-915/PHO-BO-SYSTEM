import axios from 'axios';

// --- CONFIGURATION ---
// Set this to TRUE to use fake data. Set to FALSE to use real Backend.
const USE_MOCK_DATA = true; 

// Basic Axios Config
const api = axios.create({
    baseURL: 'http://localhost:8000', 
    headers: { 'Content-Type': 'application/json' }
});

// Auto-inject Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- HELPER: Simulate Network Delay ---
const mockDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// --- MOCK DATA STORE ---
const MOCK_USER = {
    id: 1,
    email: "admin@test.com",
    first_name: "Admin",
    last_name: "User",
    avatar_url: "https://ui-avatars.com/api/?name=Admin+User&background=random"
};

const MOCK_POSTS = [
    {
        id: 101,
        content: "Hello world! This is a mock post for testing UI.",
        created_at: new Date().toISOString(),
        author: { name: "Nguyen Van A", avatar: "https://ui-avatars.com/api/?name=Nguyen+A" },
        likes: 5,
        comments_count: 2
    },
    {
        id: 102,
        content: "React is awesome with Mock Data.",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        author: { name: "Tran Thi B", avatar: "https://ui-avatars.com/api/?name=Tran+B" },
        likes: 12,
        comments_count: 0
    }
];

// --- AUTH SERVICES ---

export const login = async (email, password) => {
    if (USE_MOCK_DATA) {
        await mockDelay();
        // Allow any login or force specific credentials
        if (email === "admin" || email.includes("@")) { 
            const token = "fake-jwt-token-123456";
            localStorage.setItem('token', token); // IMPORTANT: Save token for App logic
            return { 
                data: { 
                    access_token: token, 
                    user: MOCK_USER 
                } 
            };
        }
        throw new Error("Invalid credentials");
    }
    return api.post('/api/login', { email, password });
};

export const register = async (userData) => {
    if (USE_MOCK_DATA) {
        await mockDelay();
        return { data: { message: "User registered successfully", user: userData } };
    }
    return api.post('/api/register', userData);
};

export const getMe = async () => {
    if (USE_MOCK_DATA) {
        await mockDelay();
        return { data: MOCK_USER };
    }
    return api.get('/api/users/me');
};

// --- USER & FRIEND SERVICES ---

export const getAllUsers = async () => {
    if (USE_MOCK_DATA) {
        await mockDelay();
        return { 
            data: [
                { id: 2, first_name: "Le", last_name: "C", email: "lec@test.com", avatar_url: null },
                { id: 3, first_name: "Pham", last_name: "D", email: "phamd@test.com", avatar_url: null },
                { id: 4, first_name: "Hoang", last_name: "E", email: "hoange@test.com", avatar_url: null },
            ] 
        };
    }
    return api.get('/api/users');
};

// Aliasing to fix your specific error in FriendManager.jsx
export const getAllUsersRequest = getAllUsers; 

export const getFriendRequests = async () => {
    if (USE_MOCK_DATA) {
        await mockDelay();
        return { 
            data: [
                { 
                    id: 55, // requestId
                    sender: { id: 10, first_name: "Stranger", last_name: "Danger", avatar_url: null },
                    created_at: new Date().toISOString()
                }
            ]
        };
    }
    return api.get('/api/friend/requests');
};

export const sendFriendRequest = async (userId) => {
    if (USE_MOCK_DATA) {
        await mockDelay();
        return { data: { message: `Request sent to user ${userId}` } };
    }
    return api.post(`/api/friend/request/${userId}`);
};

export const acceptFriendRequest = async (requestId) => {
    if (USE_MOCK_DATA) {
        await mockDelay();
        return { data: { message: "Friend request accepted" } };
    }
    return api.post(`/api/friend/accept/${requestId}`);
};

// Aliasing to fix your previous error
export const acceptFriendRequestApi = acceptFriendRequest;

// --- POST SERVICES ---

export const getFeed = async () => {
    if (USE_MOCK_DATA) {
        await mockDelay();
        return { data: MOCK_POSTS };
    }
    return api.get('/api/posts');
};

export const createPost = async (content) => {
    if (USE_MOCK_DATA) {
        await mockDelay();
        const newPost = {
            id: Math.floor(Math.random() * 1000),
            content: content,
            created_at: new Date().toISOString(),
            author: { name: MOCK_USER.first_name, avatar: MOCK_USER.avatar_url },
            likes: 0,
            comments_count: 0
        };
        // Note: This won't actually update MOCK_POSTS array permanently on refresh
        // because React state holds the data, but it returns the right format.
        return { data: newPost };
    }
    return api.post('/api/posts', { content });
};

export const getComments = async (postId) => {
    if (USE_MOCK_DATA) {
        await mockDelay();
        return { 
            data: [
                { id: 1, content: "Nice post!", author: "User A" },
                { id: 2, content: "Agreed.", author: "User B" }
            ] 
        };
    }
    return api.get(`/api/posts/${postId}/comments`);
};

export const addComment = async (postId, content) => {
    if (USE_MOCK_DATA) {
        await mockDelay();
        return { data: { id: Date.now(), content, author: "Me" } };
    }
    return api.post(`/api/posts/${postId}/comments`, { content });
};

export const reactToPost = async (targetId, type = 'like') => {
    if (USE_MOCK_DATA) {
        await mockDelay();
        return { data: { message: "Reacted successfully" } };
    }
    return api.post('/api/react', {
        target_type: 'post',
        target_id: targetId,
        reaction_type: type
    });
};

export default api;