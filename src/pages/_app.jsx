import 'styles/globals.css'
import { Provider as ConnectionProvider } from 'context/connect'
import { SessionProvider, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Sidebar from 'components/Sidebar';
import Head from 'next/head';
import { mainConfig } from 'config/config';

function AuthWrapper({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isPublicRoute =
    router.pathname === '/' ||
    router.pathname.startsWith('/api/auth') ||
    router.pathname === '/auth/error';

  if (status === 'loading') return null;

  if (!session && !isPublicRoute) {
    if (typeof window !== 'undefined') {
      router.push('/');
    }
    return null;
  }

  return children;
}

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();

  return (
    <SessionProvider session={session}>
      <ConnectionProvider>
        <Head>
          <link rel="icon" href="assets/BetterLogoTiny.png" />
          <title>{mainConfig.nameApp}</title>
          <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        </Head>

        <AuthWrapper>
          {router.pathname.includes('rooms') ? (
            <div className="flex">
              <Sidebar />
              <div className="overflow-y-auto w-full">
                <Component {...pageProps} />
              </div>
            </div>
          ) : (
            <Component {...pageProps} />
          )}
        </AuthWrapper>
      </ConnectionProvider>
    </SessionProvider>
  );
}

export default MyApp;
