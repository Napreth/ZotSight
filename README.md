# ZotSight

ZotSight 是 Obsidian 的桌面文献阅读插件。它从本机 Zotero 导入文献，在同一页中提供 PDF 阅读、批注和 Obsidian 原生 Markdown 编辑器。每篇文献保存为一个 `.zslp`（ZotSight Literature Package）ZIP 包，书目信息、Markdown 笔记、批注和提取正文各自保存在包内的独立文件中。

支持个人文库、群组文库及嵌套分类，也可以直接关联库内或本机 PDF。

## 安装

需要桌面版 Obsidian 1.11.4 或更新版本。

1. 解压 `ZotSight-0.1.0.zip`，将整个 `zotsight` 文件夹复制到库的 `.obsidian/plugins/` 目录。
2. 在 Obsidian 的“设置 → 第三方插件”中启用 ZotSight。
3. 使用 Zotero 文库时，在 Zotero 的“设置 → 高级”中开启“允许此计算机上的其他应用程序与 Zotero 通讯”，并保持 Zotero 运行。

安装和升级时都需保留完整的插件文件夹，包括 `vendor/` 中的阅读资源和 `modules/` 中的翻译后端。使用插件不需要安装 Node.js，也不需要云端 API Key 或 Zotero 端插件。

## 使用

点击左侧书本图标，或运行命令“ZotSight：从 Zotero 新建文献”。在左侧文库树中选择文库或分类，搜索条目后双击即可创建文献。文件夹右键菜单也提供“新建文献”。

库内 PDF 的右键菜单提供“作为文献阅读”。通过“新建空白文献”命令创建文献后，也可以关联本机 PDF；这两种方式不需要运行 Zotero。已有文献可通过“文献操作 → 绑定文献”关联 Zotero 条目。

PDF 工具栏左侧的菜单用于切换附件或查看文献信息。导航栏默认收起，展开后可查看缩略图、批注和目录。拖动中间的分隔线可调整阅读区与笔记区的宽度。

右侧是 Obsidian 原生 Markdown 编辑器，支持实时预览、双向链接和自动保存。文件名、Markdown 页标题和图谱节点名保持一致；编辑页标题即可重命名 `.zslp` 文件，`F2` 可直接聚焦标题。文献信息中的书目标题独立保存，重命名文件不会修改它，刷新书目信息也不会改文件名。“文献操作”菜单还可将笔记导出为独立 Markdown 文件。

### 批注与阅读模式

工具栏提供高亮、下划线、便笺、文字、区域和手绘工具。开启高亮或下划线后，拖选文字即保存标记；再次点击当前工具恢复普通选择。切换工具只影响下一次选择。普通选区的右键菜单提供高亮、下划线和引用到笔记，评论在左侧批注列表中编辑。

工具栏左侧的书本按钮切换单栏阅读模式，旁边的耳机按钮打开本地朗读。阅读模式使用 Zotero 10 的版面处理器重排正文，图表和公式由原 PDF 裁切显示。`Aa` 菜单可调整字体、字号和行距；两种模式共用阅读位置、高亮、下划线和便笺。文字框、区域框和手绘用于原 PDF 版面。

版面分析在本地进行，模型随插件附带。首次打开阅读模式时会生成缓存，之后按 PDF 内容校验并复用。扫描件需要先做 OCR；复杂版面的重排结果取决于处理器识别情况。

### 快捷键

`Ctrl+F` 跟随焦点：左侧查找 PDF，右侧查找 Markdown 笔记。右侧编辑模式支持 `Ctrl+H` 查找替换，其他编辑快捷键沿用 Obsidian。

| 快捷键 | 阅读区中的作用 |
| --- | --- |
| `Ctrl+Z` | 撤销批注操作 |
| `Ctrl+Y` / `Ctrl+Shift+Z` | 重做批注操作 |
| `PageUp` / `PageDown` | 上一页 / 下一页 |
| `Ctrl+Home` / `Ctrl+End` | 首页 / 末页 |
| `F3` / `Shift+F3`，或 `Ctrl+G` / `Ctrl+Shift+G` | 下一个 / 上一个查找匹配 |
| `Enter` / `Shift+Enter` | 在查找框中切换匹配 |
| `Ctrl++` / `Ctrl+-` / `Ctrl+0` | 调整或重置 PDF 缩放；在单栏阅读模式中调整或重置字号 |
| `Ctrl+鼠标滚轮` | 缩放 PDF；在单栏阅读模式中调整字号 |
| `Esc` | 关闭阅读外观或查找，或退出批注工具 |

笔记编辑与 PDF 批注各自维护撤销记录。macOS 使用 `Command` 替代 `Ctrl`。

## 链接与数据

使用 `[[文献/论文名称]]` 可以从其他笔记链接到文献，生成的链接和图谱标签省略 `.zslp`；同路径下存在同名 Markdown 文件时，链接保留扩展名以避免误链。包内 Markdown 笔记中的链接会加入 Obsidian 的关系索引，文献可显示在原生关系图谱和局部关系图谱中。通过 Obsidian 重命名文件时，链接按 Obsidian 的设置更新。图谱适配使用内部接口，Obsidian 升级后可能需要相应调整。

`.zslp` 可以使用普通 ZIP 工具查看，其基本目录为：

```text
manifest.json                  文献标识、书目信息、附件和阅读状态
notes/main.md                  Markdown 笔记
annotations.json               批注
attachments/<附件 ID>/         已读 PDF 的副本和来源标识
text/<附件 ID>/structure.json   原生阅读模式的结构化正文
text/<附件 ID>/source.txt       提取的纯文本
translate/<任务 ID>/           文档翻译的源码、译文、PDF 和任务缓存
```

目录按实际使用情况生成。保存时保留未知成员，未修改的文件复用原有压缩数据。当前支持 ZIP32 的存储和 Deflate 成员，包内单文件上限为 512 MB，整个文献包上限为 1 GB。

Zotero 附件通过文库和条目标识解析本机路径，库内 PDF 使用相对路径，本机 PDF 使用完整路径。读取成功后会在包内保留 PDF 副本；来源暂时不可用时使用该副本，来源可读时以来源文件为准。

启动后会将旧版 `.zsseed` 转换为 `.zslp`，也可运行“将旧版文献转换为文献包”命令。转换前的 JSON 和原路径保存在 `.obsidian/plugins/zotsight/migration-backups/`；目标文件已存在或旧文件损坏时跳过转换。旧链接中的 `.zsseed` 仍可解析到转换后的文献。

Zotero 连接只读取信息和附件。刷新书目信息会保留笔记与批注；批注不会写入原 PDF，也不会同步到 Zotero。阅读模式缓存保存在插件的 `cache/` 目录，删除后可重新生成。

## 文档翻译

文档翻译是 ZotSight 的内置模块，入口在文献右侧的翻译图标中。面板跟随当前阅读区，文档选择只显示当前 PDF 或阅读模式下的语言版本。打开文献信息或不支持的内容时，面板停用。

翻译方式平铺为四张卡片：翻译阅读模式、使用 LaTeX 源文件翻译、使用 BabelDOC 翻译、使用 PDFMathTranslate 翻译。阅读模式使用原生正文抽取结果生成译文，可保留公式、图表和引用；后三种方式生成 PDF。面板根据 LaTeX 源文件和扫描页的检测结果标注推荐，阅读模式始终标注推荐。任务按所选方式执行。

“有译文时，将阅读模式按钮改为文档切换菜单”可以在面板中开关。开启后，左侧按钮的菜单按 PDF、阅读模式分成两组，列出原文和译文。关闭时保留普通阅读模式按钮。版本选择集中在翻译面板和可选的文档切换菜单中。

Google、Edge/Bing 和腾讯网页翻译固定内置，无需密钥，不能删除。其他服务通过服务菜单底部的“添加翻译服务”打开弹窗配置。服务菜单按翻译 API、AI 厂商与平台、自定义分组，支持 DeepL、Google Cloud、Azure、百度、腾讯云、有道，以及 OpenAI、Anthropic、Google AI Studio、DeepSeek、阿里云百炼、硅基流动和 OpenRouter。OpenAI-compatible API、Ollama 和 LibreTranslate 位于自定义组。模型 ID 和服务地址按服务商实际配置填写。

“自动尝试从 arXiv 下载 LaTeX 源文件”控制后台获取源码；下载内容保存在文献包的 `translate/source/` 中。

源语言和目标语言并排选择，点击“开始翻译”提交任务。在“任务”中可打开译文、跳转文献、继续未完成的翻译或移除记录。移除记录会保留文献包中的译文。设置中可调整并发、间隔、重试、术语表和 AI 翻译偏好。密钥由 Obsidian SecretStorage 保存；使用在线服务时，文档正文会发送到所选服务。网页接口的可用性和限流可能变化。

阅读模式翻译无需 Python。PDF 排版需要在设置中安装本地依赖；arXiv 编译另外需要 TeX Live 或 MiKTeX。先安装 [uv](https://docs.astral.sh/uv/getting-started/installation/) 和 Git，再在设置中安装依赖。安装程序在插件 `modules/document-translation/runtime/` 下建立独立环境。译文、TeX 源码、编译结果和段落缓存保存于文献包的 `translate/<任务 ID>/`，任务可以取消和继续。

升级自独立的 ZSTranslate 时，会导入已有配置、缓存和任务，并停用旧插件；旧插件目录保留。

## 本地朗读

朗读使用 Zotero 的原生正文分句和本地语音控制代码，通过系统本地声音播放，不需要 Zotero 账号或在线语音服务。支持声音、语速、暂停和逐句前后跳转，并跟随当前原文或阅读译文。切换文档、模式或关闭阅读器时停止朗读。可用声音取决于系统安装的语音包。

## 开发

```sh
npm ci
npm test
npm run package
```

安装包和对应源码包输出到 `dist/`。`npm run dev` 监听源码并重新构建。原生处理器的来源和构建方法见 [BUILDING.md](BUILDING.md)。

扩展插件可通过 ZotSight 实例的 `api` 读取文献、更新笔记、注册面板和操作，并订阅文献变化。调用前应检查插件已启用且 `apiVersion` 为 `1.0.0`；接口定义见 [src/api.ts](src/api.ts)。

## 许可

Copyright (C) 2026 Napreth。

ZotSight 采用 [GNU AGPL v3 或更新版本](LICENSE)（`AGPL-3.0-or-later`）。第三方组件保留各自的许可和署名，详见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。
