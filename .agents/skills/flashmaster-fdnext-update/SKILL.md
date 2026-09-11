---
name: flashmaster-fdnext-update
description: 更新 FlashMaster 的 vendor/fdnext 子模块并同步双语更新日志。仅用于上游版本更新，不用于普通 UI 或适配器修改。
---

# 更新内嵌 fdnext

完成结果：更新到用户要求的上游版本，说明旧/新提交之间的用户可见变化，
同步中英文更新日志，并报告实际验证结果。仓库根目录是下列命令的工作目录。

## 子模块边界

先检查主仓库和已初始化子模块的工作区，记录子模块当前 HEAD；保留已有改动。
若子模块尚未初始化，使用 `git submodule update --init --recursive`。
子模块有未提交修改时先检查，不通过 reset、clean 或强制 checkout 覆盖它们；
如其阻止更新，继续整理可完成的差异分析，说明需要保留或处理的具体修改。

通常的上游刷新命令是：

```bash
git submodule update --remote vendor/fdnext
git diff --submodule=log HEAD -- vendor/fdnext
```

用户指定提交或标签时使用指定目标。审阅本次开始与结束提交之间的上游日志和相关差异；
不能只看最近几条提交或以拉取成功代替兼容性判断。
保持子模块形式和现有 Vite 别名，不在本流程中修改上游源码或把资源复制到应用。

## 应用与更新日志

- 只调整上游变化实际影响的 FlashMaster 适配代码。
- 将解析、规则、数据库或资源变化对用户的影响写到 `CHANGELOG.txt` 与
  `CHANGELOG-zh.txt` 顶部，沿用现有版本/快照格式，保留历史条目。
  没有新提交或用户可见变化时，不编造更新项。
- 仅在任务需要时更新 `package.json` 中的应用基础版本。
  `vite.config.js` 会派生 fdnext 版本和提交哈希，不手改注入常量。

## 验证与交付

按 [开发文档的验证选择](../../../docs/DEVELOPMENT.md#验证选择) 中的
“fdnext 子模块更新”行完成检查；若适配器、Worker 或构建布局也受影响，再选对应行。
默认执行 `pnpm lint`、`pnpm build`，并检查四种内嵌查询、设置页版本及可用 HTTP 服务。
用户明确要求“不测试”时遵从，不以 skill 要求重新询问；报告未执行的验证。
没有可用 HTTP 服务时标明实时兼容性尚未验证，继续完成其他已授权工作。

交付说明旧/新提交、用户可见变化和验证缺口。需要提交时包含子模块指针和本次有意修改的文件；
按用户要求区分 `commit` 与 `commit all`，更新本身不代表提交或推送授权。
