const TabNav = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { key: "faktur", label: "Faktur PPN" },
    { key: "buktiSetor", label: "Bukti Setor" },
    { key: "laporan", label: "Laporan" },
  ];

  return (
    <nav className="tab-nav">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={activeTab === tab.key ? "active" : ""}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};

export default TabNav;
