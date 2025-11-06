import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

// --- Global Variables (Canvas Environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-chat-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
// --- END Global Variables ---

// Default profile data structure
const DEFAULT_PROFILE = {
  fullname: 'Guest User',
  username: 'anonymous_user',
  email: 'guest@example.com',
  phone: 'N/A',
  profilePic: 'https://placehold.co/130x130/0af/ffffff?text=U',
  // joinedAt will be replaced by a Firestore timestamp on first load/creation
  joinedAt: new Date(Date.now()).toISOString(),
};

// --------------------------------------------------------------------------------
// FIREBASE & AUTH SETUP HOOK
// --------------------------------------------------------------------------------
const useFirebaseSetup = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (!firebaseConfig) {
      console.error("Firebase config is missing.");
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);

      setDb(firestore);
      setAuth(authInstance);

      const authenticate = async (auth) => {
        try {
          // Retry logic for sign-in with exponential backoff (max 3 retries)
          for (let i = 0; i < 3; i++) {
            try {
              if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
              } else {
                await signInAnonymously(auth);
              }
              return; // Success, exit function
            } catch (error) {
              if (i < 2) {
                // Exponential backoff: 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
              } else {
                throw error; // Last retry failed
              }
            }
          }
        } catch (error) {
          console.error("Firebase Auth Error after retries:", error);
        }
      };

      const unsubscribe = onAuthStateChanged(authInstance, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          setUserId(crypto.randomUUID());
        }
        setIsAuthReady(true);
      });

      authenticate(authInstance);
      return () => unsubscribe();
    } catch (e) {
      console.error("Error initializing Firebase:", e);
    }
  }, []);

  return { db, auth, userId, isAuthReady };
};

// --------------------------------------------------------------------------------
// MAIN APP COMPONENT
// --------------------------------------------------------------------------------

const App = () => {
  const { db, auth, userId, isAuthReady } = useFirebaseSetup();
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Define the path for the private user profile document
  const profileDocPath = useMemo(() => {
    if (userId) {
      return `artifacts/${appId}/users/${userId}/user_data/profile_doc`;
    }
    return null;
  }, [userId]);

  // Non-blocking alert function
  const alertMessage = (message, type) => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 5000);
  }

  // --- Data Fetching Effect ---
  useEffect(() => {
    if (!db || !userId || !profileDocPath) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const docRef = doc(db, profileDocPath);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            ...DEFAULT_PROFILE,
            ...data,
            // Convert Firestore Timestamp to ISO string for consistency
            joinedAt: data.joinedAt?.toDate ? data.joinedAt.toDate().toISOString() : data.joinedAt || DEFAULT_PROFILE.joinedAt,
          });
        } else {
          // Create mock profile if it doesn't exist
          const mockProfileData = {
            ...DEFAULT_PROFILE,
            fullname: `User ${userId.substring(0, 8)}`,
            username: `user_${userId.substring(0, 6)}`,
            email: `${userId.substring(0, 4)}@chat.app`,
            joinedAt: serverTimestamp(),
            profilePic: `https://placehold.co/130x130/${Math.floor(Math.random()*16777215).toString(16)}/ffffff?text=${userId.substring(0, 1)}`,
          };
          await setDoc(docRef, mockProfileData);
          setProfile({
            ...mockProfileData,
            joinedAt: new Date().toISOString() // Show current time until next full load
          });
        }
      } catch (error) {
        console.error("Error fetching or creating profile:", error);
        alertMessage("Failed to load profile. See console for details.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [db, userId, profileDocPath]);

  // --- Action Handlers ---

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      alertMessage("Logged out successfully! Refresh the page to sign in anonymously again.", "success");
    } catch (error) {
      alertMessage("Logout failed: " + error.message, "error");
    }
  };

  const handleCopyId = (textToCopy) => {
    const tempInput = document.createElement('textarea');
    tempInput.value = textToCopy;
    document.body.appendChild(tempInput);
    
    // Select the text for cross-browser compatibility
    tempInput.select();
    tempInput.setSelectionRange(0, 99999);

    try {
      // document.execCommand('copy') is the mandatory method
      document.execCommand('copy');
      alertMessage(`Copied FLASHCHAT ID to clipboard!`, "success");
    } catch (err) {
      console.error('Copy failed:', err);
      alertMessage("Copy failed. Please copy the ID manually.", "error");
    }

    // Clean up
    document.body.removeChild(tempInput);
  };


  // --- Computed Values ---

  const formattedJoinDate = useMemo(() => {
    try {
      return new Date(profile.joinedAt).toLocaleDateString();
    } catch {
      return 'Unknown Date';
    }
  }, [profile.joinedAt]);


  // --- Tailwind Classes for Design ---
  const glassCardClasses = `
    bg-white/15 backdrop-blur-md rounded-[25px] p-8 sm:p-10 w-full max-w-lg text-white
    shadow-2xl border border-white/20 transition-all duration-400
    hover:translate-y-[-8px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]
  `;
  const btnClasses = `
    flex-1 mx-2 sm:mx-4
    bg-gradient-to-r from-[#00aaff] to-[#2b6777] text-white py-3 px-6 rounded-full
    font-medium text-base sm:text-lg transition-all duration-300 transform
    hover:scale-[1.05] hover:from-[#2b6777] hover:to-[#00aaff]
    shadow-lg shadow-black/30 whitespace-nowrap
  `;
  const detailClasses = "flex justify-between items-center py-2 border-b border-white/10";
  const detailLabelClasses = "text-white/80 font-normal";
  const detailValueClasses = "text-[#0af] font-semibold text-right break-all";


  // --- Render Logic ---

  if (!isAuthReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0b33] via-[#1c1d5c] to-[#2b6777] font-sans">
        <p className="text-white text-xl animate-pulse">Initializing & Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0a0b33] via-[#1c1d5c] to-[#2b6777] font-sans">
      
      {/* Decorative Glow Ring (CSS Animation) */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-400/25 top-[-150px] left-[-100px] blur-[80px] z-0 animate-pulse-slow">
        <style>{`
          @keyframes pulse-slow {
            0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.25; }
            50% { transform: scale(1.2) rotate(20deg); opacity: 0.45; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 6s infinite alternate;
          }
        `}</style>
      </div>

      <div className={`relative z-10 ${glassCardClasses}`}>
        {/* Error/Success Message Box */}
        {errorMessage && (
          <div className="absolute top-0 left-0 right-0 p-3 bg-red-600/90 text-white rounded-t-[25px] text-sm font-medium transition-all duration-300 transform -translate-y-full">
            {errorMessage}
          </div>
        )}

        <img
          src={profile.profilePic}
          alt="Profile"
          className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-[#0af] object-cover mb-4 mx-auto transition-transform duration-300 hover:scale-[1.05] hover:border-[#2b6777]"
        />
        <h2 className="text-3xl font-bold mb-2 text-white">
          {profile.fullname}
        </h2>
        
        {/* Connection Status Section */}
        <div className="p-3 bg-white/10 rounded-xl mb-6 text-center shadow-inner">
          <p className="font-semibold text-lg">Connection Status</p>
          <div className="flex items-center justify-center mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-green-300 text-sm font-medium">
              **Connected** (Viewing Your Profile)
            </p>
          </div>
        </div>
        
        {/* FLASHCHAT ID Section */}
        <div className="space-y-1 text-left">
          <h3 className="text-lg font-bold mt-4 mb-2 border-b border-white/30 pb-1">FlashChat ID (User Identifier)</h3>
          
          <div className="bg-white/10 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white/80 mb-1">Your unique ID:</p>
              <p className="text-xl font-mono text-[#00ffff] break-all">{userId}</p>
            </div>
            <button
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition duration-200 shadow-md flex-shrink-0"
              onClick={() => handleCopyId(userId)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M9 6a2 2 0 012-2h4a2 2 0 012 2v4M12 18h.01" />
              </svg>
              Copy ID
            </button>
          </div>
          <p className="text-xs text-white/60 pt-2 pb-4 italic">Share this ID to let friends connect with you directly.</p>

          {/* Registration and Details Section */}
          <h3 className="text-lg font-bold mt-4 mb-2 border-b border-white/30 pb-1">User Details</h3>
          <div className={detailClasses}>
            <span className={detailLabelClasses}>Username:</span>
            <span className={detailValueClasses}>{profile.username}</span>
          </div>
          <div className={detailClasses}>
            <span className={detailLabelClasses}>Email:</span>
            <span className={detailValueClasses}>{profile.email}</span>
          </div>
          <div className={detailClasses}>
            <span className={detailLabelClasses}>Phone:</span>
            <span className={detailValueClasses}>{profile.phone}</span>
          </div>
          <div className={detailClasses}>
            <span className={detailLabelClasses}>Joined Since:</span>
            <span className={detailValueClasses}>{formattedJoinDate}</span>
          </div>
        </div>

        <div className="flex justify-center mt-8">
          <button className={btnClasses} onClick={() => console.log('Simulating navigation to Chat Page.')}>
            Go to Chat
          </button>
          
          <button className={btnClasses + ' bg-red-600/80 hover:from-red-600 hover:to-red-700'} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;