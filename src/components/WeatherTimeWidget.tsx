import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog,
  CloudSun, MapPin, Navigation,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ================================================================
   农历算法（1900-2100）
   ================================================================ */
const LUNAR_MONTH_NAMES = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
const LUNAR_DAY_NAMES = [
  '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
  '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'
];

const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0
];

const BASE_DATE = new Date(1900, 0, 31);

function toLunar(date: Date) {
  let offset = Math.floor((date.getTime() - BASE_DATE.getTime()) / 86400000);
  let year = 1900;
  while (offset > 0) {
    let d = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) d += (LUNAR_INFO[year - 1900] & i) ? 1 : 0;
    d += ((LUNAR_INFO[year - 1900] & 0xf) && ((LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29));
    if (offset < d) break;
    offset -= d; year++;
  }
  let leap = LUNAR_INFO[year - 1900] & 0xf;
  let month = 1, isLeap = false;
  while (offset > 0) {
    let days: number;
    if (leap > 0 && month === leap + 1 && !isLeap) { month--; isLeap = true; days = (LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29; }
    else { isLeap = false; days = (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29; }
    if (offset < days) break;
    offset -= days; month++;
  }
  return { toString: () => LUNAR_MONTH_NAMES[month - 1] + '月' + LUNAR_DAY_NAMES[offset] };
}

/* ================================================================
   天气
   ================================================================ */
const WEATHER_ICON_MAP: Record<number, { icon: React.ElementType; label: string }> = {
  0:  { icon: Sun,           label: '晴' },
  1:  { icon: CloudSun,      label: '少云' },
  2:  { icon: CloudSun,      label: '多云' },
  3:  { icon: Cloud,         label: '阴' },
  45: { icon: CloudFog,      label: '雾' },
  48: { icon: CloudFog,      label: '雾凇' },
  51: { icon: CloudDrizzle,  label: '毛毛雨' },
  53: { icon: CloudDrizzle,  label: '中 drizzle' },
  55: { icon: CloudDrizzle,  label: '大 drizzle' },
  61: { icon: CloudRain,     label: '小雨' },
  63: { icon: CloudRain,     label: '中雨' },
  65: { icon: CloudRain,     label: '大雨' },
  71: { icon: CloudSnow,     label: '小雪' },
  73: { icon: CloudSnow,     label: '中雪' },
  75: { icon: CloudSnow,     label: '大雪' },
  80: { icon: CloudRain,     label: '阵雨' },
  95: { icon: CloudLightning,label: '雷暴' },
  96: { icon: CloudLightning,label: '雷暴+雹' },
  99: { icon: CloudLightning,label: '强雷暴' },
};

function getWeatherInfo(code: number) {
  return WEATHER_ICON_MAP[code] || { icon: Cloud, label: '多云' };
}

interface WeatherDay { date: string; dayLabel: string; code: number; maxTemp: number; minTemp: number; }
interface WeatherData { city: string; currentCode: number; currentMax: number; currentMin: number; days: WeatherDay[]; }
const WEEK_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function WeatherTimeWidget() {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const fetchWeather = useCallback(async (lat: number, lon: number, cityName?: string) => {
    try {
      setLoading(true);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=6`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('weather fetch failed');
      const data = await res.json();
      const days: WeatherDay[] = data.daily.time.slice(0, 6).map((t: string, i: number) => {
        const d = new Date(t);
        const isToday = d.toDateString() === new Date().toDateString();
        return { date: t.slice(5), dayLabel: isToday ? '今天' : WEEK_DAYS[d.getDay()], code: data.daily.weather_code[i], maxTemp: Math.round(data.daily.temperature_2m_max[i]), minTemp: Math.round(data.daily.temperature_2m_min[i]) };
      });
      setWeather({ city: cityName || '本地', currentCode: days[0].code, currentMax: days[0].maxTemp, currentMin: days[0].minTemp, days });
      setError(false);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);

  // Track if user has denied location so we can show a helpful message
  const [locationDenied, setLocationDenied] = useState(false);

  const tryGeolocate = useCallback(() => {
    setLocationDenied(false);
    setLoading(true);
    setError(false);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, '本地'),
        () => {
          setLocationDenied(true);
          fetchWeather(39.9042, 116.4074, '北京');
        },
        { timeout: 8000, enableHighAccuracy: false }
      );
    } else {
      fetchWeather(39.9042, 116.4074, '北京');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fallbackToBeijing = () => {
      fetchWeather(39.9042, 116.4074, '北京');
    };

    // 1. 先尝试 IP 定位（不需要权限，适用于 HTTP/HTTPS）
    fetch('https://ipapi.co/json/')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        const lat = data.latitude;
        const lon = data.longitude;
        const city = data.city || '本地';
        if (lat && lon) {
          fetchWeather(lat, lon, city);
          return;
        }
        throw new Error('no coordinates');
      })
      .catch(() => {
        // 2. IP 定位失败，尝试浏览器 Geolocation API
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, '本地'),
            () => {
              setLocationDenied(true);
              fallbackToBeijing();
            },
            { timeout: 6000, enableHighAccuracy: false }
          );
        } else {
          fallbackToBeijing();
        }
      });
  }, [fetchWeather]);

  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const dateStr = `${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
  const weekStr = WEEK_DAYS[now.getDay()];
  const lunar = toLunar(now);

  const currentWeather = weather ? getWeatherInfo(weather.currentCode) : null;
  const CurrentIcon = currentWeather?.icon || Cloud;

  return (
    <div className="weather-glass glass-panel relative rounded-xl overflow-hidden bg-[var(--app-surface)]" style={{ backdropFilter: 'blur(28px) saturate(1.6)', WebkitBackdropFilter: 'blur(28px) saturate(1.6)' }}>
      {/* 液态玻璃：顶部高光 */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
      {/* 液态玻璃：左侧边缘光 */}
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/30 via-transparent to-transparent pointer-events-none" />

      <div className="p-3 relative z-10">
        {/* 时间 + 日期 */}
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[20px] font-semibold tabular-nums tracking-tight text-[var(--app-text)] leading-none">
            {timeStr}
          </div>
          <div className="text-right">
            <div className="text-[12px] font-medium text-[var(--app-text-secondary)]">{dateStr}</div>
            <div className="text-[10px] text-[var(--app-text-muted)] mt-0.5">{weekStr} · {lunar.toString()}</div>
          </div>
        </div>

        {/* 天气 */}
        <div>
          {loading ? (
            <div className="flex items-center gap-2 text-[11px] text-[var(--app-text-muted)] py-2">
              <Navigation size={12} className="animate-spin" />
              正在获取天气...
            </div>
          ) : error || !weather ? (
            <div className="flex items-center justify-between py-1">
              <span className="text-[11px] text-[var(--app-text-muted)]">
                {locationDenied ? '定位失败，已默认显示北京' : '天气获取失败'}
              </span>
              <button
                onClick={tryGeolocate}
                className="shrink-0 ml-2 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--app-accent)]/10 text-[var(--app-accent)] hover:bg-[var(--app-accent)]/20 transition-colors"
                title="点击获取本地天气（需授权定位权限）"
              >
                <Navigation size={10} className="inline mr-1" />
                定位到本地
              </button>
            </div>
          ) : (
            <>
              {/* 当前天气 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <CurrentIcon size={22} className="text-[var(--app-accent)]" strokeWidth={1.5} />
                    {weather.currentCode === 0 && (
                      <div className="absolute inset-0 rounded-full bg-[var(--app-accent)]/15 animate-ping" style={{ animationDuration: '3s' }} />
                    )}
                  </div>
                  <div>
                    <div className="text-[12px] font-medium text-[var(--app-text)]">{currentWeather?.label}</div>
                    <div className="flex items-center gap-1 text-[10px] text-[var(--app-text-muted)]">
                      <MapPin size={9} />{weather.city}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-semibold text-[var(--app-text)] tabular-nums">{weather.currentMax}°</div>
                  <div className="text-[10px] text-[var(--app-text-muted)]">{weather.currentMin}° / {weather.currentMax}°</div>
                </div>
              </div>

              {/* 5天预报 */}
              <div className="flex items-stretch gap-1">
                {weather.days.map((day, idx) => {
                  const info = getWeatherInfo(day.code);
                  const DayIcon = info.icon;
                  return (
                    <div key={idx} className={cn('flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all', idx === 0 ? 'bg-[var(--app-accent)]/10' : 'bg-[var(--app-surface-hover)]')}>
                      <span className="text-[9px] text-[var(--app-text-muted)] font-medium">{day.dayLabel}</span>
                      <DayIcon size={16} className={cn('shrink-0', idx === 0 ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-secondary)]')} strokeWidth={1.5} />
                      <span className="text-[10px] font-semibold text-[var(--app-text)] tabular-nums">{day.maxTemp}°</span>
                      <span className="text-[9px] text-[var(--app-text-muted)] tabular-nums">{day.minTemp}°</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
