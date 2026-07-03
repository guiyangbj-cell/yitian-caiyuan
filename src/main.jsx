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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!hasSupabaseConfig) {
    return <AppShell><SetupMissing /></AppShell>;
  }

  if (authLoading) {
    return <AppShell><LoadingPage text="正在回到一天菜园。" /></AppShell>;
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
      const [bedsRes, plantsRes, logsRes, photosRes, speciesRes] = await Promise.all([
        supabase.from('beds').select('*').eq('garden_id', activeGarden.id).order('position_order', { ascending: true }),
        supabase.from('plants').select('*, beds(name)').eq('garden_id', activeGarden.id).order('created_at', { ascending: false }),
        supabase.from('logs').select('*').eq('garden_id', activeGarden.id).order('happened_at', { ascending: false }).limit(12),
        supabase.from('photos').select('*').eq('garden_id', activeGarden.id).order('taken_at', { ascending: false }).limit(12),
        supabase.from('plant_species').select('*').order('common_name', { ascending: true }),
      ]);
      const firstError = bedsRes.error || plantsRes.error || logsRes.error || photosRes.error || speciesRes.error;
      if (firstError) {
        setToast(`还没取到完整菜地数据：${firstError.message}`);
      }
      setBeds(bedsRes.data || []);
      setPlants(plantsRes.data || []);
      setLogs(logsRes.data || []);
      setPhotos(photosRes.data || []);
      setSpecies(speciesRes.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id]);

  const content = useMemo(() => {
    if (loading) return <LoadingPage text="正在看今天的菜地状态。" />;
    if (!garden) return <Onboarding session={session} onDone={refreshData} />;
    if (tab === 'today') return <Today garden={garden} beds={beds} plants={plants} logs={logs} photos={photos} onRefresh={refreshData} setToast={setToast} />;
    if (tab === 'map') return <GardenMap garden={garden} beds={beds} plants={plants} onRefresh={refreshData} setToast={setToast} />;
    if (tab === 'growth') return <Growth garden={garden} beds={beds} plants={plants} species={species} onRefresh={refreshData} setToast={setToast} />;
    return <Seasons garden={garden} plants={plants} logs={logs} photos={photos} />;
  }, [loading, garden, tab, beds, plants, logs, photos, species]);

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
        <LogOut size={14} /> 第一年
      </button>
    </header>
  );
}

function friendlyAuthError(message) {
  const text = String(message || '');
  if (text.includes('Invalid login credentials')) return '邮箱或密码不对，再看一眼。';
  if (text.includes('Email not confirmed')) return '这个邮箱还没有确认。先去邮箱点一次确认链接，再回来登录。';
  if (text.includes('User already registered')) return '这个邮箱已经有账号了，直接登录就好。';
  if (text.includes('Password should be at least')) return '密码至少 6 位。';
  if (text.includes('rate limit')) return '操作太频繁了，先等一会儿再试。';
  if (text.includes('Signup is disabled')) return '当前项目暂时没有开启注册。去 Supabase 的 Auth 设置里打开用户注册。';
  return text || '这次没有成功，可以再试一次。';
}

function LoginPage() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('密码至少 6 位。');
      return;
    }

    if (mode === 'signup' && password !== password2) {
      setError('两次输入的密码不一样。');
      return;
    }

    setBusy(true);

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setBusy(false);
      if (signInError) {
        setError(friendlyAuthError(signInError.message));
        return;
      }
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setBusy(false);
    if (signUpError) {
      setError(friendlyAuthError(signUpError.message));
      return;
    }

    if (data?.session) {
      setMessage('账号创建好了。正在回到一天菜园。');
    } else {
      setMessage('账号创建好了。如果邮箱里有确认邮件，点一下确认链接；确认后回来用邮箱和密码登录。');
      setMode('signin');
      setPassword('');
      setPassword2('');
    }
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <p className="eyebrow">回到一天菜园</p>
        <h1>这是你们家的菜地。</h1>
        <p>用邮箱和密码登录。照片、记录和四季都会留在这里。</p>

        <div className="auth-toggle" role="tablist" aria-label="登录方式">
          <button className={mode === 'signin' ? 'active' : ''} type="button" onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>
            登录
          </button>
          <button className={mode === 'signup' ? 'active' : ''} type="button" onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>
            创建账号
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            邮箱
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoComplete="email" required />
          </label>
          <label>
            密码
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required />
          </label>
          {mode === 'signup' && (
            <label>
              再输一次密码
              <input value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="和上面一样" type="password" autoComplete="new-password" required />
            </label>
          )}
          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? <Loader2 className="spin" size={18} /> : <Mail size={18} />} {mode === 'signin' ? '登录' : '创建账号'}
          </button>
        </form>
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
      auto_text: '从今天开始，这块地会有自己的四季。',
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
        <h2>这是一天菜园的第一年。</h2>
        <p className="lead">先把这块地交给我们记住。</p>
      </div>

      <div className="quiet-card form-stack">
        <label>菜园名<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>位置<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
        <label>场景<input value={scene} onChange={(e) => setScene(e.target.value)} /></label>
      </div>

      <div className="quiet-card">
        <p className="eyebrow">你希望它更像什么？</p>
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
        {busy ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />} 完成开园
      </button>
    </section>
  );
}

function Today({ garden, beds, plants, logs, photos, setToast, onRefresh }) {
  const hasPlants = plants.length > 0;
  const issuePlant = plants.find((p) => p.status === 'issue');
  const title = hasPlants ? (issuePlant ? '有一件事值得看一眼。' : '菜地今天还好。') : '菜地还在认识你们。';
  const body = hasPlants
    ? issuePlant
      ? `${issuePlant.name} 还在待观察。下次去，先补拍一张清楚的照片，别急着用药。`
      : '目前没有待处理的问题。下次去，先拍一张今天的样子就好。'
    : '先添加几种植物，园丁才知道要照看谁。';

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
      setToast('记下了。下次判断会把这次记录算进去。');
      onRefresh();
    }
  }

  return (
    <section className="page">
      <div className="hero-card">
        <p className="eyebrow">菜地状态</p>
        <h2>{title}</h2>
        <p className="lead">{body}</p>
        <div className="reason-row"><CloudSun size={17} /><span>天气还没接入。下一步会让这里根据怀柔天气变化。</span></div>
      </div>

      <div className="quiet-card">
        <p className="eyebrow">最重要的一件事</p>
        <h3>{hasPlants ? '下次去，先拍一张现在的样子。' : '先在「生长」里添加第一种植物。'}</h3>
        <p>园丁记得：{garden.preferences?.style?.join('、') || '这块地要省心、好看、孩子能参与'}。</p>
      </div>

      {photos.length > 0 && <div className="photo-strip-card">
        <p className="eyebrow">最近照片</p>
        <div className="photo-strip">
          {photos.slice(0, 4).map((photo) => <PhotoThumb key={photo.id} photo={photo} />)}
        </div>
      </div>}

      <div className="quick-actions">
        <button onClick={() => quickLog('watered', '浇水了')}>浇水了</button>
        <button onClick={() => quickLog('weeded', '除草了')}>除草了</button>
        <button onClick={() => quickLog('harvested', '采收了')}>采收了</button>
      </div>

      <div className="child-card">
        <p className="eyebrow">最近</p>
        {logs.length ? logs.map((log) => <p key={log.id}>· {formatDate(log.happened_at)}｜{log.title}</p>) : <p>菜地还没留下记录。先拍一张今天的样子。</p>}
      </div>
    </section>
  );
}

function GardenMap({ beds, plants, setToast, onRefresh }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  async function addBed() {
    if (!name.trim()) return;
    const gardenId = beds[0]?.garden_id || plants[0]?.garden_id;
    if (!gardenId) return;
    const { error } = await supabase.from('beds').insert({ garden_id: gardenId, name, sunlight: '不确定', water_access: '不确定', bed_type: '混合', position_order: beds.length + 1 });
    if (error) setToast(`新区还没建好：${error.message}`);
    else { setToast('新区建好了。以后再慢慢细化。'); setAdding(false); setName(''); onRefresh(); }
  }

  return (
    <section className="page">
      <div className="section-title"><h2>地图</h2><p>这块地是怎么被安排的。</p></div>
      <div className="map-grid">
        {beds.map((bed) => {
          const bedPlants = plants.filter((p) => p.bed_id === bed.id).map((p) => p.name).join('、') || '还没添加植物';
          return <div className="bed-card" key={bed.id}>
            <div className="bed-top"><h3>{bed.name}</h3><span>{bed.sunlight}</span></div>
            <p className="bed-detail">现在：{bedPlants}</p>
            <p>水源：{bed.water_access}</p>
            <p className="soft-note">{bed.bed_type === '给一天观察' ? '适合放一盆薄荷，或者种几株向日葵。' : '先保持简单，后面再让园丁给布局建议。'}</p>
          </div>;
        })}
      </div>
      {adding ? <div className="quiet-card form-row"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="比如：香草区" /><button onClick={addBed}>保存</button></div> : <button className="secondary-button" onClick={() => setAdding(true)}><Plus size={16}/> 建一个新区</button>}
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
    else { setToast('记下了。以后它的照片和记录都会放在这里。'); setAdding(false); setName(''); onRefresh(); }
  }

  return (
    <section className="page">
      <div className="section-title"><h2>生长</h2><p>{plants.length ? `${plants.length} 种植物正在被记住。` : '它们长到哪了。'}</p></div>
      {plants.length ? <div className="plant-list">
        {plants.map((plant) => <div className="plant-card" key={plant.id}>
          <div className="plant-icon"><Sprout size={22}/></div>
          <div>
            <div className="plant-head"><h3>{plant.name}</h3><span>{plant.status === 'issue' ? '看一眼' : '安心'}</span></div>
            <p className="phase">{STAGE_LABELS[plant.stage] || '不确定'}</p>
            <p>区域：{plant.beds?.name || '未分区'}</p>
            <p>下次：先拍一张现在的样子。</p>
          </div>
          <ChevronRight className="chevron" size={18}/>
        </div>)}
      </div> : <EmptyState title="这块地还空着。" body="先添加一种植物，或者拍一张让园丁看看。" />}

      {adding && <div className="quiet-card form-stack">
        <label>植物名<input value={name} onChange={(e) => setName(e.target.value)} placeholder="比如：A 畦番茄" /></label>
        <label>区域<select value={bedId} onChange={(e) => setBedId(e.target.value)}>{beds.map((bed) => <option key={bed.id} value={bed.id}>{bed.name}</option>)}</select></label>
        <label>阶段<select value={stage} onChange={(e) => setStage(e.target.value)}>{Object.entries(STAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="primary-button" onClick={addPlant}>添加</button>
      </div>}
      {!adding && <button className="secondary-button" onClick={() => setAdding(true)}><Plus size={16}/> 添加植物</button>}
    </section>
  );
}

function Seasons({ plants, logs, photos }) {
  const highlights = [];
  if (plants.length) highlights.push(`${plants.length} 种植物被记住了。`);
  if (logs.length) highlights.push(`这周有 ${logs.length} 条新记录。`);
  if (photos.length) highlights.push(`这周有 ${photos.length} 张照片加入四季。`);
  if (!highlights.length) highlights.push('第一张照片会成为这一年的开头。');

  return (
    <section className="page">
      <div className="letter-card">
        <p className="eyebrow">菜地来信</p>
        <h2>{logs.length || photos.length ? '这周，菜地有了新的记录。' : '四季还没开始。'}</h2>
        <ul>{highlights.map((note) => <li key={note}>{note}</li>)}</ul>
      </div>
      {photos.length > 0 && <div className="quiet-card">
        <p className="eyebrow">这一周的照片</p>
        <div className="photo-grid">
          {photos.slice(0, 6).map((photo) => <PhotoThumb key={photo.id} photo={photo} />)}
        </div>
      </div>}
      <div className="quiet-card">
        <p className="eyebrow">封季预览</p>
        <h3>2026 夏｜一天菜园</h3>
        <p>这个夏天，菜地没有被完美管理。但它被你们看见了很多次。</p>
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

  function reset() {
    setFile(null);
    setPreview('');
    setTargetType('garden');
    setTargetId('');
    setBusy(false);
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
        ? `今天的${plants.find((p) => p.id === targetId)?.name || '植物'}，记住了。`
        : targetType === 'bed'
          ? `今天的${beds.find((b) => b.id === targetId)?.name || '这块地'}，留下来了。`
          : targetType === 'child'
            ? '一天的小发现，记住了。'
            : '今天的菜地，留下来了。';

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

      setToast(caption);
      close();
      onRefresh();
    } catch (error) {
      setToast(`这张照片还没保存上：${error.message}`);
      setBusy(false);
    }
  }

  return <>
    <label className="capture-button"><Camera size={20} />拍一下<input className="hidden-input" type="file" accept="image/*" capture="environment" onChange={handleFile} /></label>
    {open && <div className="modal-backdrop">
      <div className="capture-modal">
        <div className="modal-head">
          <div><p className="eyebrow">拍一下</p><h3>这张照片记到哪里？</h3></div>
          <button className="icon-button" onClick={close}><X size={18} /></button>
        </div>
        {preview && <img className="capture-preview" src={preview} alt="准备保存的菜地照片" />}
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
          <button className="primary-button" onClick={uploadPhoto} disabled={busy}>{busy ? <Loader2 className="spin" size={18} /> : <ImageIcon size={18} />} 保存到四季</button>
          <button className="secondary-button" onClick={close} disabled={busy}>先不保存</button>
        </div>
      </div>
    </div>}
  </>;
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
  return <section className="login-page"><div className="login-card"><h1>还差 Supabase 配置。</h1><p>请在 Netlify 添加 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 后重新部署。</p></div></section>;
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
