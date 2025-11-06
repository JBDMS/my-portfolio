// components/RecentChats.js
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

export default function RecentChats({ onSelectChat }) {
  const { appUserId } = useAuth();
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!appUserId) return;
    const q = query(collection(db, "chats"), where("participants", "array-contains", appUserId));
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [appUserId]);

  return (
    <div>
      <h3>Recent Chats</h3>
      {chats.map(chat => (
        <div key={chat.id} onClick={() => onSelectChat(chat.id)} style={{ cursor: "pointer", padding: "0.5rem", border: "1px solid #ccc", marginBottom: 8 }}>
          {chat.isGroup ? `Group: ${chat.name || chat.id}` : `Chat with ${chat.participants?.find(p => p !== appUserId) || "Unknown"}`}
        </div>
      ))}
    </div>
  );
}

