import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white flex flex-col items-center justify-center px-4">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Hi, I’m Sheetal 👋
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-6 max-w-2xl">
          A creative video editor and influencer passionate about modern storytelling, viral content, and visual magic.
        </p>
      </div>

      {/* Call-to-Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href="#projects"
          className="bg-blue-600 px-8 py-3 rounded-lg hover:bg-blue-500 transition duration-300 text-center"
        >
          View My Work
        </a>
        <a
          href="#contact"
          className="border-2 border-white px-8 py-3 rounded-lg hover:bg-white hover:text-black transition duration-300 text-center"
        >
          Contact Me
        </a>
      </div>

      {/* Optional message */}
      <div className="mt-12">
        <p className="text-gray-400">Scroll down to explore my latest edits!</p>
      </div>

      {/* ↓ Add these sections ↓ */}
      <section id="projects" className="mt-32 w-full text-center">
        <h2 className="text-4xl font-semibold mb-6">🎬 My Projects</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Here you’ll soon find my best video edits, collaborations, and social media campaigns.
        </p>
      </section>

      <section id="contact" className="mt-32 w-full text-center">
        <h2 className="text-4xl font-semibold mb-6">📩 Contact Me</h2>
        <p className="text-gray-400">
          Want to work together? Drop a message at{" "}
          <a href="mailto:sheetal@example.com" className="text-blue-400 underline">
            sheetal@example.com
          </a>
        </p>
      </section>
    </main>
  );
}
