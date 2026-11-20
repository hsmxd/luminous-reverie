# Luminous Reverie · 浮光梦境

在 Windows 桌面浏览器中，用手掌或鼠标操控一朵由光点和细丝构成的蒲公英。四个形态共用同一组粒子，可依次变为蝴蝶、光之花与月之星环。摄像头由页面按钮启动，模型、WASM、字体和渲染资源全部随本地项目提供。

## 在线体验

[打开浮光梦境](https://hsmxd.github.io/luminous-reverie/)。可以直接使用鼠标，也可以点击「开启摄像头」使用手势。摄像头画面和工坊素材仅在浏览器内处理。

## 本地运行

安装 Node.js 22.13+ 或 24 LTS，然后在项目目录运行以下命令。Windows 上也可以双击项目根目录的 **start.cmd**。

```powershell
npm ci
npm run dev
```

打开终端显示的 localhost 地址。开发服务器默认使用 5173。生产构建与预览命令如下。

```powershell
npm run typecheck
npm test
npm run build
npm run preview
```

首次安装依赖需要网络。依赖和模型就绪后，可以在本机离线运行。GitHub Actions 会在 `main` 分支更新后构建并部署 GitHub Pages。

## 创意工坊

点击首页「创作粒子」，或使用形态图鉴右侧的「创意工坊」。也可在当前本机地址后加 `?studio=1` 直接进入编辑。

- **文字**支持中文、英文、显式换行和长行自动折行。选定渐变配色后，采样预览会显示实际字形。
- **图片**可选择本地文件、拖入页面或用 Ctrl+V 粘贴。画布保留原色与透明度，用亮度生成可调深度的浮雕。对于白底或其他纯色底图，可勾选「去除边缘相连的纯色背景」。
- 点击「生成粒子作品」后，**单手张掌保持约半秒打散，握拳保持约半秒重组**。单独伸出食指可以拨动局部粒子，双手可移动、缩放和倾转。页面按钮、D / R 键或画布双击可执行相同的聚散操作。
- 四种内置形态和「My Studio」可以来回切换。当前页面保留最近一次生成的自定义作品，新稿生成时替换旧稿，刷新页面会清空。素材仅在浏览器内解码和采样。

`src/studio` 负责素材解析、可复现的空间采样及持续手势确认，`src/particles/artwork-layer.ts` 维护显存中的来源和目标缓冲，原有 GLSL 着色器完成渐变、涡旋散开和归位。

## 交互

点击「开始体验」进入鼠标模式。点击「开启摄像头」并授予当前 localhost 站点访问权限即可使用手势。右下角显示输入方式或识别状态。右上角会自动显示镜像取景小窗。识别到手时，四角标记会框住每只手，并显示手数。手移出画面后会显示「未检测到手」。在「体验设置」里关闭「摄像头预览」可隐藏小窗，手势控制仍可使用。

| 动作 | 画面反馈 |
| --- | --- |
| 一只手张掌并移动 | 掌心建立局部力场，粒子偏转并留下光轨 |
| 拇指与食指捏合并拖动 | 粒子凝成光球并跟随两指之间的位置，松开后散回形态 |
| 握拳后张开 | 先压缩，再从掌心向外爆发 |
| 单手短促向左／右挥动 | 切到上一／下一形态。方向以镜像预览为准，重复挥动之间短暂停稳 |
| 张掌静止约 0.75 秒 | 从掌心发出扩散光波，移开后可再次触发 |
| 双手同时出现 | 切换为双手塑形，两掌距离控制缩放，中点控制平移，高低差和连线方向控制倾斜与旋转 |
| 移动鼠标／按住左键／双击 | 分别引导粒子、聚集、爆发 |
| 点击形态图鉴／方向键 | 平滑切换四种形态，过渡中可以继续选择 |
| 空格／「暂停」 | 暂停或恢复体验。键盘焦点在按钮或滑块上时优先操作当前控件 |

「体验设置」可以调整粒子数量上限、效果强度、手势灵敏度和预览。实际粒子数量与最近一次帧率采样见左下角。暂停会停下渲染和推理，摄像头保持已连接；「关闭摄像头」和「返回欢迎页」会释放视频轨道。

## 工程结构

| 路径 | 职责 |
| --- | --- |
| src/app、src/components、src/styles | React 页面、四张几何缩略图、设置和手势说明 |
| src/particles/shapes.ts | 确定性几何采样。生成四组目标坐标、色彩及蒲公英细丝 |
| src/particles/morph.ts | 保存四个形态的权重。再次切换时从当时的权重开始过渡 |
| src/shaders/art.ts | GLSL 顶点变形、局部力场、捏合、爆发、光波、星尘、拖尾和柔光合成 |
| src/scene | Three.js 生命周期、一次生成的星云纹理、动态绘制数量及后处理 |
| src/camera/tracker.ts、public/hand-worker.js | 视频轨道、帧调度、Worker、本地推理和故障清理 |
| src/gestures/recognizer.ts | 关键点平滑、双手匹配、单手姿态状态机与运动事件识别 |
| src/interaction/manager.ts | 协调摄像头与鼠标输入，将原始控制量平滑送入着色器 |
| src/config.ts | 形态名称、粒子范围、过渡时长及初始推理频率 |
| public/models、scripts/prepare-vision.mjs | 官方本地模型，以及与锁定版本匹配的 WASM 和 Worker 运行时准备 |
| tests/core.test.ts | 无需摄像头的几何、形态切换与手势回归 |
| .github/workflows/pages.yml | 自动运行测试、构建站点并部署 GitHub Pages |

### 渲染与推理

主粒子池一次分配 40,000 个索引。GPU 根据时间、形态权重和交互量计算顶点，背景星尘独立漂移，交互拖尾复用定长缓冲区。初始绘制 18,000 个主粒子，完整形态过渡约 1.55 秒。持续低帧率会降低绘制数、像素比并关闭屏幕空间柔光，恢复足够长时间后逐步升回设置值。页签隐藏时停止绘制和推理调度。

Hand Landmarker 使用 VIDEO 模式，最多两手。优先在 classic Worker 使用 CPU/WASM 推理，每次只发送一张可转移的视频帧，随新视频帧运行，摄像头目标为 30 FPS。推理繁忙时跳过旧帧。Worker 无法初始化时改用主线程限频推理，目标至多 15 Hz，并按实测推理耗时继续降频。单手控制点在慢移时平滑抖动，快移时加快跟随，并依据连续帧的位移进行短时位置补偿。识别坐标仅镜像一次，双手按与上一帧掌心的距离匹配。双手模式优先，短暂丢失后力场平滑衰减。

### 本地模型与依赖来源

模型为 Google 发布的 Hand Landmarker float16 v1。项目中的模型 SHA-256 为 `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`。运行时使用锁文件固定的 `@mediapipe/tasks-vision`，字体使用本地 Cormorant Garamond。网站不录制或上传视频。

- [Google Hand Landmarker 网页端文档](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
- [Google 官方手部模型文件](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task)
- [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html)
- [Vite 开发与构建](https://vite.dev/guide/)

## 运行问题

摄像头被拒绝时，可从浏览器地址栏为当前站点授权。设备被占用时，关闭其他占用摄像头的程序再重试。模型加载失败时，检查 `public/models/hand_landmarker.task` 并重新运行开发或构建命令，以重建本地 WASM 资源。WebGL 2 启动失败时，页面提供重新初始化按钮。全屏依赖浏览器和宿主窗口允许 Fullscreen API。

