/**
 * WebDAV 客户端 - 坚果云同步
 * 支持：PROPFIND/GET/PUT/DELETE
 */

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  filename?: string;
}

export interface WebDAVFileInfo {
  exists: boolean;
  lastModified?: string;
  contentLength?: number;
}

function getAuthHeader(config: WebDAVConfig): string {
  return 'Basic ' + btoa(config.username + ':' + config.password);
}

/**
 * 检查文件是否存在并获取信息
 */
export async function webdavPropfind(config: WebDAVConfig): Promise<WebDAVFileInfo> {
  const url = config.url.replace(/\/$/, '') + '/' + (config.filename || 'sunsama-sync.json');
  const res = await fetch(url, {
    method: 'PROPFIND',
    headers: {
      'Authorization': getAuthHeader(config),
      'Content-Type': 'text/xml',
      'Depth': '0',
    },
  });
  if (res.status === 404) return { exists: false };
  if (!res.ok) throw new Error(`PROPFIND ${res.status}: ${res.statusText}`);
  const xml = await res.text();
  const lastMatch = xml.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/i);
  const sizeMatch = xml.match(/<d:getcontentlength>([^<]+)<\/d:getcontentlength>/i);
  return {
    exists: true,
    lastModified: lastMatch?.[1],
    contentLength: sizeMatch ? parseInt(sizeMatch[1]) : undefined,
  };
}

/**
 * 下载文件内容
 */
export async function webdavDownload(config: WebDAVConfig): Promise<string> {
  const url = config.url.replace(/\/$/, '') + '/' + (config.filename || 'sunsama-sync.json');
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(config),
    },
  });
  if (!res.ok) throw new Error(`GET ${res.status}: ${res.statusText}`);
  return res.text();
}

/**
 * 上传文件内容
 */
export async function webdavUpload(config: WebDAVConfig, content: string): Promise<void> {
  const url = config.url.replace(/\/$/, '') + '/' + (config.filename || 'sunsama-sync.json');
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': getAuthHeader(config),
      'Content-Type': 'application/json',
    },
    body: content,
  });
  if (!res.ok) throw new Error(`PUT ${res.status}: ${res.statusText}`);
}

/**
 * 验证配置是否可用
 */
export async function webdavTest(config: WebDAVConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const url = config.url.replace(/\/$/, '') + '/';
    const res = await fetch(url, {
      method: 'PROPFIND',
      headers: {
        'Authorization': getAuthHeader(config),
        'Content-Type': 'text/xml',
        'Depth': '0',
      },
    });
    if (res.ok || res.status === 207) {
      return { ok: true, message: '连接成功' };
    }
    if (res.status === 401) {
      return { ok: false, message: '账号或密码错误' };
    }
    return { ok: false, message: `服务器返回 ${res.status}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Failed to fetch') || msg.includes('CORS')) {
      return { ok: false, message: '网络连接失败，可能是浏览器跨域限制（CORS）。建议：1）使用坚果云客户端的WebDAV代理功能；2）或使用「链接同步」替代。' };
    }
    return { ok: false, message: msg };
  }
}

/**
 * 保存配置到 localStorage
 */
export function saveWebDAVConfig(config: WebDAVConfig) {
  localStorage.setItem('sunsama-webdav-config', JSON.stringify(config));
}

/**
 * 从 localStorage 读取配置
 */
export function loadWebDAVConfig(): WebDAVConfig | null {
  const raw = localStorage.getItem('sunsama-webdav-config');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch { return null; }
}

/**
 * 删除配置
 */
export function clearWebDAVConfig() {
  localStorage.removeItem('sunsama-webdav-config');
}
