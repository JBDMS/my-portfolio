// pages/chat.js
"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Head from "next/head";
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    orderBy, 
    query, 
    serverTimestamp, 
    where, 
    doc, 
    updateDoc, 
    getFirestore,
    setLogLevel
} from "firebase/firestore";

import { firestore } from "../lib/firebase"; 
import { useAuth } from "../components/AuthContext"; 

if (typeof window !== 'undefined') {
    setLogLevel('debug');
    console.log("Firestore Debugging is ON.");
}

export default function Chat() {
    const { 
        user, 
        profile, 
        loading: authLoading, 
        signOut, 
        uid 
    } = useAuth();
    
    const [contacts, setContacts] = useState([]); 
    const [currentChatUser, setCurrentChatUser] = useState(null); 
    const [currentChatUserStatus, setCurrentChatUserStatus] = useState(null); 
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [dataLoading, setDataLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const chatBoxRef = useRef(null);
    const textAreaRef = useRef(null); 

    const formatLastActive = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return "Offline";
        const date = timestamp.toDate();
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "Active now";
        if (diffInSeconds < 3600) return `Active ${Math.floor(diffInSeconds / 60)}m ago`;
        
        if (date.getDate() === now.getDate() && date.getFullYear() === now.getFullYear()) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        return date.toLocaleDateString();
    };

    const updateUserStatus = useCallback(async (isOnline) => {
        if (!uid) {
            console.warn("Update status skipped: UID is null.");
            return;
        }
        
        const userRef = doc(firestore, "users", uid);
        
        try {
            await updateDoc(userRef, {
                lastActive: isOnline ? serverTimestamp() : new Date(),
                isOnline: isOnline 
            });
            console.log(`User ${uid} status updated to: ${isOnline ? 'Online' : 'Offline'}`);
        } catch (e) {
            console.error("Error updating user status:", e);
        }
    }, [uid]);
    
    useEffect(() => {
        if (!uid) return;
        
        updateUserStatus(true); 

        const handleBeforeUnload = () => {
            updateUserStatus(false);
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            updateUserStatus(false); 
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [uid, updateUserStatus]);

    useEffect(() => {
        if (chatBoxRef.current) {
            setTimeout(() => {
                if (chatBoxRef.current) {
                    chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
                }
            }, 100); 
        }
    }, [messages]);
    
    useEffect(() => {
        if (textAreaRef.current) { 
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }, [text]); 

    useEffect(() => {
        if (!authLoading && !user) {
            console.log("User not authenticated, redirecting to /signin");
            window.location.href = "/signin"; 
        }
    }, [authLoading, user]);
    
    useEffect(() => {
        if (!currentChatUser?.uid) {
            setCurrentChatUserStatus(null);
            return;
        }

        const userRef = doc(firestore, "users", currentChatUser.uid);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setCurrentChatUserStatus(docSnap.data());
            }
        }, (error) => {
            console.error("Error fetching contact status:", error);
        });

        return unsubscribe;
    }, [currentChatUser]);

    useEffect(() => {
        if (!uid) {
            if (!authLoading) setDataLoading(false);
            return;
        }
        setDataLoading(true);

        const fetchContacts = () => {
            console.log(`Fetching contacts, excluding current UID: ${uid}`);
            try {
                const usersQuery = query(
                    collection(firestore, "users"),
                    where("uid", "!=", uid) 
                );
                
                const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
                    console.log(`Contacts snapshot received: ${snapshot.docs.length} users found.`);
                    const userList = snapshot.docs.map(doc => ({
                        ...doc.data(),
                        id: doc.id,
                    }));
                    setContacts(userList);
                    setDataLoading(false);
                    return unsubscribe;
                }, (error) => {
                    console.error("Error fetching contacts (onSnapshot):", error);
                    setDataLoading(false);
                });

                return unsubscribe;
            } catch (e) {
                console.error("Error setting up contacts listener:", e);
                setDataLoading(false);
                return () => {}; 
            }
        };

        const unsubscribe = fetchContacts();
        
        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        }; 
    }, [uid, authLoading]);

    useEffect(() => {
        if (!uid || !currentChatUser) {
            setMessages([]);
            return;
        }
        
        const chatId = [uid, currentChatUser.uid].sort().join("_"); 
        console.log(`Listening to Chat ID: ${chatId}`);

        try {
            const q = query(
                collection(firestore, "chats", chatId, "messages"),
                orderBy("createdAt", "asc")
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                console.log(`Messages snapshot received: ${snapshot.docs.length} messages.`);
                const msgs = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setMessages(msgs);
            }, (error) => {
                console.error("Error fetching messages (onSnapshot):", error);
            });

            return unsubscribe; 
        } catch (e) {
            console.error("Error setting up messages listener:", e);
            return () => {}; 
        }
    }, [uid, currentChatUser]);

    const sendMessage = async () => {
        if (!text.trim() || !currentChatUser || !uid) {
            console.warn("Message send failed: Missing text, currentChatUser, or UID.");
            return;
        }

        const chatId = [uid, currentChatUser.uid].sort().join("_"); 
        
        try {
            const messageRef = collection(firestore, "chats", chatId, "messages");
            await addDoc(messageRef, {
                senderId: uid, 
                text: text.trim(),
                createdAt: serverTimestamp(),
            });
            console.log(`Message sent successfully to chatId: ${chatId}`);
            setText("");
        } catch (e) {
            console.error("Error sending message (addDoc):", e);
            console.error(`Failed to send message: ${e.message}. Check your Firestore Security Rules and network connection.`);
        }
    };

    const handleLogout = async () => {
        await updateUserStatus(false); 
        await signOut();
        window.location.href = "/signin"; 
    };
    
    const handleSelectUser = (userObject) => {
        setCurrentChatUser(userObject);
        setMessages([]);
        setIsSidebarOpen(false);
    }

    if (authLoading || dataLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-content">
                    <div className="spinner"></div>
                    <p>Loading FlashChat...</p>
                </div>
                <style jsx>{`
                    .loading-screen {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
                        color: #fff;
                    }
                    .loading-content {
                        text-align: center;
                    }
                    .spinner {
                        width: 50px;
                        height: 50px;
                        border: 4px solid rgba(59, 130, 246, 0.1);
                        border-top: 4px solid #3b82f6;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>FlashChat | Chat</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>

            <style jsx global>{`
                html, body, #__next {
                    height: 100%;
                    margin: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
                }
                
                .main-container {
                    display: flex;
                    height: 100vh;
                    overflow: hidden;
                    color: #e6edf3;
                    position: relative;
                }
                
                .sidebar {
                    width: 320px;
                    background: rgba(22, 27, 34, 0.95);
                    backdrop-filter: blur(10px);
                    border-right: 1px solid rgba(48, 54, 61, 0.5);
                    display: flex;
                    flex-direction: column;
                    transition: transform 0.3s ease;
                }
                
                .sidebar-header {
                    padding: 20px;
                    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                    border-bottom: 1px solid rgba(59, 130, 246, 0.2);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                }
                
                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 15px;
                }
                
                .user-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: bold;
                    color: white;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                }
                
                .user-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .user-name {
                    font-size: 16px;
                    font-weight: 600;
                    color: #e6edf3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .user-status {
                    font-size: 12px;
                    color: #10b981;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #10b981;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                .logout-btn {
                    width: 100%;
                    padding: 10px;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
                }
                
                .logout-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
                }
                
                .contact-list {
                    flex-grow: 1;
                    overflow-y: auto;
                    padding: 10px;
                }
                
                .contact-list::-webkit-scrollbar {
                    width: 8px;
                }
                
                .contact-list::-webkit-scrollbar-track {
                    background: rgba(22, 27, 34, 0.5);
                }
                
                .contact-list::-webkit-scrollbar-thumb {
                    background: rgba(59, 130, 246, 0.3);
                    border-radius: 4px;
                }
                
                .contact-list::-webkit-scrollbar-thumb:hover {
                    background: rgba(59, 130, 246, 0.5);
                }
                
                .contact-item {
                    padding: 14px;
                    margin-bottom: 8px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(48, 54, 61, 0.3);
                    border: 1px solid transparent;
                }
                
                .contact-item:hover {
                    background: rgba(59, 130, 246, 0.1);
                    border-color: rgba(59, 130, 246, 0.3);
                    transform: translateX(4px);
                }
                
                .contact-item.active {
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%);
                    border-color: rgba(59, 130, 246, 0.5);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
                }
                
                .contact-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    font-weight: bold;
                    color: white;
                    flex-shrink: 0;
                    position: relative;
                }
                
                .contact-online-indicator {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #10b981;
                    border: 2px solid #161b22;
                }
                
                .contact-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .contact-name {
                    font-weight: 600;
                    color: #e6edf3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 4px;
                }
                
                .contact-uid {
                    font-size: 11px;
                    color: #7d8590;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .chat-area {
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                    background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
                }
                
                .chat-header {
                    padding: 20px 24px;
                    background: rgba(22, 27, 34, 0.95);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(48, 54, 61, 0.5);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }
                
                .menu-toggle {
                    display: none;
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 8px;
                    padding: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .menu-toggle:hover {
                    background: rgba(59, 130, 246, 0.2);
                }
                
                .chat-header-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: bold;
                    color: white;
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
                }
                
                .chat-header-info h2 {
                    font-size: 18px;
                    font-weight: 600;
                    color: #e6edf3;
                    margin: 0 0 4px 0;
                }
                
                .chat-header-status {
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .chat-header-status.online {
                    color: #10b981;
                }
                
                .chat-header-status.offline {
                    color: #7d8590;
                }
                
                .chat-messages {
                    flex-grow: 1;
                    padding: 24px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                
                .chat-messages::-webkit-scrollbar {
                    width: 10px;
                }
                
                .chat-messages::-webkit-scrollbar-track {
                    background: rgba(13, 17, 23, 0.5);
                }
                
                .chat-messages::-webkit-scrollbar-thumb {
                    background: rgba(59, 130, 246, 0.3);
                    border-radius: 5px;
                }
                
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    text-align: center;
                    color: #7d8590;
                    gap: 16px;
                }
                
                .empty-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: rgba(59, 130, 246, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 40px;
                }
                
                .message-wrapper {
                    display: flex;
                    margin-bottom: 4px;
                }
                
                .message-wrapper.sender {
                    justify-content: flex-end;
                }
                
                .message-wrapper.receiver {
                    justify-content: flex-start;
                }
                
                .message-container {
                    max-width: 70%;
                    display: flex;
                    flex-direction: column;
                }
                
                .message-sender-name {
                    font-size: 12px;
                    color: #7d8590;
                    margin-bottom: 6px;
                    padding: 0 4px;
                }
                
                .message-bubble {
                    padding: 12px 16px;
                    border-radius: 16px;
                    word-wrap: break-word;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                    animation: messageSlideIn 0.3s ease;
                }
                
                @keyframes messageSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .message-bubble.sender {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    border-bottom-right-radius: 4px;
                }
                
                .message-bubble.receiver {
                    background: rgba(48, 54, 61, 0.6);
                    color: #e6edf3;
                    border-bottom-left-radius: 4px;
                }
                
                .message-text {
                    margin-bottom: 6px;
                    line-height: 1.5;
                }
                
                .message-time {
                    font-size: 11px;
                    opacity: 0.7;
                }
                
                .message-input-area {
                    padding: 20px 24px;
                    background: rgba(22, 27, 34, 0.95);
                    backdrop-filter: blur(10px);
                    border-top: 1px solid rgba(48, 54, 61, 0.5);
                }
                
                .input-container {
                    display: flex;
                    align-items: flex-end;
                    gap: 12px;
                    background: rgba(48, 54, 61, 0.4);
                    padding: 8px;
                    border-radius: 24px;
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    transition: all 0.3s ease;
                }
                
                .input-container:focus-within {
                    border-color: rgba(59, 130, 246, 0.5);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                
                .message-textarea {
                    flex-grow: 1;
                    padding: 10px 16px;
                    background: transparent;
                    border: none;
                    color: #e6edf3;
                    resize: none;
                    max-height: 150px;
                    font-size: 15px;
                    line-height: 1.5;
                }
                
                .message-textarea:focus {
                    outline: none;
                }
                
                .message-textarea::placeholder {
                    color: #7d8590;
                }
                
                .send-button {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                }
                
                .send-button:not(:disabled):hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
                }
                
                .send-button:disabled {
                    background: rgba(107, 114, 128, 0.3);
                    cursor: not-allowed;
                    box-shadow: none;
                }
                
                @media (max-width: 768px) {
                    .sidebar {
                        position: fixed;
                        left: 0;
                        top: 0;
                        height: 100vh;
                        z-index: 100;
                        transform: translateX(-100%);
                    }
                    
                    .sidebar.open {
                        transform: translateX(0);
                    }
                    
                    .menu-toggle {
                        display: flex;
                    }
                    
                    .chat-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.5);
                        z-index: 99;
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.3s ease;
                    }
                    
                    .chat-overlay.visible {
                        opacity: 1;
                        pointer-events: all;
                    }
                    
                    .message-container {
                        max-width: 85%;
                    }
                    
                    .chat-messages {
                        padding: 16px;
                    }
                }
            `}</style>

            <div className="main-container">
                {isSidebarOpen && (
                    <div 
                        className={`chat-overlay ${isSidebarOpen ? 'visible' : ''}`}
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
                
                <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                    <div className="sidebar-header">
                        <div className="user-profile">
                            <div className="user-avatar">
                                {profile?.displayName ? profile.displayName[0].toUpperCase() : profile?.email?.[0].toUpperCase() || 'U'}
                            </div>
                            <div className="user-info">
                                <div className="user-name">
                                    {profile?.displayName || profile?.email || "FlashChat User"}
                                </div>
                                <div className="user-status">
                                    <span className="status-dot"></span>
                                    Online
                                </div>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="logout-btn">
                            Logout
                        </button>
                    </div>
                    
                    <div className="contact-list">
                        {contacts.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#7d8590' }}>
                                No contacts yet. Invite friends to chat!
                            </div>
                        )}
                        {contacts.map((contact) => (
                            <div
                                key={contact.uid}
                                className={`contact-item ${currentChatUser?.uid === contact.uid ? 'active' : ''}`}
                                onClick={() => handleSelectUser(contact)}
                            >
                                <div className="contact-avatar">
                                    {contact.displayName ? contact.displayName[0].toUpperCase() : 'U'}
                                    {contact.isOnline && <div className="contact-online-indicator" />}
                                </div>
                                <div className="contact-info">
                                    <div className="contact-name">
                                        {contact.displayName || contact.email || "Unknown User"}
                                    </div>
                                    <div className="contact-uid">
                                        {contact.isOnline ? 'Online' : formatLastActive(contact.lastActive)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chat-area">
                    <div className="chat-header">
                        <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                        
                        {currentChatUser ? (
                            <>
                                <div className="chat-header-avatar">
                                    {currentChatUser.displayName ? currentChatUser.displayName[0].toUpperCase() : 'U'}
                                </div>
                                <div className="chat-header-info">
                                    <h2>{currentChatUser.displayName || currentChatUser.email}</h2>
                                    <div className={`chat-header-status ${currentChatUserStatus?.isOnline ? 'online' : 'offline'}`}>
                                        {currentChatUserStatus?.isOnline 
                                            ? "● Online" 
                                            : formatLastActive(currentChatUserStatus?.lastActive)
                                        }
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="chat-header-info">
                                <h2>FlashChat</h2>
                                <div className="chat-header-status offline">Select a contact to start chatting</div>
                            </div>
                        )}
                    </div>
                    
                    <div ref={chatBoxRef} className="chat-messages">
                        {!currentChatUser ? (
                            <div className="empty-state">
                                <div className="empty-icon">💬</div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Welcome to FlashChat</p>
                                    <p>Select a contact from the sidebar to start chatting</p>
                                </div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">🚀</div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No messages yet</p>
                                    <p>Start the conversation with {currentChatUser.displayName || currentChatUser.email}!</p>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isSender = msg.senderId === uid;
                                const senderName = isSender 
                                    ? (profile?.displayName || 'You') 
                                    : (currentChatUser?.displayName || 'Contact');
                                    
                                return (
                                    <div key={msg.id} className={`message-wrapper ${isSender ? 'sender' : 'receiver'}`}>
                                        <div className="message-container">
                                            <div className={`message-sender-name ${isSender ? 'text-right' : 'text-left'}`}>
                                                {senderName}
                                            </div>
                                            <div className={`message-bubble ${isSender ? 'sender' : 'receiver'}`}>
                                                <div className="message-text">{msg.text}</div>
                                                <div className={`message-time ${isSender ? 'text-right' : 'text-left'}`}>
                                                    {msg.createdAt?.toDate
                                                        ? msg.createdAt.toDate().toLocaleTimeString([], {
                                                              hour: "2-digit",
                                                              minute: "2-digit",
                                                          })
                                                        : "sending..."}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="message-input-area">
                        <div className="input-container">
                            <textarea 
                                ref={textAreaRef}
                                rows={1}
                                className="message-textarea"
                                placeholder={currentChatUser ? "Type a message..." : "Select a contact first..."}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault(); 
                                        sendMessage();
                                    }
                                }}
                                disabled={!currentChatUser}
                            />
                            <button 
                                onClick={sendMessage} 
                                disabled={!currentChatUser || !text.trim()}
                                className="send-button"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}