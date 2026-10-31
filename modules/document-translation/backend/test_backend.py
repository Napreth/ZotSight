"""Tests use synthetic source documents; no translation provider is contacted."""
import io
import json
from pathlib import Path
import shutil
import tarfile
import tempfile
import unittest
from latex import extract_units, restore_tex, unpack_source, fill_source


class SourceTests(unittest.TestCase):
    def test_source_ranges_protect_math_references_comments_and_macro_definitions(self):
        with tempfile.TemporaryDirectory(prefix='zst-latex-') as temporary:
            root = Path(temporary)
            source = r'''\documentclass{article}
\title{A test title}
\newcommand{\myMacro}[1]{Internal command text #1}
\author{Original Author}
\begin{document}
% Never translate this comment.
A scientific \textcolor{myred}{important text} \textbf{result} with $E=mc^2$ and \cref{eq:energy}, \cite[see][p.4]{paper2026}.
\begin{equation} E=mc^2 \label{eq:energy} \end{equation}
\begin{tabularx}{\linewidth}{XX} Name & Value \\ \cmidrule(lr){1-2} Data & Results \\ \end{tabularx}
\end{document}'''
            (root/'main.tex').write_text(source, encoding='utf8')
            project = extract_units(root)
            prose = ''.join(u['text'] for u in project['units'])
            for protected in ['Internal command text', 'Original Author', 'Never translate', 'eq:energy', 'paper2026', 'E=mc^2', 'myred', '(lr)', 'XX']:
                self.assertNotIn(protected, prose)
            for unit in project['units']:
                self.assertEqual(restore_tex(unit, unit['text']), source[unit['start']:unit['end']])
            unit = next(u for u in project['units'] if u['protected'])
            with self.assertRaises(ValueError):
                restore_tex(unit, unit['text'].replace('⟦ZS0⟧',''))
            escaped = restore_tex({'protected': [], 'text': 'test'}, r'\input{private} 50%')
            self.assertIn(r'\textbackslash{}input\{private\}', escaped)

    def test_archive_traversal_and_links_are_rejected(self):
        with tempfile.TemporaryDirectory(prefix='zst-archive-') as temporary:
            root = Path(temporary)
            for name, linked in [('../escape.tex',False),('link.tex',True)]:
                archive=root/'source.tar'
                with tarfile.open(archive,'w') as bundle:
                    member=tarfile.TarInfo(name)
                    if linked: member.type=tarfile.SYMTYPE;member.linkname='../private'
                    else: member.size=3
                    bundle.addfile(member, None if linked else io.BytesIO(b'tex'))
                with self.assertRaises(ValueError): unpack_source(archive,root/'source')
            self.assertFalse((root/'escape.tex').exists())

    @unittest.skipUnless(shutil.which('xelatex'),'XeLaTeX is not installed')
    def test_refill_compiles_chinese_and_keeps_the_original_math(self):
        import pymupdf as fitz
        with tempfile.TemporaryDirectory(prefix='zst-compile-') as temporary:
            root=Path(temporary)
            source=r'\documentclass{article}\title{Title}\begin{document}\maketitle A result with $E=mc^2$.\end{document}'
            (root/'main.tex').write_text(source,encoding='utf8');project=extract_units(root)
            (root/'project.json').write_text(json.dumps(project),encoding='utf8')
            (root/'translations.json').write_text(json.dumps([{'id':u['id'],'text':'中文译文 '+u['text']} for u in project['units']]),encoding='utf8')
            output=fill_source({'project':str(root/'project.json'),'translations':str(root/'translations.json'),'directory':str(root),'target':'zh-CN','runtime':{}},lambda *args:None)
            self.assertIn('$E=mc^2$',(root/'main.tex').read_text(encoding='utf8'))
            with fitz.open(output['pdf']) as pdf:self.assertIn('中文译文',''.join(page.get_text() for page in pdf))




if __name__=='__main__':unittest.main()
