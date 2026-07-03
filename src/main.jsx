import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Camera, Map, Sprout, CalendarDays, Home, Leaf, CloudSun, CheckCircle2, Plus, ChevronRight } from 'lucide-react';
import './styles.css';

const garden = {
  name: '一天菜园',
  slogan: '记录一块地，照看一家人的四季。',
  place: '北京怀柔 · 长搭营地',
  lastVisit: '6 天前',
  status: '该去看看了',
  statusText: '连续几天没雨，A 畦番茄正在结果，已经 8 天没有浇水记录。',
  priority: '下次去，先看 A 畦番茄的土，再决定要不要深浇。',
  weatherNote: '这两天有风，盆栽会比地栽干得快。',
};

const beds = [
  { name: 'A 畦', detail: '番茄 · 罗勒', light: '全天晒', water: '离水桶近', note: '番茄结果期，优先看水分。' },
  { name: 'B 畦', detail: '黄瓜 · 生菜', light: '半日晒', water: '取水方便', note: '黄瓜叶背下次看一眼。' },
  { name: '花边', detail: '百日草 · 波斯菊', light: '下午晒', water: '偏干', note: '适合拍照，也适合一天观察。' },
  { name: '盆栽区', detail: '薄荷 · 迷迭香', light: '半日晒', water: '易干', note: '薄荷建议继续盆栽，别下地。' },
];

const plants = [
  { name: 'A 畦番茄', phase: '正在结果', last: '7 月 5 日深浇水', next: '看土壤湿度和叶背', tag: '优先' },
  { name: '黄瓜', phase: '爬藤期', last: '4 天前发现叶片发黄', next: '补拍叶背，不急着用药', tag: '看一眼' },
  { name: '薄荷', phase: '稳定生长', last: '一天闻出了薄荷味', next: '保持盆栽', tag: '安心' },
];

const seasonNotes = [
  '番茄开始挂果，黄瓜叶子舒展开了。',
  '花边多了一点颜色。',
  '一天闻出了薄荷味。',
  '下次去，带一卷绑枝绳就够了。',
];

function App() {
  const [tab, setTab] = useState('today');
  const content = useMemo(() => {
    if (tab === 'today') return <Today />;
    if (tab === 'map') return <GardenMap />;
    if (tab === 'growth') return <Growth />;
    return <Seasons />;
  }, [tab]);

  return (
    <div className="app-shell">
      <main className="phone-frame">
        <Header />
        <div className="content">{content}</div>
        <CaptureButton />
        <TabBar current={tab} onChange={setTab} />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="header">
      <div>
        <p className="eyebrow">{garden.place}</p>
        <h1>{garden.name}</h1>
      </div>
      <div className="small-seal">第一年</div>
    </header>
  );
}

function Today() {
  return (
    <section className="page">
      <div className="hero-card">
        <p className="eyebrow">菜地状态</p>
        <h2>{garden.status}</h2>
        <p className="lead">{garden.statusText}</p>
        <div className="reason-row">
          <CloudSun size={17} />
          <span>{garden.weatherNote}</span>
        </div>
      </div>

      <div className="quiet-card">
        <p className="eyebrow">最重要的一件事</p>
        <h3>{garden.priority}</h3>
        <p>园丁记得：你们上次来是 {garden.lastVisit}。</p>
      </div>

      <div className="child-card">
        <p className="eyebrow">一天的小发现</p>
        <h3>下次可以让一天找一颗还没变红的小番茄。</h3>
        <p>这是一种很好的“等待”练习。</p>
      </div>
    </section>
  );
}

function GardenMap() {
  return (
    <section className="page">
      <div className="section-title">
        <h2>地图</h2>
        <p>这块地是怎么被安排的。</p>
      </div>
      <div className="map-grid">
        {beds.map((bed) => (
          <div className="bed-card" key={bed.name}>
            <div className="bed-top">
              <h3>{bed.name}</h3>
              <span>{bed.light}</span>
            </div>
            <p className="bed-detail">{bed.detail}</p>
            <p>{bed.water}</p>
            <p className="soft-note">{bed.note}</p>
          </div>
        ))}
      </div>
      <button className="secondary-button"><Plus size={16}/> 建一个新区</button>
    </section>
  );
}

function Growth() {
  return (
    <section className="page">
      <div className="section-title">
        <h2>生长</h2>
        <p>它们长到哪了。</p>
      </div>
      <div className="plant-list">
        {plants.map((plant) => (
          <div className="plant-card" key={plant.name}>
            <div className="plant-icon"><Sprout size={22}/></div>
            <div>
              <div className="plant-head">
                <h3>{plant.name}</h3>
                <span>{plant.tag}</span>
              </div>
              <p className="phase">{plant.phase}</p>
              <p>上次：{plant.last}</p>
              <p>下次：{plant.next}</p>
            </div>
            <ChevronRight className="chevron" size={18}/>
          </div>
        ))}
      </div>
    </section>
  );
}

function Seasons() {
  return (
    <section className="page">
      <div className="letter-card">
        <p className="eyebrow">菜地来信</p>
        <h2>这周，菜地往夏天走了一点。</h2>
        <ul>
          {seasonNotes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      </div>
      <div className="quiet-card">
        <p className="eyebrow">封季预览</p>
        <h3>2026 夏｜一天菜园</h3>
        <p>这个夏天，菜地没有被完美管理。但它被你们看见了很多次。</p>
      </div>
    </section>
  );
}

function CaptureButton() {
  return (
    <button className="capture-button" onClick={() => alert('下一步会接入拍照、压缩、上传、豆包视觉识别。现在先确认产品感觉。')}>
      <Camera size={20} />
      拍一下
    </button>
  );
}

function TabBar({ current, onChange }) {
  const tabs = [
    { id: 'today', label: '今天', icon: Home },
    { id: 'map', label: '地图', icon: Map },
    { id: 'growth', label: '生长', icon: Leaf },
    { id: 'seasons', label: '四季', icon: CalendarDays },
  ];
  return (
    <nav className="tabbar">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button key={id} className={current === id ? 'active' : ''} onClick={() => onChange(id)}>
          <Icon size={19} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

createRoot(document.getElementById('root')).render(<App />);
