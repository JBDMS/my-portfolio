// components/Footer.js
export default function Footer() {
  return (
    <footer className="fc-footer">
      <div>© {new Date().getFullYear()} FLASHCHAT</div>
      <style jsx>{`
        .fc-footer {
          padding: 18px;
          text-align: center;
          color: #9a9a9a;
          font-size: 14px;
        }
      `}</style>
    </footer>
  );
}
