/** Komponen dasar design system NalarRuang (Ikon, Wordmark, Bintang, SimbolPeta, Toggle, Toast, keadaan). */
import type { CSSProperties, ReactNode } from 'react';
import { useBahasa } from '@/lib/bahasa';
import { cx, type Simbol } from '@/lib/nalar';
import { IKON } from './ikon-data';

type IkonProps = { name: string; size?: number; strokeWidth?: number; color?: string; fill?: string; className?: string; label?: string; style?: CSSProperties };

export function Ikon({ name, size = 16, strokeWidth = 2, color = 'currentColor', fill = 'none', className, label, style }: IkonProps) {
    const node = IKON[name];
    if (!node) return null;
    return (
        <svg
            className={cx('nr-svg', className)}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fill}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden={label ? undefined : true}
            role={label ? 'img' : undefined}
            aria-label={label}
            style={style}
        >
            {node.map(([tag, attrs], i) => {
                const Tag = tag as 'path';
                return <Tag key={i} {...attrs} />;
            })}
        </svg>
    );
}

export function Wordmark({ size, style }: { size?: number; style?: CSSProperties }) {
    return (
        <span className="nr-wordmark" style={{ ...(size ? { fontSize: size } : {}), ...style }}>
            Nalar<i>Ruang</i>
        </span>
    );
}

export function Bintang({ score, muted }: { score: number; muted?: boolean }) {
    const { t } = useBahasa();
    const nilai = Math.max(0, Math.min(3, score));
    const warna = muted ? 'var(--star-muted)' : 'var(--star-on)';
    return (
        <span className="nr-stars" aria-hidden="true">
            {nilai === 0 && <span className="nr-stars__zero">{t('0 dari 3', '0 of 3')}</span>}
            {[0, 1, 2].map((i) => (
                <Ikon key={i} name="star" size={16} color={i < nilai ? warna : 'var(--slate-200)'} fill={i < nilai ? warna : 'none'} />
            ))}
        </span>
    );
}

export function SimbolPeta({ kind, size = 16 }: { kind: Simbol; size?: number }) {
    const garis = (warna: string, d = '4 2.5') => <line x1={1} x2={15} y1={8} y2={8} style={{ stroke: warna, strokeWidth: 3, strokeDasharray: d }} />;
    const batang = (warna: string) => <rect x={0} y={6} width={16} height={4} rx={2} style={{ fill: warna }} />;
    const kotak = (warna: string, isi: number) => (
        <rect x={1.5} y={2.5} width={13} height={11} rx={2} style={{ fill: warna, fillOpacity: isi, stroke: warna, strokeWidth: 1.5 }} />
    );
    const isi: Record<Simbol, ReactNode> = {
        banjir: kotak('var(--map-banjir)', 0.3),
        legal: kotak('var(--map-legal)', 0.2),
        rth: kotak('var(--map-hijau)', 0.25),
        hijau: <circle cx={8} cy={8} r={6} style={{ fill: 'var(--map-hijau)', fillOpacity: 0.8, stroke: 'var(--white)', strokeWidth: 2 }} />,
        akses: <circle cx={8} cy={8} r={6} style={{ fill: 'var(--map-akses)', stroke: 'var(--white)', strokeWidth: 2 }} />,
        halte: <circle cx={8} cy={8} r={3.5} style={{ fill: 'var(--navy-900)', stroke: 'var(--white)', strokeWidth: 1.5 }} />,
        trotoar: garis('var(--map-akses)', '3 2.5'),
        mrt: batang('var(--map-mrt)'),
        lrt: batang('var(--map-lrt)'),
        'krl-bogor': garis('var(--map-krl-bogor)'),
        'krl-rangkas': garis('var(--map-krl-rangkas)'),
        'krl-cikarang': garis('var(--map-krl-cikarang)'),
        'krl-lain': garis('var(--map-krl-lain)'),
        waktu: garis('var(--map-waktu)', '4 3'),
        stasiun: <circle cx={8} cy={8} r={5} style={{ fill: 'var(--map-stasiun)', stroke: 'var(--navy-900)', strokeWidth: 2 }} />,
        rute: (
            <g>
                <line x1={1} x2={15} y1={8} y2={8} style={{ stroke: 'var(--navy-900)', strokeWidth: 4, strokeLinecap: 'round' }} />
                <path d="M6.5 5.5 9 8 6.5 10.5" style={{ fill: 'none', stroke: 'var(--white)', strokeWidth: 1.4, strokeLinecap: 'round' }} />
            </g>
        ),
        'jalan-kaki': <line x1={2} x2={15} y1={8} y2={8} style={{ stroke: 'var(--navy-900)', strokeWidth: 3, strokeDasharray: '0.1 5', strokeLinecap: 'round' }} />,
        terpilih: <rect x={1.5} y={2.5} width={13} height={11} rx={2} style={{ fill: 'var(--navy-900)', fillOpacity: 0.08, stroke: 'var(--navy-900)', strokeWidth: 2 }} />,
    };
    return (
        <svg className="nr-svg" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
            {isi[kind]}
        </svg>
    );
}

export function Toggle({ checked, label, disabled, onChange }: { checked: boolean; label: string; disabled?: boolean; onChange?: () => void }) {
    return <button type="button" className="nr-toggle" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange} />;
}

export type NadaToast = 'info' | 'success' | 'warning' | 'danger';

export function Toast({ tone = 'info', children }: { tone?: NadaToast; children: ReactNode }) {
    const warna = { success: 'var(--status-success)', danger: 'var(--status-danger)', warning: 'var(--status-warning)', info: 'var(--navy-900)' }[tone];
    return (
        <div className="nr-toast" role={tone === 'danger' ? 'alert' : 'status'}>
            <span className="nr-toast__dot" style={{ background: warna }} />
            {children}
        </div>
    );
}

export function Keadaan({ kind, title, text, action, onAction }: { kind: 'kosong' | 'peringatan' | 'galat' | 'memuat'; title?: string; text?: string; action?: string; onAction?: () => void }) {
    const { t } = useBahasa();
    if (kind === 'memuat') {
        return (
            <div className="nr-state" aria-busy="true" aria-label={title ?? t('Memuat', 'Loading')} style={{ flexDirection: 'column', gap: 10 }}>
                <span className="nr-skeleton" style={{ width: '40%' }} />
                <span className="nr-skeleton" style={{ width: '85%' }} />
                <span className="nr-skeleton" style={{ width: '70%' }} />
            </div>
        );
    }
    const peta = { kosong: ['search-x', 'var(--ink-60)'], peringatan: ['triangle-alert', 'var(--amber-600)'], galat: ['circle-alert', 'var(--red-600)'] } as const;
    const [ikon, warna] = peta[kind];
    return (
        <div className="nr-state" role={kind === 'galat' ? 'alert' : 'status'}>
            <span className="nr-state__icon" style={{ color: warna }}>
                <Ikon name={ikon} size={16} />
            </span>
            <div>
                <p className="nr-state__title">{title}</p>
                <p className="nr-state__text">{text}</p>
                {action && (
                    <button type="button" className="nr-linkcaps nr-state__action" onClick={onAction}>
                        {action}
                    </button>
                )}
            </div>
        </div>
    );
}

export function PanelKanan({ title, className, onClose, children }: { title: string; className?: string; onClose: () => void; children: ReactNode }) {
    const { t } = useBahasa();
    return (
        <section className={cx('nr-rpanel', className)} aria-label={title}>
            <div className="nr-panelhead">
                <span className="nr-label">{title}</span>
                <button type="button" className="nr-iconbtn" aria-label={`${t('Tutup', 'Close')} ${title.toLowerCase()}`} onClick={onClose}>
                    <Ikon name="x" size={14} />
                </button>
            </div>
            <div className="nr-rpanel__body">{children}</div>
        </section>
    );
}
