const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function safeJson(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (_) {}
  }
  return null;
}

function normalizeResult(raw) {
  const fallback = {
    title: '这张看到了',
    body: '照片已保存。下次可以再补一张叶片和土面的近照。',
    reason: '照片信息有限，只做温和观察。',
    status_tag: 'unclear',
    confidence_label: 'uncertain',
    season_material: true,
  };
  const data = raw && typeof raw === 'object' ? raw : fallback;
  const status = ['normal', 'watch', 'dry', 'unclear'].includes(data.status_tag) ? data.status_tag : 'unclear';
  const confidence = ['high', 'medium', 'low', 'uncertain'].includes(data.confidence_label) ? data.confidence_label : 'uncertain';
  return {
    title: String(data.title || fallback.title).slice(0, 40),
    body: String(data.body || fallback.body).slice(0, 140),
    reason: String(data.reason || fallback.reason).slice(0, 120),
    status_tag: status,
    confidence_label: confidence,
    season_material: data.season_material !== false,
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const apiKey = process.env.DOUBAO_API_KEY;
    const model = process.env.DOUBAO_MODEL || 'doubao-seed-2-1-pro-260628';
    const baseUrl = process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
    if (!apiKey) {
      return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Missing DOUBAO_API_KEY' }) };
    }

    const payload = JSON.parse(event.body || '{}');
    const image = payload.image_base64;
    const targetLabel = String(payload.target_label || '这张菜地照片').slice(0, 40);
    const targetType = String(payload.target_type || 'garden').slice(0, 20);
    if (!image || !String(image).startsWith('data:image/')) {
      return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Missing image data URL' }) };
    }

    const prompt = `你是一位克制、谨慎的家庭菜园观察助手。请看这张照片，只做低风险观察，不要诊断病害，不要建议用药，不要夸大。对象：${targetLabel}，类型：${targetType}。输出必须是 JSON：{"title":"不超过14个汉字","body":"一句自然中文，说明看到了什么和温和建议","reason":"一句话说明依据","status_tag":"normal|watch|dry|unclear","confidence_label":"high|medium|low|uncertain","season_material":true}`;

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: '你只输出 JSON，不输出 Markdown。你是家庭菜园观察助手，语言自然、谨慎、适合中国家庭使用。' },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      return { statusCode: response.status, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Doubao request failed', detail: text.slice(0, 240) }) };
    }

    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content || '';
    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(normalizeResult(safeJson(content))) };
  } catch (error) {
    return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: error.message || 'Analyze failed' }) };
  }
}
