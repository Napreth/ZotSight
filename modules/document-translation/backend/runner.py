"""JSON-lines worker for ZSTranslate. No provider credentials are passed here.
Copyright (C) 2026 Napreth. SPDX-License-Identifier: AGPL-3.0-or-later
"""
import contextlib
import importlib.metadata
import json
from pathlib import Path
import shutil
import subprocess
import sys
import traceback

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
OUTPUT = sys.stdout


def emit(kind, data):
    OUTPUT.write(json.dumps({'type': kind, 'data': data}, ensure_ascii=False, default=str) + '\n')
    OUTPUT.flush()


def doctor(data):
    versions = {}
    for package in ['pymupdf', 'pylatexenc', 'lxml', 'babeldoc', 'pdf2zh']:
        try:
            versions[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            versions[package] = None
    return {'python': sys.executable, 'version': sys.version.split()[0], 'packages': versions,
        'xelatex': shutil.which(data.get('xelatex') or 'xelatex'), 'pdflatex': shutil.which(data.get('pdflatex') or 'pdflatex'),
        'latexml': shutil.which(data.get('latexml') or 'latexmlc')}


def pdf_info(data):
    import pymupdf as fitz
    pdf = fitz.open(data['pdf']); pages = []
    for index, page in enumerate(pdf):
        characters = len(page.get_text().strip())
        images = page.get_image_info()
        image_area = sum((fitz.Rect(image['bbox']) & page.rect).get_area() for image in images)
        pages.append({'page': index + 1, 'characters': characters, 'scanned': characters < 30 and image_area > page.rect.get_area() * .5})
    return {'pages': pages, 'scannedPages': [p['page'] for p in pages if p['scanned']], 'metadata': pdf.metadata}


def extract_tex(data):
    from latex import unpack_source, extract_units
    root = unpack_source(data['archive'], data['directory']) if data.get('archive') else Path(data['directory']).resolve()
    result = extract_units(root, data.get('main', ''))
    output = Path(data['project'])
    output.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    # LaTeXML provides a semantic HTML view. Source ranges remain authoritative for reinsertion.
    runtime = data.get('runtime', {})
    oxide = runtime.get('dependencies', {}).get('latexml', {}).get('method') == 'oxide'
    executable = runtime.get('latexml') or (None if oxide else shutil.which('latexmlc'))
    if executable:
        emit('progress', {'message': 'LaTeXML：生成语义 HTML…'})
        html = root / 'source.html'
        destination = '--destination=' if 'oxide' in Path(executable).name.lower() else '--dest='
        command = [executable]
        if sys.platform == 'win32' and not executable.lower().endswith('.exe'):
            perl = runtime.get('dependencies', {}).get('latexml', {}).get('perl') or shutil.which('perl')
            if not perl:
                raise RuntimeError('指定的 LaTeXML 脚本需要 Perl。')
            command = [perl, '-x', executable]
        process = subprocess.run(command + ['--format=html5', destination + str(html), result['main']],
            cwd=root, capture_output=True, timeout=180, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        if process.returncode == 0 and html.exists():
            result['semanticHtml'] = str(html)
            result['extractor'] = 'LaTeXML+pylatexenc-source-ranges'
    return {'main': result['main'], 'units': result['units'], 'extractor': result['extractor'], 'project': str(output)}


def dispatch(action, data):
    if action == 'doctor':
        return doctor(data)
    if action == 'pdf_info':
        return pdf_info(data)
    if action == 'unpack_tex':
        from latex import unpack_source
        root = unpack_source(data['archive'], data['directory'])
        files = [str(p.relative_to(root)).replace('\\', '/') for p in root.rglob('*') if p.is_file()]
        if not any(p.lower().endswith('.tex') for p in files):
            raise ValueError('源文件中没有找到 .tex 文件。')
        return {'files': files}
    if action == 'extract_tex':
        return extract_tex(data)
    if action == 'render_tex':
        from latex import fill_source
        return fill_source(data, emit)
    if action in {'babeldoc', 'pdfmath'}:
        import layout
        return getattr(layout, action)(data, emit)
    raise ValueError('未知的文档翻译操作。')


if __name__ == '__main__':
    try:
        payload = json.load(sys.stdin)
        with contextlib.redirect_stdout(sys.stderr):
            result = dispatch(sys.argv[1], payload)
        emit('result', result)
    except BaseException as error:
        traceback.print_exc(file=sys.stderr)
        emit('error', {'message': str(error), 'kind': type(error).__name__})
        sys.exit(1)
