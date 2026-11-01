import unittest
import io
import tarfile
import tempfile
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace
from latex import install_missing_tex, unpack_source

class TexDependencyTests(unittest.TestCase):
    def test_sources_work_without_newer_tarfile_filters(self):
        contents = b'\\documentclass{article}\\begin{document}Example\\end{document}'
        archive = io.BytesIO()
        with tarfile.open(fileobj=archive, mode='w') as bundle:
            member = tarfile.TarInfo('paper/main.tex')
            member.size = len(contents)
            bundle.addfile(member, io.BytesIO(contents))
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source.tar'
            source.write_bytes(archive.getvalue())
            with patch('latex.tarfile.data_filter', None):
                output = unpack_source(source, Path(directory) / 'unpacked')
            self.assertEqual((output / 'paper/main.tex').read_bytes(), contents)

    def test_older_tarfile_extraction_still_rejects_links(self):
        archive = io.BytesIO()
        with tarfile.open(fileobj=archive, mode='w') as bundle:
            member = tarfile.TarInfo('linked.tex')
            member.type = tarfile.SYMTYPE
            member.linkname = '../outside.tex'
            bundle.addfile(member)
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source.tar'
            source.write_bytes(archive.getvalue())
            with patch('latex.tarfile.data_filter', None), self.assertRaises(ValueError):
                unpack_source(source, Path(directory) / 'unpacked')

    def test_basic_installs_a_missing_package_once(self):
        settings={'dependencies':{'tex':{'method':'portable-basic','directory':'C:/LocalAppData/ZotSight/texlive/basic'}}}
        calls=[]
        def execute(args, **kwargs):
            calls.append(args)
            return SimpleNamespace(returncode=0,stdout=b'example-package:\n texmf-dist/tex/latex/example/example.sty\n',stderr=b'')
        attempted=set()
        with patch('latex.subprocess.run',side_effect=execute):
            self.assertTrue(install_missing_tex("! LaTeX Error: File `example.sty' not found.",settings,lambda *args:None,attempted))
            self.assertFalse(install_missing_tex("! LaTeX Error: File `example.sty' not found.",settings,lambda *args:None,attempted))
        self.assertEqual(len(calls),2)
        self.assertEqual(calls[-1][-2:],['install','example-package'])
    def test_existing_tex_and_missing_paper_sources_never_trigger_downloads(self):
        for settings,log in [({},"! LaTeX Error: File `example.sty' not found."),({'dependencies':{'tex':{'method':'portable-basic','directory':'test'}}},"! LaTeX Error: File `paper.tex' not found.")]:
            with patch('latex.subprocess.run') as command:
                self.assertFalse(install_missing_tex(log,settings,lambda *args:None,set()))
                command.assert_not_called()

if __name__=='__main__': unittest.main()
