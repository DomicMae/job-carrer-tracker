import './globals.css';
export const metadata = { title: 'Career Tracker', description: 'Kelola lowongan, lamaran, dan persiapan CV' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id"><body>{children}</body></html>; }
