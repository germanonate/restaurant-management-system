import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { Toolbar } from '@/components/Toolbar';
import { Timeline } from '@/components/Timeline';
import { preloadReservationSheet } from '@/components/ReservationBlock/LazyReservationSheet';

function App() {
  // Preload ReservationSheet chunk immediately after mount
  useEffect(() => {
    // Small delay to not block initial render
    const timer = setTimeout(preloadReservationSheet, 100);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Header />
      <Toolbar />
      <Timeline />
    </div>
  );
}

export default App;
