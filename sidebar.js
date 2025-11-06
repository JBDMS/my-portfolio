// components/Sidebar.js
import { useState } from "react";

export default function Sidebar() {
  const [chatRooms] = useState([
    { name: "General", id: "general" },
    { name: "Programming", id: "programming" },
    { name: "Music", id: "music" },
    { name: "Video Games", id: "video-games" },
  ]);

  const [directMessages] = useState([
    { name: "Shawn D'silva", id: "shawn", username: "shawn" },
    { name: "Steven Armstrong", id: "steven", username: "senator" },
  ]);

  return (
    <div className="sidebar-container">
      <div className="profile-section">
        <img src="/path-to-avatar.jpg" alt="User avatar" className="avatar" />
        <span className="username">Jack Raiden</span>
        <button className="logout-btn">🔈</button>
      </div>

      <div className="chat-rooms">
        <h3>Chat-Rooms</h3>
        {chatRooms.map((room) => (
          <div key={room.id} className="room-item">
            # {room.name}
          </div>
        ))}
      </div>

      <div className="direct-messages">
        <h3>Direct Message</h3>
        {directMessages.map((dm) => (
          <div key={dm.id} className="dm-item">
            {dm.name} <small>({dm.username})</small>
          </div>
        ))}
      </div>

      <style jsx>{`
        .sidebar-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #fff;
          border-right: 1px solid #ddd;
          font-family: Arial, sans-serif;
          color: #333;
        }
        .profile-section {
          padding: 10px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #ddd;
          gap: 10px;
        }
        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          object-fit: cover;
        }
        .username {
          font-weight: 600;
          font-size: 16px;
          color: #0078ff;
          cursor: pointer;
        }
        .logout-btn {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
        }
        .chat-rooms, .direct-messages {
          padding: 15px 10px;
          flex: 1;
          overflow-y: auto;
        }
        h3 {
          margin: 10px 0;
          font-size: 14px;
          color: #555;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        .room-item, .dm-item {
          padding: 6px 10px;
          cursor: pointer;
          border-radius: 4px;
          font-size: 14px;
        }
        .room-item:hover, .dm-item:hover {
          background: #e4f0f5;
          color: #0a84ff;
        }
      `}</style>
    </div>
  );
}
