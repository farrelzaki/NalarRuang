"""Pembantu penggantian teks berpasangan untuk penerjemahan UI (alat kerja, tidak di-commit)."""
import sys, json


def edit(p, pairs):
    s = open(p, encoding='utf8').read()
    for a, b in pairs:
        if a not in s:
            raise SystemExit(f'NOT FOUND in {p}: {a[:90]}')
        s = s.replace(a, b)
    open(p, 'w', encoding='utf8').write(s)


if __name__ == '__main__':
    # Berkas pasangan: JSON {"file": "...", "pairs": [[lama, baru], ...]}
    for f in sys.argv[1:]:
        d = json.load(open(f, encoding='utf8'))
        edit(d['file'], d['pairs'])
        print('ok', d['file'])
