"""Adapters to separately installed BabelDOC and PDFMathTranslate runtimes.
Copyright (C) 2026 Napreth. SPDX-License-Identifier: AGPL-3.0-or-later
"""
import json
from pathlib import Path
import urllib.request


def remote_translate(data, text):
    request = urllib.request.Request(data['bridge']['url'] + '/translate',
        data=json.dumps({'text': text}).encode('utf-8'),
        headers={'Authorization': 'Bearer ' + data['bridge']['token'], 'Content-Type': 'application/json'})
    errors = data.setdefault('_translation_errors', {})
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            result = json.load(response)
        if result.get('error'):
            raise RuntimeError(result['error'])
        errors.pop(text, None)
        return result['text']
    except urllib.error.HTTPError as error:
        try:
            message = json.loads(error.read(1048576)).get('error', str(error))
        except Exception:
            message = str(error)
        errors[text] = message
        raise RuntimeError(message) from error
    except Exception as error:
        errors[text] = str(error)
        raise


def check_translations(data):
    errors = data.get('_translation_errors', {})
    if errors:
        raise RuntimeError(f'{len(errors)} 个段落翻译失败，尚未导出 PDF。可继续任务以复用已完成译文。' + '\n' + next(iter(errors.values())))



def babeldoc(data, emit):
    from babeldoc.translator.translator import BaseTranslator, set_translate_rate_limiter
    from babeldoc.format.pdf.translation_config import TranslationConfig, WatermarkOutputMode
    from babeldoc.docvision.doclayout import DocLayoutModel
    from babeldoc.format.pdf.high_level import do_translate, get_translation_stage
    from babeldoc.progress_monitor import ProgressMonitor

    class BridgeTranslator(BaseTranslator):
        name = 'zstranslate'

        def do_translate(self, text, rate_limit_params=None):
            return remote_translate(data, text)

        def do_llm_translate(self, text, rate_limit_params=None):
            # ZSTranslate owns the LLM prompt and JSON protocol. BabelDOC must
            # use its paragraph interface rather than send another LLM prompt.
            raise NotImplementedError

    emit('progress', {'message': '准备 BabelDOC 版面模型与字体；首次使用可能需要下载资源…'})
    model = DocLayoutModel.load_available()
    translator = BridgeTranslator(data.get('source', 'en'), data['target'], True)
    set_translate_rate_limiter(max(1, data.get('concurrency', 2)))
    config = TranslationConfig(translator=translator, input_file=data['pdf'], lang_in=data.get('source', 'en'),
        lang_out=data['target'], doc_layout_model=model, output_dir=data['directory'],
        working_dir=str(Path(data['directory']) / 'work'), use_rich_pbar=False, qps=max(1, data.get('concurrency', 2)),
        disable_rich_text_translate=True, auto_extract_glossary=False, no_dual=False,
        use_alternating_pages_dual=True, watermark_output_mode=WatermarkOutputMode.NoWatermark,
        skip_scanned_detection=False)

    def progress(**event):
        emit('progress', {'message': 'BabelDOC：' + str(event.get('stage', event.get('type', '处理文档'))),
            'done': event.get('stage_current', 0), 'total': event.get('stage_total', 0)})

    # Use the synchronous API: cancellation is handled by the owned process tree.
    # This also avoids Windows event-loop / progress callback races in upstream.
    with ProgressMonitor(get_translation_stage(config), progress_change_callback=progress) as monitor:
        result = do_translate(monitor, config)
    check_translations(data)
    paths = []
    for name, title in [('mono_pdf_path', '译文'), ('dual_pdf_path', '双语对照')]:
        path = getattr(result, name, None)
        if path and Path(path).is_file():
            paths.append({'path': str(path), 'title': title})
    if not paths:
        raise RuntimeError('BabelDOC 的译文 PDF 尚未生成。')
    return {'files': paths, 'engine': 'babeldoc'}



def pdfmath(data, emit):
    import pdf2zh.converter as converter
    from pdf2zh.translator import BaseTranslator
    from pdf2zh.high_level import translate
    from pdf2zh.doclayout import DocLayoutModel

    class BridgeTranslator(BaseTranslator):
        name = 'zstranslate'

        def __init__(self, lang_in, lang_out, model=None, envs=None, prompt=None, ignore_cache=True):
            super().__init__(lang_in, lang_out, model, ignore_cache=True)

        def do_translate(self, text):
            return remote_translate(data, text)

    # TranslateConverter discovers translators from its module-level classes.
    converter.GoogleTranslator = BridgeTranslator
    emit('progress', {'message': '准备 PDFMathTranslate 版面模型和 OCR 资源…'})
    model = DocLayoutModel.load_available()

    def progress(bar):
        emit('progress', {'message': 'PDFMathTranslate：解析与排版', 'done': getattr(bar, 'n', 0), 'total': getattr(bar, 'total', 0)})

    result = translate(files=[data['pdf']], output=data['directory'], lang_in=data.get('source', 'en'),
        lang_out=data['target'], service='zstranslate', thread=max(1, data.get('concurrency', 2)),
        callback=progress, model=model, ignore_cache=True, skip_subset_fonts=False)
    check_translations(data)
    files = []
    for item in result:
        for index, path in enumerate(item if isinstance(item, (tuple, list)) else [item]):
            if isinstance(path, (str, Path)) and Path(path).is_file():
                files.append({'path': str(path), 'title': '译文' if index == 0 else '双语对照'})
    if not files:
        raise RuntimeError('PDFMathTranslate 没有生成译文 PDF。')
    return {'files': files, 'engine': 'pdfmath'}
