import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Camera,
  Map,
  Sprout,
  CalendarDays,
  Home,
  Leaf,
  CloudSun,
  Plus,
  ChevronRight,
  LogOut,
  Mail,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  X,
  Pencil,
  Save,
  Bot,
} from 'lucide-react';
import { hasSupabaseConfig, supabase } from './lib/supabaseClient';
import './styles.css';

const DEFAULT_BEDS = [
  { name: 'A 畦', sunlight: '全天晒', water_access: '近', bed_type: '种菜', position_order: 1 },
  { name: 'B 畦', sunlight: '半日晒', water_access: '中', bed_type: '种菜', position_order: 2 },
  { name: '花边', sunlight: '半日晒', water_access: '中', bed_type: '种花', position_order: 3 },
  { name: '一天的小角落', sunlight: '半日晒', water_access: '近', bed_type: '给一天观察', position_order: 4 },
];

const STAGE_LABELS = {
  just_planted: '刚种下',
  settling: '缓苗中',
  growing: '生长期',
  flowering: '开花了',
  fruiting: '正在结果',
  harvestable: '可采收',
  finished: '结束',
  unknown: '不确定',
};

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!hasSupabaseConfig) {
    return <AppShell><SetupMissing /></AppShell>;
  }

  if (authLoading) {
    return <AppShell><LoadingPage text="正在打开一天菜园" /></AppShell>;
  }

  if (!session) {
    return <AppShell><LoginPage /></AppShell>;
  }


  return <GardenApp session={session} />;
}

function GardenApp({ session }) {
  const [tab, setTab] = useState('today');
  const [loading, setLoading] = useState(true);
  const [garden, setGarden] = useState(null);
  const [beds, setBeds] = useState([]);
  const [plants, setPlants] = useState([]);
  const [logs, setLogs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [species, setSpecies] = useState([]);
  const [toast, setToast] = useState('');

  async function refreshData() {
    setLoading(true);
    const user = session.user;

    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: user.email?.split('@')[0] || '家人',
      role_label: '家人',
    });

    const { data: gardens, error: gardensError } = await supabase
      .from('gardens')
      .select('*')
      .order('created_at', { ascending: true });

    if (gardensError) {
      setToast(`还没取到菜园：${gardensError.message}`);
      setLoading(false);
      return;
    }

    const activeGarden = gardens?.[0] || null;
    setGarden(activeGarden);

    if (activeGarden) {
      const [bedsRes, plantsRes, logsRes, photosRes, recosRes, speciesRes] = await Promise.all([
        supabase.from('beds').select('*').eq('garden_id', activeGarden.id).order('position_order', { ascending: true }),
        supabase.from('plants').select('*, beds(name)').eq('garden_id', activeGarden.id).order('created_at', { ascending: false }),
        supabase.from('logs').select('*').eq('garden_id', activeGarden.id).order('happened_at', { ascending: false }).limit(12),
        supabase.from('photos').select('*').eq('garden_id', activeGarden.id).order('taken_at', { ascending: false }).limit(12),
        supabase.from('ai_recommendations').select('*').eq('garden_id', activeGarden.id).eq('source_type', 'photo').order('created_at', { ascending: false }).limit(5),
        supabase.from('plant_species').select('*').order('common_name', { ascending: true }),
      ]);
      const firstError = bedsRes.error || plantsRes.error || logsRes.error || photosRes.error || recosRes.error || speciesRes.error;
      if (firstError) {
        setToast(`还没取到完整菜地数据：${firstError.message}`);
      }
      setBeds(bedsRes.data || []);
      setPlants(plantsRes.data || []);
      setLogs(logsRes.data || []);
      setPhotos(photosRes.data || []);
      setRecommendations(recosRes.data || []);
      setSpecies(speciesRes.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id]);

  const content = useMemo(() => {
    if (loading) return <LoadingPage text="正在看今天" />;
    if (!garden) return <Onboarding session={session} onDone={refreshData} />;
    if (tab === 'today') return <Today garden={garden} beds={beds} plants={plants} logs={logs} photos={photos} recommendations={recommendations} onRefresh={refreshData} setToast={setToast} />;
    if (tab === 'map') return <GardenMap garden={garden} beds={beds} plants={plants} onRefresh={refreshData} setToast={setToast} />;
    if (tab === 'growth') return <Growth garden={garden} beds={beds} plants={plants} species={species} onRefresh={refreshData} setToast={setToast} />;
    return <Seasons garden={garden} plants={plants} logs={logs} photos={photos} />;
  }, [loading, garden, tab, beds, plants, logs, photos, recommendations, species]);

  return (
    <AppShell>
      <Header garden={garden} userEmail={session.user.email} />
      <div className="content">{content}</div>
      {garden && <CaptureButton garden={garden} beds={beds} plants={plants} onRefresh={refreshData} setToast={setToast} />}
      {garden && <TabBar current={tab} onChange={setTab} />}
      {toast && <Toast text={toast} onClose={() => setToast('')} />}
    </AppShell>
  );
}

function AppShell({ children }) {
  return <div className="app-shell"><main className="phone-frame">{children}</main></div>;
}

function Header({ garden, userEmail }) {
  return (
    <header className="header">
      <div>
        <p className="eyebrow">{garden ? `${garden.location_label} · ${garden.scene_label}` : '北京怀柔 · 长搭营地'}</p>
        <h1>{garden?.name || '一天菜园'}</h1>
      </div>
      <button className="small-seal" onClick={() => supabase.auth.signOut()} title={userEmail || '退出'}>
        <LogOut size={14} /> 退出
      </button>
    </header>
  );
}

function friendlyAuthError(message) {
  const text = String(message || '');
  if (text.includes('Invalid login credentials')) return '邮箱或密码不正确。';
  if (text.includes('Email not confirmed')) return '这个账号还没有确认。请到 Supabase 后台把用户设为 Confirmed。';
  if (text.includes('rate limit')) return '操作太频繁了，先等一会儿再试。';
  if (text.includes('Network')) return '暂时登录不上，请稍后再试。';
  return '暂时登录不上，请稍后再试。';
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('请输入邮箱和密码。');
      return;
    }

    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (signInError) {
      setError(friendlyAuthError(signInError.message));
    }
  }

  return (
    <section className="login-page">
      <div className="login-card clean-login family-login-card">
        <h1>一天菜园</h1>
        <p className="login-subtitle">使用家人给你的账号登录</p>

        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            邮箱
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="请输入邮箱" type="email" autoComplete="email" required />
          </label>
          <label>
            密码
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" type="password" autoComplete="current-password" required />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? <Loader2 className="spin" size={18} /> : <Mail size={18} />} 登录
          </button>
        </form>

        <p className="login-note">没有账号的话，请先让家人帮你创建。</p>
      </div>
    </section>
  );
}

function Onboarding({ session, onDone }) {
  const [name, setName] = useState('一天菜园');
  const [location, setLocation] = useState('北京怀柔');
  const [scene, setScene] = useState('长搭露营营地');
  const [preferences, setPreferences] = useState(['好看一点', '省心一点', '孩子能参与']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const options = ['好看一点', '省心一点', '孩子能参与', '多收一点菜', '多种花', '都想要，但别太麻烦'];

  function togglePreference(item) {
    setPreferences((current) => current.includes(item) ? current.filter((x) => x !== item) : [...current, item]);
  }

  async function createGarden() {
    setBusy(true);
    setError('');

    const userId = session.user.id;
    const { data: gardenData, error: gardenError } = await supabase
      .from('gardens')
      .insert({
        name,
        location_label: location,
        scene_label: scene,
        created_by: userId,
        preferences: {
          style: preferences.length ? preferences : ['省心一点', '孩子能参与', '都想要，但别太麻烦'],
          recording_mode: 'low_friction',
          garden_personality: 'quiet_precise_warm',
        },
      })
      .select()
      .single();

    if (gardenError) {
      setError(gardenError.message);
      setBusy(false);
      return;
    }

    const { error: memberError } = await supabase.from('garden_members').insert({
      garden_id: gardenData.id,
      user_id: userId,
      role: 'owner',
    });

    if (memberError) {
      setError(memberError.message);
      setBusy(false);
      return;
    }

    await supabase.from('beds').insert(DEFAULT_BEDS.map((bed) => ({ ...bed, garden_id: gardenData.id })));
    await supabase.from('logs').insert({
      garden_id: gardenData.id,
      created_by: userId,
      log_type: 'note',
      title: '一天菜园开园了',
      auto_text: '从今天开始，记录这块地的四季。',
      happened_at: new Date().toISOString(),
    });
    await supabase.from('ai_memories').insert({
      garden_id: gardenData.id,
      memory_type: 'preference',
      content: { style: preferences },
      summary_text: `用户希望这块地${preferences.join('、')}，不喜欢复杂记录和频繁提醒。`,
    });

    setBusy(false);
    onDone();
  }

  return (
    <section className="page onboarding">
      <div className="hero-card">
        <p className="eyebrow">建一个菜园</p>
        <h2>先建一块地</h2>
        <p className="lead">填几个基本信息，之后都可以改。</p>
      </div>

      <div className="quiet-card form-stack">
        <label>菜园名<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>位置<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
        <label>场景<input value={scene} onChange={(e) => setScene(e.target.value)} /></label>
      </div>

      <div className="quiet-card">
        <p className="eyebrow">这块地先按什么方式照看？</p>
        <div className="chip-grid">
          {options.map((option) => (
            <button key={option} className={preferences.includes(option) ? 'chip active' : 'chip'} onClick={() => togglePreference(option)}>
              {option}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      <button className="primary-button" onClick={createGarden} disabled={busy}>
        {busy ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />} 完成
      </button>
    </section>
  );
}


const HUAIROU_WEATHER = {
  latitude: 40.32,
  longitude: 116.63,
  timezone: 'Asia/Shanghai',
};

const WEATHER_CODES = {
  0: '晴', 1: '大致晴朗', 2: '有云', 3: '阴',
  45: '有雾', 48: '雾凇',
  51: '小毛毛雨', 53: '毛毛雨', 55: '较强毛毛雨',
  61: '小雨', 63: '中雨', 65: '大雨',
  71: '小雪', 73: '中雪', 75: '大雪',
  80: '阵雨', 81: '较强阵雨', 82: '强阵雨',
  95: '雷雨', 96: '雷雨伴冰雹', 99: '强雷雨伴冰雹',
};

function useGardenWeather(garden) {
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    if (!garden?.id) return;
    let cancelled = false;
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(HUAIROU_WEATHER.latitude));
    url.searchParams.set('longitude', String(HUAIROU_WEATHER.longitude));
    url.searchParams.set('timezone', HUAIROU_WEATHER.timezone);
    url.searchParams.set('past_days', '2');
    url.searchParams.set('forecast_days', '3');
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation,weather_code');
    url.searchParams.set('hourly', 'precipitation,temperature_2m');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum');

    setState({ loading: true, error: '', data: null });
    fetch(url.toString())
      .then((response) => {
        if (!response.ok) throw new Error(`天气接口返回 ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: '', data });
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, error: error.message || '天气暂时取不到', data: null });
      });

    return () => { cancelled = true; };
  }, [garden?.id]);

  return state;
}

function dateKey(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: HUAIROU_WEATHER.timezone }).format(value);
}

function daysBetween(fromValue, toValue = new Date()) {
  if (!fromValue) return null;
  const from = new Date(fromValue);
  if (Number.isNaN(from.getTime())) return null;
  return Math.max(0, Math.floor((toValue.getTime() - from.getTime()) / 86400000));
}

function sumPrecipitationForDay(weather, key) {
  const dailyIndex = weather?.daily?.time?.indexOf(key) ?? -1;
  if (dailyIndex >= 0) return Number(weather.daily.precipitation_sum?.[dailyIndex] || 0);
  return 0;
}

function buildGardenBrief({ weather, logs, photos, plants }) {
  const now = new Date();
  const todayKey = dateKey(now);
  const yesterdayKey = dateKey(new Date(now.getTime() - 86400000));
  const dayBeforeKey = dateKey(new Date(now.getTime() - 86400000 * 2));

  const todayRain = sumPrecipitationForDay(weather, todayKey);
  const yesterdayRain = sumPrecipitationForDay(weather, yesterdayKey);
  const dayBeforeRain = sumPrecipitationForDay(weather, dayBeforeKey);
  const rain2d = yesterdayRain + dayBeforeRain;

  const todayIndex = weather?.daily?.time?.indexOf(todayKey) ?? -1;
  const todayMax = todayIndex >= 0 ? Number(weather.daily.temperature_2m_max?.[todayIndex] || 0) : null;
  const todayCode = weather?.current?.weather_code ?? (todayIndex >= 0 ? weather.daily.weather_code?.[todayIndex] : null);
  const currentTemp = weather?.current?.temperature_2m;
  const weatherLabel = WEATHER_CODES[todayCode] || '天气正常';

  const waterLogs = logs.filter((log) => log.log_type === 'watered' || String(log.title || '').includes('浇水'));
  const lastWater = waterLogs[0] || null;
  const daysSinceWater = daysBetween(lastWater?.happened_at);
  const daysSincePhoto = daysBetween(photos[0]?.taken_at || photos[0]?.created_at);
  const issuePlant = plants.find((p) => p.status === 'issue');

  const reasons = [];
  let title = '今天还好';
  let body = '今天没有明显需要立刻处理的事。下次去，先拍一张现在的样子。';
  let nextAction = '下次去，先拍一张今天的样子。';

  if (rain2d >= 8) {
    title = '今天不用急';
    body = '这两天怀柔有雨，先不用急着浇水。';
    nextAction = '下次去，看看叶片和排水。';
    reasons.push(`近两天降水约 ${rain2d.toFixed(1)}mm。`);
  } else if (yesterdayRain >= 2 || todayRain >= 2) {
    title = '今天还好';
    body = '最近记录有雨，今天不需要急着浇水。';
    nextAction = '下次去，摸一下表土，再决定要不要补水。';
    reasons.push(`最近记录降水约 ${(yesterdayRain + todayRain).toFixed(1)}mm。`);
  } else if (daysSinceWater !== null && daysSinceWater >= 6 && rain2d < 2) {
    title = '该去看看了';
    body = `已经 ${daysSinceWater} 天没有浇水记录，最近记录也没什么雨。`;
    nextAction = '下次去，先看 A 畦和盆栽。';
    reasons.push(`上次浇水是 ${formatDate(lastWater.happened_at)}。`);
  } else if (todayMax !== null && todayMax >= 32 && rain2d < 2) {
    title = '今天有点热';
    body = '怀柔今天偏热，盆栽和浅根植物要多看一眼。';
    nextAction = '下次去，先看番茄、黄瓜和盆里的香草。';
    reasons.push(`今天最高约 ${Math.round(todayMax)}℃。`);
  }

  if (issuePlant) {
    title = '有一件事要看';
    body = `${issuePlant.name} 还在待观察。先补拍一张清楚的照片。`;
    nextAction = `优先看 ${issuePlant.name}。`;
    reasons.push('有植物被标记为待观察。');
  }

  if (!plants.length) {
    title = '先从几种植物开始';
    body = '把种下的东西加进来，之后才好记录。';
    nextAction = '先在「生长」里添加第一种植物。';
  }

  if (daysSincePhoto === null) reasons.push('还没有照片记录。');
  else if (daysSincePhoto >= 7) reasons.push(`最近记录一张照片是 ${daysSincePhoto} 天前。`);

  const weatherLine = currentTemp !== undefined
    ? `怀柔现在约 ${Math.round(Number(currentTemp))}℃，${weatherLabel}。`
    : `怀柔今日${weatherLabel}。`;

  return { title, body, nextAction, weatherLine, reasons: reasons.slice(0, 3) };
}

function Today({ garden, beds, plants, logs, photos, recommendations, setToast, onRefresh }) {
  const weather = useGardenWeather(garden);
  const brief = weather.data
    ? buildGardenBrief({ weather: weather.data, logs, photos, plants })
    : null;

  async function quickLog(type, titleText) {
    const { error } = await supabase.from('logs').insert({
      garden_id: garden.id,
      created_by: (await supabase.auth.getUser()).data.user.id,
      log_type: type,
      title: titleText,
      happened_at: new Date().toISOString(),
    });
    if (error) setToast(`这次还没记上：${error.message}`);
    else {
      setToast('已记录。');
      onRefresh();
    }
  }

  return (
    <section className="page">
      <div className="hero-card">
        <p className="eyebrow">今天</p>
        <h2>{brief?.title || '正在看今天'}</h2>
        <p className="lead">{brief?.body || '正在整理天气和最近记录记录。'}</p>
        <div className="reason-row"><CloudSun size={17} /><span>{weather.loading ? '正在获取怀柔天气。' : weather.error ? '天气暂时取不到，先看最近记录记录。' : brief.weatherLine}</span></div>
      </div>

      <div className="quiet-card">
        <p className="eyebrow">下次看看</p>
        <h3>{brief?.nextAction || '先拍一张今天的样子。'}</h3>
        <p>依据：{brief?.reasons?.length ? brief.reasons.join(' ') : '天气、浇水记录、最近记录照片和植物状态。'}</p>
      </div>

      {photos.length > 0 && <div className="photo-strip-card">
        <p className="eyebrow">最近记录照片</p>
        <div className="photo-strip">
          {photos.slice(0, 4).map((photo) => <PhotoThumb key={photo.id} photo={photo} />)}
        </div>
      </div>}

      {recommendations?.length > 0 && <div className="quiet-card gardener-card">
        <div className="gardener-title"><Bot size={18} /><p className="eyebrow">园丁看过</p></div>
        <h3>{recommendations[0].title}</h3>
        {recommendations[0].body && <p>{recommendations[0].body}</p>}
        {recommendations[0].reason && <p className="soft-note">依据：{recommendations[0].reason}</p>}
      </div>}

      <div className="quick-actions">
        <button onClick={() => quickLog('watered', '浇水了')}>浇水了</button>
        <button onClick={() => quickLog('weeded', '除草了')}>除草了</button>
        <button onClick={() => quickLog('harvested', '采收了')}>采收了</button>
      </div>

      <div className="child-card">
        <p className="eyebrow">最近记录</p>
        {logs.length ? logs.map((log) => <p key={log.id}>· {formatDate(log.happened_at)}｜{log.title}</p>) : <p>还没有记录。先拍一张，或者记一次浇水。</p>}
      </div>
    </section>
  );
}

function GardenMap({ garden, beds, plants, setToast, onRefresh }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState({ name: '', sunlight: '', water_access: '', bed_type: '' });

  function startEdit(bed) {
    setEditingId(bed.id);
    setDraft({
      name: bed.name || '',
      sunlight: bed.sunlight || '',
      water_access: bed.water_access || '',
      bed_type: bed.bed_type || '',
    });
  }

  async function saveBed(bedId) {
    if (!draft.name.trim()) {
      setToast('先给这个区域起个名字。');
      return;
    }
    const { error } = await supabase.from('beds').update({
      name: draft.name.trim(),
      sunlight: draft.sunlight.trim() || '不确定',
      water_access: draft.water_access.trim() || '不确定',
      bed_type: draft.bed_type.trim() || '混合',
    }).eq('id', bedId);
    if (error) setToast(`还没保存成功：${error.message}`);
    else {
      setToast('地图已更新。');
      setEditingId('');
      onRefresh();
    }
  }

  async function addBed() {
    if (!name.trim()) return;
    const gardenId = garden?.id || beds[0]?.garden_id || plants[0]?.garden_id;
    if (!gardenId) return;
    const { error } = await supabase.from('beds').insert({ garden_id: gardenId, name, sunlight: '不确定', water_access: '不确定', bed_type: '混合', position_order: beds.length + 1 });
    if (error) setToast(`还没添加成功：${error.message}`);
    else { setToast('已添加。'); setAdding(false); setName(''); onRefresh(); }
  }

  return (
    <section className="page">
      <div className="section-title"><h2>地图</h2><p>区域可以改名，也可以慢慢调整。</p></div>
      <div className="map-grid">
        {beds.map((bed) => {
          const bedPlants = plants.filter((p) => p.bed_id === bed.id).map((p) => p.name).join('、') || '还没有植物';
          const isEditing = editingId === bed.id;
          return <div className="bed-card" key={bed.id}>
            {isEditing ? <div className="bed-edit form-stack">
              <label>区域名<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="比如：A 畦" /></label>
              <label>日照<input value={draft.sunlight} onChange={(e) => setDraft({ ...draft, sunlight: e.target.value })} placeholder="比如：全天晒" /></label>
              <label>水源<input value={draft.water_access} onChange={(e) => setDraft({ ...draft, water_access: e.target.value })} placeholder="比如：近 / 中 / 远" /></label>
              <label>用途<input value={draft.bed_type} onChange={(e) => setDraft({ ...draft, bed_type: e.target.value })} placeholder="比如：种菜 / 种花 / 一天观察" /></label>
              <div className="inline-actions">
                <button className="tiny-button dark" onClick={() => saveBed(bed.id)}><Save size={14}/> 保存</button>
                <button className="tiny-button" onClick={() => setEditingId('')}>取消</button>
              </div>
            </div> : <>
              <div className="bed-top"><h3>{bed.name}</h3><span>{bed.sunlight}</span></div>
              <p className="bed-detail">种着：{bedPlants}</p>
              <p>水源：{bed.water_access}</p>
              <p className="soft-note">{bed.bed_type || '先这样记着，之后再慢慢调整。'}</p>
              <button className="edit-link" onClick={() => startEdit(bed)}><Pencil size={13}/> 编辑</button>
            </>}
          </div>;
        })}
      </div>
      {adding ? <div className="quiet-card form-row"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="比如：香草区" /><button onClick={addBed}>保存</button></div> : <button className="secondary-button" onClick={() => setAdding(true)}><Plus size={16}/> 添加区域</button>}
    </section>
  );
}

function Growth({ garden, beds, plants, species, setToast, onRefresh }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [bedId, setBedId] = useState(beds[0]?.id || '');
  const [stage, setStage] = useState('unknown');

  useEffect(() => { if (!bedId && beds[0]?.id) setBedId(beds[0].id); }, [beds, bedId]);

  async function addPlant() {
    if (!name.trim() || !bedId) return;
    const matched = species.find((s) => name.includes(s.common_name));
    const { error } = await supabase.from('plants').insert({
      garden_id: garden.id,
      bed_id: bedId,
      species_id: matched?.id || null,
      name,
      stage,
      status: 'active',
      planted_at: new Date().toISOString().slice(0, 10),
      source_type: 'unknown',
    });
    if (error) setToast(`还没添加成功：${error.message}`);
    else { setToast('已添加。以后照片和记录都会放在这里。'); setAdding(false); setName(''); onRefresh(); }
  }

  return (
    <section className="page">
      <div className="section-title"><h2>生长</h2><p>{plants.length ? `${plants.length} 种植物正在记录。` : '看看最近在长什么。'}</p></div>
      {plants.length ? <div className="plant-list">
        {plants.map((plant) => <div className="plant-card" key={plant.id}>
          <div className="plant-icon"><Sprout size={22}/></div>
          <div>
            <div className="plant-head"><h3>{plant.name}</h3><span>{plant.status === 'issue' ? '待观察' : '正常'}</span></div>
            <p className="phase">{STAGE_LABELS[plant.stage] || '不确定'}</p>
            <p>区域：{plant.beds?.name || '未分区'}</p>
            <p>下次去，拍一张近照。</p>
          </div>
          <ChevronRight className="chevron" size={18}/>
        </div>)}
      </div> : <EmptyState title="还没有植物" body="先添加一种植物，之后再慢慢记录。" />}

      {adding && <div className="quiet-card form-stack">
        <label>植物名<input value={name} onChange={(e) => setName(e.target.value)} placeholder="比如：A 畦番茄" /></label>
        <label>区域<select value={bedId} onChange={(e) => setBedId(e.target.value)}>{beds.map((bed) => <option key={bed.id} value={bed.id}>{bed.name}</option>)}</select></label>
        <label>阶段<select value={stage} onChange={(e) => setStage(e.target.value)}>{Object.entries(STAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="primary-button" onClick={addPlant}>保存</button>
      </div>}
      {!adding && <button className="secondary-button" onClick={() => setAdding(true)}><Plus size={16}/> 添加植物</button>}
    </section>
  );
}

function Seasons({ plants, logs, photos }) {
  const highlights = [];
  if (plants.length) highlights.push(`${plants.length} 种植物正在记录。`);
  if (logs.length) highlights.push(`这周有 ${logs.length} 条记录。`);
  if (photos.length) highlights.push(`这周有 ${photos.length} 张照片。`);
  if (!highlights.length) highlights.push('第一张照片，会成为这一年的开头。');

  return (
    <section className="page">
      <div className="letter-card">
        <p className="eyebrow">四季</p>
        <h2>{logs.length || photos.length ? '这周有新记录' : '四季还没开始'}</h2>
        <ul>{highlights.map((note) => <li key={note}>{note}</li>)}</ul>
      </div>
      {photos.length > 0 && <div className="quiet-card">
        <p className="eyebrow">最近照片</p>
        <div className="photo-grid">
          {photos.slice(0, 6).map((photo) => <PhotoThumb key={photo.id} photo={photo} />)}
        </div>
      </div>}
      <div className="quiet-card">
        <p className="eyebrow">夏天的小结</p>
        <h3>2026 夏｜一天菜园</h3>
        <p>不用完美管理。常去看看，就已经很好。</p>
      </div>
    </section>
  );
}

function PhotoThumb({ photo }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadSignedUrl() {
      const { data } = await supabase.storage.from(photo.storage_bucket || 'garden-photos').createSignedUrl(photo.storage_path, 60 * 20);
      if (!cancelled) setUrl(data?.signedUrl || '');
    }
    if (photo.storage_path) loadSignedUrl();
    return () => { cancelled = true; };
  }, [photo.storage_bucket, photo.storage_path]);

  return <div className="photo-thumb">{url ? <img src={url} alt={photo.caption || '菜地照片'} /> : <ImageIcon size={22} />}</div>;
}

function CaptureButton({ garden, beds, plants, onRefresh, setToast }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [targetType, setTargetType] = useState('garden');
  const [targetId, setTargetId] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  function reset() {
    setFile(null);
    setPreview('');
    setTargetType('garden');
    setTargetId('');
    setBusy(false);
    setAiBusy(false);
  }

  function close() {
    reset();
    setOpen(false);
  }

  function handleFile(event) {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setOpen(true);
    event.target.value = '';
  }

  async function uploadPhoto() {
    if (!file) return;
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error('还没登录。');

      const photoId = crypto.randomUUID();
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const storagePath = `${garden.id}/${yyyy}/${mm}/${photoId}.jpg`;
      const compressed = await compressImage(file, 1600, 0.82);

      const { error: uploadError } = await supabase.storage
        .from('garden-photos')
        .upload(storagePath, compressed, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;

      const bedId = targetType === 'bed' ? targetId || null : null;
      const plantId = targetType === 'plant' ? targetId || null : null;
      const caption = targetType === 'plant'
        ? `今天的${plants.find((p) => p.id === targetId)?.name || '植物'}，已保存。`
        : targetType === 'bed'
          ? `今天的${beds.find((b) => b.id === targetId)?.name || '这块地'}，已保存。`
          : targetType === 'child'
            ? '一天的小发现，已保存。'
            : '今天的菜地，已保存。';

      const { data: photoData, error: photoError } = await supabase.from('photos').insert({
        id: photoId,
        garden_id: garden.id,
        bed_id: bedId,
        plant_id: plantId,
        uploaded_by: user.id,
        storage_bucket: 'garden-photos',
        storage_path: storagePath,
        photo_type: targetType === 'child' ? 'child_discovery' : targetType === 'garden' ? 'whole_garden' : 'unknown',
        caption,
        taken_at: now.toISOString(),
        is_season_material: true,
      }).select().single();
      if (photoError) throw photoError;

      const { error: logError } = await supabase.from('logs').insert({
        garden_id: garden.id,
        bed_id: bedId,
        plant_id: plantId,
        photo_id: photoData.id,
        created_by: user.id,
        log_type: targetType === 'child' ? 'child_discovery' : 'photo_taken',
        title: caption,
        auto_text: caption,
        happened_at: now.toISOString(),
      });
      if (logError) throw logError;

      if (targetType === 'child') {
        await supabase.from('child_discoveries').insert({
          garden_id: garden.id,
          photo_id: photoData.id,
          title: '一天的小发现',
          body: caption,
          discovered_at: now.toISOString(),
        });
      }

      let analysisSaved = false;
      try {
        setAiBusy(true);
        const targetLabel = targetType === 'plant'
          ? plants.find((p) => p.id === targetId)?.name || '植物'
          : targetType === 'bed'
            ? beds.find((b) => b.id === targetId)?.name || '区域'
            : targetType === 'child'
              ? '一天的小发现'
              : '整个菜园';
        const imageDataUrl = await blobToDataUrl(compressed);
        const response = await fetch('/.netlify/functions/analyze-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: imageDataUrl, target_label: targetLabel, target_type: targetType }),
        });
        if (!response.ok) throw new Error('照片理解暂时不可用');
        const analysis = await response.json();
        if (analysis?.title) {
          await supabase.from('ai_recommendations').insert({
            garden_id: garden.id,
            bed_id: bedId,
            plant_id: plantId,
            photo_id: photoData.id,
            recommendation_type: 'photo_observation',
            title: analysis.title,
            body: analysis.body || '',
            reason: analysis.reason || '',
            source_type: 'photo',
            model_route: 'doubao',
            confidence_label: analysis.confidence_label || 'uncertain',
            dedupe_key: `photo:${photoData.id}`,
          });
          await supabase.from('logs').insert({
            garden_id: garden.id,
            bed_id: bedId,
            plant_id: plantId,
            photo_id: photoData.id,
            created_by: user.id,
            log_type: 'note',
            title: '园丁看了一眼',
            auto_text: `${analysis.title}${analysis.body ? `。${analysis.body}` : ''}`,
            happened_at: new Date().toISOString(),
            metadata: { source: 'photo_ai', status_tag: analysis.status_tag || 'unclear' },
          });
          analysisSaved = true;
        }
      } catch (aiError) {
        console.warn('photo analysis skipped', aiError);
      } finally {
        setAiBusy(false);
      }

      setToast(analysisSaved ? '已保存，园丁也看了一眼。' : caption);
      close();
      onRefresh();
    } catch (error) {
      setToast(`这张照片没保存成功：${error.message}`);
      setBusy(false);
    }
  }

  return <>
    <div className="capture-actions" aria-label="添加照片">
      <label className="capture-button"><Camera size={20} />拍一下<input className="hidden-input" type="file" accept="image/*" onChange={handleFile} /></label>
    </div>
    {open && <div className="modal-backdrop">
      <div className="capture-modal">
        <div className="modal-head">
          <div><p className="eyebrow">拍一下</p><h3>保存到哪里？</h3></div>
          <button className="icon-button" onClick={close}><X size={18} /></button>
        </div>
        {preview && <img className="capture-preview" src={preview} alt="菜地照片" />}
        <div className="form-stack">
          <label>归属
            <select value={`${targetType}:${targetId}`} onChange={(e) => {
              const [type, id = ''] = e.target.value.split(':');
              setTargetType(type);
              setTargetId(id);
            }}>
              <option value="garden:">整个菜园</option>
              {beds.map((bed) => <option key={bed.id} value={`bed:${bed.id}`}>{bed.name}</option>)}
              {plants.map((plant) => <option key={plant.id} value={`plant:${plant.id}`}>{plant.name}</option>)}
              <option value="child:">一天的小发现</option>
            </select>
          </label>
          <button className="primary-button" onClick={uploadPhoto} disabled={busy}>{busy ? <Loader2 className="spin" size={18} /> : <ImageIcon size={18} />} {aiBusy ? '保存中，园丁在看' : '保存'}</button>
          <button className="secondary-button" onClick={close} disabled={busy}>取消</button>
        </div>
      </div>
    </div>}
  </>;
}


function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('图片读取失败。'));
    reader.readAsDataURL(blob);
  });
}

function compressImage(file, maxSide = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) reject(new Error('图片压缩失败。'));
        else resolve(blob);
      }, 'image/jpeg', quality);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片读取失败。'));
    };
    image.src = objectUrl;
  });
}

function TabBar({ current, onChange }) {
  const tabs = [
    { id: 'today', label: '今天', icon: Home },
    { id: 'map', label: '地图', icon: Map },
    { id: 'growth', label: '生长', icon: Leaf },
    { id: 'seasons', label: '四季', icon: CalendarDays },
  ];
  return <nav className="tabbar">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={current === id ? 'active' : ''} onClick={() => onChange(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>;
}

function EmptyState({ title, body }) {
  return <div className="quiet-card"><h3>{title}</h3><p>{body}</p></div>;
}

function LoadingPage({ text }) {
  return <section className="login-page"><div className="login-card loading-card"><Loader2 className="spin" size={24} /><p>{text}</p></div></section>;
}

function SetupMissing() {
  return <section className="login-page"><div className="login-card"><h1>还差一点配置</h1><p>请在 Netlify 添加 Supabase 环境变量后重新部署。</p></div></section>;
}

function Toast({ text, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3800);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className="toast">{text}</div>;
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(value));
}

createRoot(document.getElementById('root')).render(<App />);
