// components/UserList.js
"use client";

import { useEffect, useState } from "react";
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function UserList({ onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    let unsubscribeAuth;

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const currentUserId = user.uid;

        // Query chats collection: where current user is participant
        const chatsQuery = query(
          collection(db, "chats"),
          where("participants", "array-contains", currentUserId)
        );

        const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
          const chatUserIds = new Set();

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            data.participants.forEach((uid) => {
              if (uid !== currentUserId) chatUserIds.add(uid);
            });
          });

          const userList = [];
          for (let uid of chatUserIds) {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              userList.push({
                uid,
                name: data.displayName || data.email || "Unknown User",
              });
            }
          }

          setUsers(userList);
          setLoading(false);
        });

        return () => unsubscribe();
      } else {
        console.log("No user logged in.");
        setUsers([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth && unsubscribeAuth();
  }, []);

  return (
    <div className="user-list">
      <h3 className="user-list-title">Chats</h3>

      {loading ? (
        <p className="loading">Loading chats...</p>
      ) : users.length === 0 ? (
        <p className="no-chats">No recent chats yet.</p>
      ) : (
        users.map((u) => (
          <div
            key={u.uid}
            className="user-item"
            onClick={() => onSelectUser(u)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && onSelectUser(u)}
          >
            <span className="user-avatar">💬</span>
            <span className="user-name">{u.name}</span>
          </div>
        ))
      )}

      <style jsx>{`
        .user-list {
          padding: 15px;
          font-family: Inter, sans-serif;
        }
        .user-list-title {
          font-size: 16px;
          color: #2b6777;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .loading,
        .no-chats {
          font-size: 14px;
          color: #777;
          text-align: center;
          margin-top: 20px;
        }
        .user-item {
          display: flex;
          align-items: center;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
          background: #f9f9f9;
          color: #333;
        }
        .user-item:hover, .user-item:focus {
          background: #e4f0f5;
          outline: none;
        }
        .user-avatar {
          font-size: 20px;
          margin-right: 10px;
        }
        .user-name {
          font-size: 15px;
        }
      `}</style>
    </div>
  );
}
