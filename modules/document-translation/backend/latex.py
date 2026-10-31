"""Source-preserving TeX extraction and compilation. Copyright (C) 2026 Napreth.
SPDX-License-Identifier: AGPL-3.0-or-later
"""
import gzip
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tarfile


def tex_escape(text):
    replacements = {'\\': r'\textbackslash{}', '&': r'\&', '%': r'\%', '$': r'\$',
                    '#': r'\#', '_': r'\_', '{': r'\{', '}': r'\}', '~': r'\textasciitilde{}', '^': r'\textasciicircum{}'}
    return ''.join(replacements.get(char, char) for char in text)


def unpack_source(archive, directory):
    destination = Path(directory).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    data = Path(archive).read_bytes()
    if data.startswith(b'%PDF'):
        raise ValueError('arXiv 只提供了 PDF，没有可翻译的 LaTeX 源文件。')
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode='r:*') as bundle:
            members = bundle.getmembers()
            if len(members) > 10000 or sum(member.size for member in members) > 250 * 1024 * 1024:
                raise ValueError('LaTeX 源码压缩包超过解压限制。')
            for member in members:
                target = (destination / member.name).resolve()
                if not target.is_relative_to(destination) or member.issym() or member.islnk() or not (member.isfile() or member.isdir()):
                    raise ValueError('LaTeX 源码压缩包包含不安全的路径或链接。')
                if member.size > 40 * 1024 * 1024:
                    raise ValueError('LaTeX 源码中的单个文件过大。')
            bundle.extractall(destination, members=members, filter='data')
    except tarfile.ReadError:
        if data.startswith(b'\x1f\x8b'):
            with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:
                data = stream.read(40 * 1024 * 1024 + 1)
        if len(data) > 40 * 1024 * 1024 or b'\\documentclass' not in data:
            raise ValueError('下载的内容不是受支持的 LaTeX 源码。')
        (destination / 'main.tex').write_bytes(data)
    return destination


def read_tex(path):
    data = Path(path).read_bytes()
    for encoding in ['utf-8-sig', 'latin-1']:
        try:
            return data.decode(encoding).replace('\r\n', '\n').replace('\r', '\n')
        except UnicodeDecodeError:
            continue
    raise ValueError(f'无法读取 TeX 文件：{Path(path).name}')


def collect_source(directory, main=''):
    root = Path(directory).resolve()
    candidates = [p for p in root.rglob('*.tex') if re.search(r'\\documentclass(?:\[|\{)', read_tex(p)) and r'\begin{document}' in read_tex(p)]
    if main:
        entry = (root / main).resolve()
        if not entry.is_relative_to(root) or entry not in candidates:
            raise ValueError('指定的 LaTeX 主文件不存在或不是完整文档。')
    elif len(candidates) == 1:
        entry = candidates[0]
    else:
        preferred = [p for p in candidates if p.stem.lower() in {'main', 'paper', 'article', 'ms', 'manuscript'}]
        if len(preferred) == 1:
            entry = preferred[0]
        else:
            raise ValueError('无法确定 LaTeX 主文件：' + ', '.join(str(p.relative_to(root)) for p in candidates[:12]))
    files = {}

    def visit(path):
        path = path.resolve()
        if not path.is_relative_to(root):
            raise ValueError('LaTeX 引用超出了源码目录。')
        key = path.relative_to(root).as_posix()
        if key in files:
            return
        text = read_tex(path)
        files[key] = text
        for match in re.finditer(r'\\(?:input|include|subfile)\s*(?:\{([^}]+)\}|([^\s%{}]+))', text):
            name = (match.group(1) or match.group(2)).strip()
            if '\\' in name or '#' in name:
                continue
            target = path.parent / name
            if not target.suffix:
                target = target.with_suffix('.tex')
            if not target.exists():
                target = root / name
                if not target.suffix:
                    target = target.with_suffix('.tex')
            if target.exists():
                visit(target)

    visit(entry)
    return entry.relative_to(root).as_posix(), files


def extract_units(directory, main=''):
    from pylatexenc.latexwalker import LatexWalker, LatexCharsNode, LatexGroupNode, LatexMacroNode, LatexEnvironmentNode
    main, files = collect_source(directory, main)
    units = []
    ignored_macros = {'label', 'ref', 'eqref', 'pageref', 'cref', 'Cref', 'autoref', 'Autoref', 'vref', 'Vref', 'nameref', 'cite', 'citep', 'citet', 'citealt', 'citeauthor', 'citeyear', 'nocite', 'url', 'path', 'texttt', 'verb', 'Verb', 'lstinline', 'mintinline', 'includegraphics', 'input', 'include', 'subfile', 'bibliography', 'bibliographystyle', 'newcommand', 'renewcommand', 'providecommand', 'def', 'gdef', 'edef', 'xdef', 'DeclareMathOperator', 'author', 'affiliation', 'institute', 'address', 'email', 'usepackage', 'documentclass', 'setlength', 'newenvironment', 'renewenvironment', 'hypersetup', 'lstset', 'captionsetup', 'setkeys', 'setlist', 'setminted', 'newcolumntype', 'cmidrule', 'cline', 'hhline', 'specialrule', 'addlinespace', 'rowcolor', 'cellcolor', 'arrayrulecolor', 'columncolor', 'refstepcounter', 'counterwithin', 'setcounter', 'addtocounter', 'color', 'definecolor', 'fontsize', 'hspace', 'vspace', 'rule'}
    ignored_envs = {'equation', 'equation*', 'align', 'align*', 'aligned', 'gather', 'gather*', 'multline', 'multline*', 'verbatim', 'Verbatim', 'lstlisting', 'minted', 'tikzpicture', 'pgfpicture', 'thebibliography'}
    for filename, text in files.items():
        from pylatexenc.latexwalker import get_default_latex_context_db
        from pylatexenc.macrospec import MacroSpec, MacroStandardArgsParser, EnvironmentSpec, ParsedMacroArgs
        class RuleArgsParser(MacroStandardArgsParser):
            def __init__(self):
                super().__init__('')

            def parse_args(self, w, pos, parsing_state=None):
                match = re.match(r'\s*(?:\[[^\]]*\])?\s*(?:\([^)]*\))?\s*\{[^}]*\}', w.s[pos:])
                return ParsedMacroArgs(argspec='', argnlist=[]), pos, len(match.group()) if match else 0

        context = get_default_latex_context_db()
        context.add_context_category('zstranslate-references', macros=[MacroSpec(name, MacroStandardArgsParser('*[[{')) for name in ignored_macros if re.match(r'(?:[Aa]uto|[CcVv]?|name|page|eq)ref$|(?:[Cc]ite|cite)\w*$', name)], prepend=True)
        text_last = {'textcolor': '[{{', 'colorbox': '[{{', 'fcolorbox': '[{{{', 'href': '[{{', 'hyperlink': '{{', 'hypertarget': '{{', 'hyperref': '[{', 'parbox': '[[[{{', 'makebox': '[[{', 'framebox': '[[{', 'raisebox': '{[[{', 'rotatebox': '[{{', 'scalebox': '{[{', 'resizebox': '{{{', 'multicolumn': '{{{', 'multirow': '[{[{[{', 'addcontentsline': '{{{', 'addtocontents': '{{'}
        context.add_context_category('zstranslate-table-controls', macros=[MacroSpec('cmidrule', RuleArgsParser())]+[MacroSpec(name, MacroStandardArgsParser(spec)) for name,spec in {'cline':'{','hhline':'{','specialrule':'{{{','addlinespace':'[','rowcolor':'[{[[','cellcolor':'[{[[','arrayrulecolor':'[{','columncolor':'[{[['}.items()], prepend=True)
        context.add_context_category('zstranslate-text-arguments', macros=[MacroSpec(name, MacroStandardArgsParser(spec)) for name, spec in text_last.items()], environments=[EnvironmentSpec(name, MacroStandardArgsParser(spec)) for name, spec in {'tabularx': '{[{', 'tabulary': '{[{', 'longtable': '[{', 'tabular': '[{', 'tabular*': '{[{', 'array': '[{', 'tblr': '[{', 'tcolorbox': '[', 'adjustbox': '{'}.items()], prepend=True)
        nodes, _, _ = LatexWalker(text, latex_context=context, tolerant_parsing=True).get_latex_nodes()
        body_start = text.find(r'\begin{document}') if filename == main else -1
        candidates = []

        def walk(nodelist, allowed=False):
            for node in nodelist or []:
                if isinstance(node, LatexCharsNode):
                    if not allowed and node.pos < body_start:
                        continue
                    for match in re.finditer(r'[^&]+', node.chars):
                        raw = match.group(); stripped = raw.strip()
                        if not re.search(r'[A-Za-z\u00c0-\uffff]{2}', stripped):
                            continue
                        start = node.pos + match.start() + len(raw) - len(raw.lstrip())
                        end = node.pos + match.end() - (len(raw) - len(raw.rstrip()))
                        candidates.append((start, end, text[start:end]))
                elif isinstance(node, LatexGroupNode):
                    walk(node.nodelist, allowed)
                elif isinstance(node, LatexEnvironmentNode):
                    if node.environmentname not in ignored_envs:
                        walk(node.nodelist, allowed or node.environmentname == 'document')
                elif isinstance(node, LatexMacroNode):
                    if node.macroname in ignored_macros:
                        continue
                    args = getattr(getattr(node, 'nodeargd', None), 'argnlist', []) or []
                    if node.pos < body_start and node.macroname not in {'title', 'subtitle'}:
                        continue
                    if node.macroname in text_last:
                        args = args[-1:]
                    for argument in args:
                        if isinstance(argument, LatexGroupNode):
                            walk(argument.nodelist, True)

        walk(nodes)
        candidates.sort()
        groups = []
        for candidate in candidates:
            if groups:
                gap = text[groups[-1][-1][1]:candidate[0]]
                if len(gap) < 600 and candidate[1] - groups[-1][0][0] < 6500 and not re.search(r'\n\s*\n|\\(?:begin|end|section|subsection|title|caption|item|input|include)\b', gap) and '&' not in gap:
                    groups[-1].append(candidate)
                    continue
            groups.append([candidate])
        for group in groups:
            value = ''; protected = []; previous = group[0][0]
            for start, end, raw in group:
                if start > previous:
                    token = f'⟦ZS{len(protected)}⟧'
                    protected.append({'token': token, 'text': text[previous:start]})
                    value += token
                value += raw
                previous = end
            unit = {'id': f'{filename}:{group[0][0]}', 'file': filename, 'start': group[0][0], 'end': group[-1][1], 'text': value, 'protected': protected, 'preserveOrder': True}
            units.append(unit)
    return {'main': main, 'files': files, 'units': units, 'extractor': 'pylatexenc-source-ranges'}


def restore_tex(unit, translated):
    tokens = {p['token']: p['text'] for p in unit['protected']}
    result = []; previous = 0
    matches = list(re.finditer(r'⟦ZS\d+⟧', translated))
    if [m.group() for m in matches] != re.findall(r'⟦ZS\d+⟧', unit['text']):
        raise ValueError('译文改变了 LaTeX 结构标记的顺序。')
    for match in matches:
        result.append(tex_escape(translated[previous:match.start()]))
        result.append(tokens[match.group()])
        previous = match.end()
    result.append(tex_escape(translated[previous:]))
    return ''.join(result)


def unicode_preamble(language):
    language = language.lower()
    if language.startswith('zh'):
        return r'\let\ZSTOriginalBaseline\baselinestretch\usepackage[UTF8,scheme=plain,fontset=fandol]{ctex}\let\baselinestretch\ZSTOriginalBaseline'
    if language.startswith(('ja', 'ko')):
        font = 'Yu Mincho' if language.startswith('ja') else 'Malgun Gothic'
        return r'\usepackage{xeCJK}' + '\n' + r'\IfFontExistsTF{' + font + r'}{\setCJKmainfont{' + font + r'}}{\setCJKmainfont{FandolSong-Regular}}'
    return ''


def compatible_source(text, language, engine):
    if engine == 'xelatex':
        text = re.sub(r'\\usepackage(?:\[[^\]]*\])?\{(?:inputenc|fontenc|CJKutf8)\}', '', text)
        text = re.sub(r'\\(?:pdfoutput|pdfminorversion|pdfcompresslevel|pdfobjcompresslevel|pdfimageresolution)\s*=?\s*\d+', '', text)
        text = re.sub(r'\\input\{glyphtounicode\}', '', text)
        text = re.sub(r'\\pdfgentounicode\s*=?\s*\d+', '', text)
        if not re.search(r'\\(?:usepackage(?:\[[^\]]*\])?\{[^}]*ctex|documentclass(?:\[[^\]]*\])?\{ctex)', text):
            text = text.replace(r'\begin{document}', unicode_preamble(language) + '\n' + r'\begin{document}', 1)
    return text


def compile_project(directory, main, language, settings, emit):
    root = Path(directory).resolve()
    source = (root / main).resolve()
    if not source.is_relative_to(root):
        raise ValueError('编译入口超出项目目录。')
    text = read_tex(source)
    needs_unicode = language.lower().startswith(('zh', 'ja', 'ko')) or re.search(r'[\u3400-\u9fff]', text) or 'fontspec' in text or 'xeCJK' in text
    engines = ['xelatex'] if needs_unicode else ['pdflatex', 'xelatex']
    build = root / '.zst-build'; build.mkdir(exist_ok=True)
    for item in list(root.rglob('*.tex')):
        if '.zst-build' not in item.parts:
            (build / item.parent.relative_to(root)).mkdir(parents=True, exist_ok=True)
    logs = []
    for engine in engines:
        executable = settings.get(engine) or engine
        if not shutil.which(executable) and not Path(executable).is_file():
            logs.append(f'找不到 {engine}：{executable}')
            continue
        patched = compatible_source(text, language, engine)
        source.write_text(patched, encoding='utf-8', newline='\n')
        env = dict(os.environ, openin_any='p', openout_any='p', shell_escape='f', max_print_line='1000')
        env['TEXINPUTS'] = str(root) + os.pathsep + str(source.parent) + os.pathsep + env.get('TEXINPUTS', '')
        flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
        success = True
        for pass_number in range(3):
            emit('progress', {'message': f'{engine} 编译（第 {pass_number + 1} 遍）'})
            command = [executable, '-no-shell-escape', '-interaction=nonstopmode', '-halt-on-error', '-file-line-error', '-output-directory=' + str(build), source.relative_to(root).as_posix()]
            process = subprocess.run(command, cwd=root, env=env, capture_output=True, timeout=180, creationflags=flags)
            log = (process.stdout + process.stderr).decode('utf-8', errors='replace')
            logs.append(log)
            if process.returncode:
                success = False
                break
            if pass_number == 0:
                aux = build / (source.stem + '.aux')
                bibliography = 'biber' if (build / (source.stem + '.bcf')).exists() else 'bibtex' if aux.exists() and r'\bibdata' in read_tex(aux) and not (root / (source.stem + '.bbl')).exists() else ''
                if bibliography:
                    tool = shutil.which(bibliography) or str(Path(executable).parent / (bibliography + ('.exe' if os.name == 'nt' else '')))
                    env['BIBINPUTS'] = env['BSTINPUTS'] = str(root) + os.pathsep + str(source.parent) + os.pathsep
                    bib = subprocess.run([tool, source.stem], cwd=build, env=env, capture_output=True, timeout=180, creationflags=flags)
                    logs.append((bib.stdout + bib.stderr).decode('utf-8', errors='replace'))
                    if bib.returncode:
                        success = False
                        break
        (build / 'zstranslate.log').write_text('\n'.join(logs), encoding='utf-8')
        pdf = build / (source.stem + '.pdf')
        if success and pdf.exists():
            return {'pdf': str(pdf), 'tex': str(source), 'engine': engine, 'log': str(build / 'zstranslate.log')}
    raise RuntimeError('LaTeX 编译失败。请检查所需宏包与编译日志。\n' + '\n'.join(logs)[-5000:])


def fill_source(data, emit):
    project = json.loads(Path(data['project']).read_text(encoding='utf-8'))
    values = json.loads(Path(data['translations']).read_text(encoding='utf-8'))
    by_id = {item['id']: item['text'] for item in values}
    root = Path(data['directory']).resolve()
    for name, original in project['files'].items():
        text = original
        for unit in sorted((u for u in project['units'] if u['file'] == name), key=lambda u: -u['start']):
            if unit['id'] not in by_id:
                raise ValueError('部分 TeX 段落尚未翻译。')
            text = text[:unit['start']] + restore_tex(unit, by_id[unit['id']]) + text[unit['end']:]
        path = (root / name).resolve()
        if not path.is_relative_to(root):
            raise ValueError('源文件路径无效。')
        path.write_text(text, encoding='utf-8', newline='\n')
    return compile_project(root, project['main'], data['target'], data['runtime'], emit)
