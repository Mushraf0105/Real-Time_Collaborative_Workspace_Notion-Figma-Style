import './globals.css';

export const metadata = {
  title: 'SyncSpace — Real-Time Collaborative Workspace',
  description: 'Notion & Figma hybrid collaborative workspace powered by Yjs CRDT, WebSockets, and Redis Pub/Sub',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}

