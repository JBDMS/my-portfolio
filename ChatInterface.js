// components/ChatInterface.js
import { useEffect, useRef, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useAuth } from "./AuthContext";

export default function ChatInterface({ selectedUser }) {
  const { uid, appUserId } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const scrollRef = useRef();

  // Deterministic chat ID (sorted two uids joined)
  const chatId = selectedUser ? [uid, selectedUser.uid].sort().join("_") : null;

  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsub();
  }, [chatId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !file) return;

    try {
      let mediaUrl = null;
      let mediaType = null;

      if (file) {
        const fileRef = ref(storage, `chats/${chatId}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        mediaUrl = await getDownloadURL(fileRef);
        mediaType = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
          ? "video"
          : "file";
      }

      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderUid: uid,
        senderAppId: appUserId,
        text: text.trim(),
        timestamp: serverTimestamp(),
        mediaUrl,
        mediaType,
      });

      setText("");
      setFile(null);
    } catch (err) {
      console.error("Send failed:", err);
      alert("Error sending message.");
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((m) => {
          const isMine = m.senderUid === uid;
          return (
            <div key={m.id} className={`msg ${isMine ? "mine" : "other"}`}>
              {m.text && <div className="text">{m.text}</div>}
              {m.mediaUrl && m.mediaType === "image" && (
                <img src={m.mediaUrl} alt="attachment" />
              )}
              {m.mediaUrl && m.mediaType === "video" && (
                <video controls>
                  <source src={m.mediaUrl} />
                </video>
              )}
              {m.mediaUrl && m.mediaType === "file" && (
                <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="file-link">
                  📎 Download File
                </a>
              )}
              <div className="meta">
                {m.senderAppId}{" "}
                {m.timestamp?.toDate && (
                  <small>{m.timestamp.toDate().toLocaleString()}</small>
                )}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <form className="composer" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <label className="fileLabel" title="Attach file 📎">
          📎
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ display: "none" }}
          />
        </label>
        <button type="submit" aria-label="Send message">➤</button>
      </form>

      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 80vh;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .messages {
          flex: 1;
          padding: 12px;
          overflow-y: auto;
          background: #f9f9f9;
          display: flex;
          flex-direction: column;
        }
        .msg {
          max-width: 60%;
          padding: 10px 14px;
          margin-bottom: 12px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.4;
          position: relative;
          word-break: break-word;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        }
        .msg.mine {
          background-color: #0a84ff;
          color: white;
          margin-left: auto;
          border-bottom-right-radius: 3px;
        }
        .msg.other {
          background-color: #444;
          color: #ddd;
          margin-right: auto;
          border-bottom-left-radius: 3px;
        }
        .msg img,
        .msg video {
          max-width: 220px;
          margin-top: 8px;
          border-radius: 10px;
          display: block;
        }
        .file-link {
          color: white;
          text-decoration: underline;
          margin-top: 8px;
          display: inline-block;
        }
        .meta {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 6px;
          text-align: right;
          font-family: monospace;
        }
        .composer {
          display: flex;
          align-items: center;
          padding: 10px 15px;
          border-top: 1px solid #ccc;
          background: #fff;
        }
        .composer input[type="text"] {
          flex: 1;
          border: none;
          border-radius: 20px;
          padding: 10px 14px;
          font-size: 15px;
          outline: none;
          background: #f0f2f5;
        }
        .composer button {
          margin-left: 10px;
          background: #0a84ff;
          border: none;
          color: white;
          padding: 8px 14px;
          border-radius: 20px;
          cursor: pointer;
          transition: background-color 0.2s;
          font-size: 16px;
          line-height: 1;
        }
        .composer button:hover {
          background: #006ae6;
        }
        .fileLabel {
          font-size: 22px;
          margin-left: 8px;
          cursor: pointer;
          user-select: none;
        }
      `}</style>
    </div>
  );
}
