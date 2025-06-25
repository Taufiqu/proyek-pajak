import React, { useState } from 'react';
import AppHeader from './components/appheader';
import TabNav from './components/tabnav';
import FakturPage from './pages/fakturpage';
import BuktiSetorPage from './pages/buktisetorpage';
import LaporanPage from './pages/laporanpage';
import './styles/app.css';

function App() {
  const [activeTab, setActiveTab] = useState('faktur');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'buktiSetor':
        return <BuktiSetorPage />;
      case 'laporan':
        return <LaporanPage />;
      case 'faktur':
      default:
        return <FakturPage />;
    }
  };

  return (
    <div className="App">
      <AppHeader />
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <main>
        {renderActiveTab()}
      </main>
    </div>
  );
}

export default App;