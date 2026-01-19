import { Header } from '@/components/Header';
import { Toolbar } from '@/components/Toolbar';
import { Timeline } from '@/components/Timeline';
import { Sidebar } from '@/components/Sidebar';

function App() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Toolbar />
          <Timeline />
        </div>
      </div>
    </div>
  );
}

export default App;
