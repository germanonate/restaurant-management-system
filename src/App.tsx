import { Header } from '@/components/Header';
import { Toolbar } from '@/components/Toolbar';
import { Timeline } from '@/components/Timeline';

function App() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Header />
      <Toolbar />
      <Timeline />
    </div>
  );
}

export default App;
