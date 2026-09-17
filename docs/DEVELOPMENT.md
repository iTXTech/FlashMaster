# 开发契约与验证

本文供修改相关功能时按需查阅，不要求每次编辑都通读。通用协作约定见
[AGENTS.md](../AGENTS.md)，构建、PWA 与发布细节见 [部署指南](DEPLOYMENT.md)。

## 路由与查询

路由定义在 `src/router/index.js`，路径生成在 `src/router/locations.js`。
hash 与 history 模式保持相同的公开入口，并支持可选的 `/en` 或 `/zh` 前缀：

| 功能 | 路径 |
| --- | --- |
| PN 解码 | `/parts`、`/parts/:pn` |
| PN 搜索 | `/parts/search`、`/parts/search/:query` |
| Flash ID 解码 | `/ids`、`/ids/:id` |
| Flash ID 搜索 | `/ids/search`、`/ids/search/:query` |
| 设置、关于 | `/settings`、`/about` |

`VITE_FLASHMASTER_ROUTER_MODE` 默认是 `hash`；history 托管需要 SPA 回落规则。
修改查询与导航时，关注 `src/composables/useRouteLookup.js`：浏览器前进/后退、
尚未提交的输入、相同查询重试和语言刷新需要保持一致，避免重复请求或重复累计使用次数。

## 解析后端与构建差异

`src/services/flashApi.js` 统一选择后端。当前 HTTP 后端使用 fdnext 的结构化接口；
旧文档中的 `info`、`decode`、`decodeId`、`searchPn`、`searchId`、`summary`、
`summaryId` 是逻辑能力名称，不是当前请求路径。

| 逻辑能力 | 服务导出 | 当前 HTTP 实现 |
| --- | --- | --- |
| info | `getServerInfo` | `capabilities` |
| decode | `decodePartNumber` | `parts/decode` |
| decodeId | `decodeFlashId` | `identifiers/decode`，`idScheme=nand.flash_id` |
| searchPn | `searchPartNumber` | `parts/search` |
| searchId | `searchFlashId` | `identifiers/search`，`idScheme=nand.flash_id` |
| summary / summaryId | `summarizePartNumber` / `summarizeFlashId` | 解码后由 `summaryText` 生成摘要 |

保留语言、控制器分组、结果 schema、取消与超时行为；字段映射见
`src/services/fdnextResultView.js`。嵌入式适配入口是 `src/services/fdnextApi.js`。

当前结果协议为 `fdnext.result.v2`，能力协议为 `fdnext.capabilities.v2`；不接受旧版本。
成功解码必须提供 `summary.brief`（精简字段）与 `summary.full`（完整分组字段）。
页面以 key-value 展示 `summary.full` 的全部标量字段；控制器列表可展开查看全部条目，
完整摘要和分组复制始终包含全部控制器。简略摘要仅用于复制。
两种摘要均保留身份、警告与关联信息，并排除外部链接。摘要主按钮默认复制完整摘要，
下拉菜单提供精简摘要；技术资料复制入口暂不显示，外部链接仍完整展示。
容量字段使用正数 `value` 与 `unit: "Mbit"`，容量候选使用数值数组；页面和复制优先使用
上游 `display`，保留 GB/Gb 单位与全部候选，不从显示文本反推容量或替用户选择候选值。

| 构建 | 解析行为 |
| --- | --- |
| Web | 内嵌 Worker，失败时按需加载主线程降级引擎；也支持 HTTP 模式 |
| full / nano 单文件 | classic/IIFE 内联 Worker，支持 `file://`；不打包主线程降级引擎 |
| pico 单文件 | `fdnextApiHttpOnly.js` 替代内嵌适配器，强制 HTTP 模式；可用 `VITE_FLASHMASTER_LOCKED_SERVER` 锁定服务地址 |

单文件 full/nano 的 Worker 失败应保留首次诊断，不能尝试加载未打包的降级引擎。
修改构建时保留各模式的差异；普通源码修改不意味着需要构建所有模式。
更新上游版本时使用 [fdnext 更新 skill](../.agents/skills/flashmaster-fdnext-update/SKILL.md)。

## UI、持久化与统计

- 界面使用 `--app-font-family` 系统字体栈，PN、Flash ID、丝印和控制器标识值使用
  `--app-font-mono` 等宽字体栈；不打包或远程加载字体。只对标识值应用等宽字体，
  标签、厂商名、参数说明与展开操作保留界面字体；新增规格字段按字段语义明确分类。
- 结果优先展示有意义的字段，避免重复回显 PN/Flash ID。链接行使用 `img: "logo"`
  时，经 `src/services/vendorLogos.js` 显示厂商标识。
- PN/FID 共用 `DecodeResultPanel.vue` 与分组规格表。结果区约 800px 居中，宽屏每行最多
  四组短参数；宽屏按实际字体和可用列宽为长信息分配跨列，尽量保持单行，整行仍放不下时自然换行。
  初始页使用紧凑输入说明与示例，示例只填入并聚焦，不自动解析。查询中仅沿用输入框进度条，
  结果区不展示查询状态。未匹配、输入无效和请求失败分别显示说明与恢复操作；失败原因保留在页面中。
  恢复操作的搜索/重试使用对应结果或失败请求的查询值，不使用尚未提交的草稿。
  PN/FID 标签由页面查询类型决定；仅有输入回显或外部链接时隐藏厂商栏和摘要操作，
  已有身份、规格、候选与关联继续展示并可复制，警告与所有返回的外部链接继续保留。
  手机保留两组短参数及原有长值换行规则。标量字段完整展示；控制器沿用可展开、
  按列对齐的列表，只有分组名和唯一列表标签相同时省略重复标签，不缩小字号提高密度。
  DRAM 组内可省略标签的重复 DRAM 前缀，复制仍使用完整标签；整机与组件容量、电压不可混用。
  英文标签在上、数值在下，共用每行最多四组/手机两组的网格，优先按空格换行，
  仅对放不下的连续型号等长文本断词；中文保持横向 key-value。
  芯片类型与丝印属于型号下方的身份信息，省略 Type/类型前缀并使用次要文字色；正文参数仍保留标签。
  Micron 5 位 FBGA 码和 10 位完整丝印共用真实 PN、器件规格及关联数据；头部“丝印”展示本次查询的
  5 位或 10 位规范化丝印，页面及完整/精简摘要不另列“输入”，完整码只出现一次。
  10 位输入只追加“丝印信息”：年码、周次、Die版本、晶圆产地、封装地，不输出独立日期码。
  年码通过悬浮、聚焦或点击显示“年份末位”说明；丝印 Die版本不覆盖 PN 解出的版本。
  页面与复制直接使用上游的新字段和分组，不恢复旧 `micron_part_number` / `prod_date` 字段。
  中文标签使用统一列宽对齐数值；头部自然换行，空间足够时类型、丝印和摘要操作保持同一行。
  摘要按钮可见文字为“摘要”/“Summary”，可访问名称说明默认复制完整摘要；下拉提供精简摘要。
  分组复制按钮使用明确的 28px 尺寸与 18px 图标，避免全局 compact 密度导致裁剪。
  复制只提供整个分组和整个结果的精简/完整摘要，不提供单字段或输入摘要按钮，暂不显示技术资料复制入口。
  关联链接按响应式等宽列对齐；PN/ID 解析动作只显示型号或 ID，包括 PN → PN 的特殊关联，
  动作说明保留在可访问名称和复制内容中。搜索动作与不可跳转关系保留可见说明，关联附加字段不省略。
- ExternalLink 使用 `vnd`、`ds`、`mkt`、`ref`、`tl`、`com`、`ads` 分类。
  所有返回的链接持续展示，广告有独立标签，不提供关闭或默认折叠入口。
- 查询建议共用 `QuerySuggestionInput.vue`；涉及共享组件时检查 PN 与 Flash ID 两处。
  厂商、丝印与 PN/ID 分开渲染，以淡色竖线和两侧 6px 间距分隔，不用空格拼接布局。
  标识内部空格和斜杠原样显示；长值可换行，菜单按换行前的固有宽度测量并受视口限制。
  查询和服务器地址建议共用 `suggestion-menu` 零字距样式，地址值及其输入使用等宽字体。
  四种解析/搜索页共用 `lookup-query-*` 输入区样式；窄面板的两个操作按钮等宽等高并撑满一行。
  移动端导航展开时显示背景遮罩，点击遮罩或点选页面后收起；桌面导航保持原有常驻/收起行为。
  列表分页和展开状态保持各自语义，避免为外观统一合并不同的数据逻辑。
- 设置由 `src/store/index.js` 持久化，包括解析模式、HTTP 地址、语言、主题、软键盘、
  控制器分组、本地使用次数、更新日志已读版本和 Market Pulse。修改键名或默认值时兼容已有值。
- 解析器能力弹窗使用概览、控制器、解码器三个页签。概览保留各项能力的独立支持范围，
  构建时间与 FDB 生成时间统一按用户本地时区格式化并标注时区，只显示一次；
  底层元数据与 `<time datetime>` 保留 UTC ISO 8601 值。
  FDB 元数据不含 website。“引擎默认分组”与当前查询分组语义不同。
  清单搜索、分组选择与分页只存在于弹窗内，不写入查询设置；保留上游分组顺序、说明、
  报告数量与完整解码器 ID、优先级和 ID 类型。筛选变化回到第一页，清单滚动时筛选与分页保持可见。
- `src/services/analytics.js` 在构建启用统计且存在 `window.gtag` 时发送事件；现有事件包括
  查询、覆盖缺口、服务入口、交互及 Market Pulse。当前查询事件含规范化后的查询内容，
  本地使用次数与外部事件应分别理解；不要将其描述为仅有本地统计或完全匿名。
- 更新日志由 `ChangelogDialog.vue` 显示。版本展示来自 `vite.config.js` 注入的
  `VERSION`、`__FDNEXT_VERSION__` 和 `__FDNEXT_COMMIT_HASH__`；已读状态不包含构建元数据。

## Market Pulse

入口为 `src/components/MarketPulse.vue`、`MarketPulseChart.vue` 和
`src/services/marketApi.js`。服务支持 Lighter 与 Hyperliquid，当前默认 provider 为 Lighter；
Hyperliquid 使用 `xyz` 数据。WebSocket 更新与 HTTP 快照回退的配置以服务源码为准，
包括 `VITE_FLASHMASTER_MARKET_ENDPOINT`、`VITE_FLASHMASTER_MARKET_WS_ENDPOINT`
及 Lighter、K 线各自的覆盖项。

报价、K 线和缓存必须保留同一市场身份（provider、market id/key），不能只凭显示代码匹配。
保持固定槽位，仅渲染可见项和少量缓冲；滚动由 CSS 驱动，避免频繁 UI 更新或 localStorage
写入。页面隐藏时暂停服务，恢复显示后再连接；关闭开关后应停止相关订阅。

## 验证选择

按改动选择下表的相关行；涉及多项时合并检查，不为每一行重复跑 lint/build。
应用代码、依赖、构建配置和子模块更新的基线为 `pnpm lint` 与 `pnpm build`。

| 改动 | 有针对性的补充验证 |
| --- | --- |
| 文档、AGENTS、skill | 检查 diff、相对链接、命令与源码是否一致；skill 校验 frontmatter 和触发范围 |
| 查询建议布局 | `tests/querySuggestionLayout.test.js`；宽/窄视口、键盘选择、菜单溢出 |
| 路由与分页 | `tests/useRouteLookup.test.js`、`tests/usePagedItems.test.js` 中受影响的测试；前进/后退、重试、翻页 |
| 请求调度、后端适配 | 按涉及模块选择 `tests/automaticRequests.test.js`、`tests/flashApi.test.js`、`tests/fdnextApi.test.js`；相关查询和异常路径 |
| fdnext 子模块更新 | PN 解码、Flash ID 解码、PN 搜索、Flash ID 搜索；设置页版本；可用 HTTP 服务的兼容性 |
| 构建、Worker、依赖兼容性 | `tests/fdnextBuild.test.js`；构建受影响的 full/nano/pico 模式，Worker 改动需在相应产物中检查运行行为 |
| 设置或共享 UI | 受影响页面及设置刷新后的持久化；按改动检查中英文、深浅色/跟随系统、更新日志、复制按钮 |
| Market Pulse | `tests/marketApi.test.js`；开关、隐藏/恢复、报价与 K 线身份、宽屏槽位稳定性 |
| PWA 或 history 托管规则 | 对构建产物验证离线/更新或深链接刷新；开发服务器无法证明 Service Worker 或托管回落行为 |

定向测试使用 Node 内置测试运行器，例如：

```bash
node --experimental-vm-modules --test tests/flashApi.test.js tests/fdnextApi.test.js
```

`pnpm test` 运行全部 `tests/*.test.js`，适合跨模块改动。现有网络相关单元测试使用模拟请求，
可在本地执行并修复本次改动导致的失败，无需逐次确认；测试通过不能证明真实 HTTP 服务可用。
若用户明确要求“不测试”，遵从该范围并在交付中注明未验证项。

UI 验证使用 `pnpm dev` 或受影响构建的预览，覆盖本次改变的用户流程。
报告实际检查的模式、状态和结果；历史截图、一次构建成功或 mock 测试不能代替当前浏览器证据。

## 维护指令

`AGENTS.md` 只保留经常影响决策的项目约束；专项流程放入触发范围明确的 skill，
功能细节按需链接，避免复制同一套要求。普通修复无需新增 skill，也不为不同模型维护整套重复指令。

本次整理参考《Rethinking skills and prompts for GPT-6 Astra》（用户提供全文）和
[GPT-6 Astra 官方提示指南](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra#prompting-best-practices)：
缩短常驻上下文，明确完成条件与已有授权，按改动校准验证，删除过时或重复的流程约束。
