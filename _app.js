import AuthProvider from "../components/AuthContext";
import AnalyticsLoader from "../components/AnalyticsLoader";
import "../styles/globals.css";

export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AnalyticsLoader />
      <Component {...pageProps} />
    </AuthProvider>
  );
}
