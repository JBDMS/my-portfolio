"use client";
import { useEffect, useState } from "react";
import Head from "next/head";
import { firestore, auth } from "../lib/firebase";

import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

export default function Chat() {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [currentChatUser, setCurrentChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // Load user from localStorage
  useEffect(() => {
    const localUser = localStorage.getItem("flashchatUser");
    if (!localUser) {
      window.location.href = "/login";
    } else {
      // Assuming localUser is just a username string; parse if JSON
      setUser(localUser);
      setContacts(["Aarav", "Meera", "Ravi", "Sheetal", "Admin"]);
    }
  }, []);

  // Listen to realtime messages for current chat
  useEffect(() => {
    if (!user || !currentChatUser) return;

    const chatId = [user, currentChatUser].sort().join("_");
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return unsubscribe;
  }, [user, currentChatUser]);

  // Send message handler
  const sendMessage = async () => {
    if (!text.trim() || !currentChatUser) return;

    const chatId = [user, currentChatUser].sort().join("_");
    await addDoc(collection(db, "chats", chatId, "messages"), {
      username: user,
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    setText("");
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem("flashchatUser");
    window.location.href = "/login";
  };

  return (
    <>
      <Head>
        <title>FlashChat | Chat</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <style jsx global>{`
        /* Your CSS styles unchanged */
      `}</style>

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <span>{user}</span>
          <button onClick={logout}>Logout</button>
        </div>
        <div className="contacts">
          {contacts.map((name, i) => (
            <div
              key={i}
              className="contact"
              onClick={() => setCurrentChatUser(name)}
            >
              {name}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        <div className="chat-header">
          {currentChatUser ? `Chat with ${currentChatUser}` : "Select a chat"}
        </div>
        <div className="chat-box">
          {messages.map((msg) => (
            <div key={msg.id}>
              <div
                className={`message ${
                  msg.username === user ? "sent" : "received"
                }`}
              >
                {msg.text}
              </div>
              <div className="timestamp">
                {msg.createdAt?.toDate
                  ? msg.createdAt.toDate().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="chat-input">
          <input
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={!currentChatUser}
          />
          <button onClick={sendMessage} disabled={!currentChatUser || !text.trim()}>
            ➤
          </button>
        </div>
      </div>
    </>
  );
}
