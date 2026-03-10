# MapLog - 地图与九宫格编辑器

这是一个基于React和Vite的前端应用，提供中国地图和九宫格的可视化编辑功能，支持图片上传、编辑和导出。

## 功能特性

- **中国地图编辑**：在地图上添加、编辑和管理图片
- **九宫格编辑**：创建和编辑九宫格布局，添加图片
- **图片图库**：上传、管理和重用图片
- **数据导出**：导出编辑好的地图或九宫格数据
- **数据导入**：导入之前导出的数据
- **响应式设计**：适配不同屏幕尺寸

## 技术栈

- React 19.0.0
- TypeScript
- Vite 6.2.0
- Tailwind CSS 4.1.14
- Konva.js (用于画布操作)
- D3.js (用于地理数据处理)
- IndexedDB (本地存储)

## 快速开始

### 前置条件

- Node.js 18.0.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. 克隆项目到本地

2. 安装依赖
   ```bash
   npm install
   ```

3. 配置环境变量
   - 复制 `.env.example` 文件并重命名为 `.env.local`
   - 在 `.env.local` 文件中设置 `GEMINI_API_KEY` (如果需要使用AI功能)

4. 启动开发服务器
   ```bash
   npm run dev
   ```

5. 打开浏览器访问 `http://localhost:5173`

## 部署指南

1. 构建生产版本
   ```bash
   npm run build
   ```

2. 构建产物会生成在 `dist` 目录中

3. 将 `dist` 目录部署到任何静态网站托管服务，如：
   - Vercel
   - Netlify
   - GitHub Pages
   - 自己的服务器

## 项目结构

```
├── src/
│   ├── components/       # 组件目录
│   │   ├── ImageGallery.tsx    # 图片图库组件
│   │   ├── MapCanvas.tsx       # 地图画布组件
│   │   ├── NineGridCanvas.tsx  # 九宫格画布组件
│   │   ├── Province.tsx        # 省份组件
│   │   └── Toolbar.tsx         # 工具栏组件
│   ├── constants/        # 常量定义
│   │   └── mapData.ts          # 地图数据
│   ├── hooks/            # 自定义钩子
│   │   └── useMapState.ts      # 地图状态管理
│   ├── services/         # 服务
│   │   └── db.ts               # IndexedDB 操作
│   ├── utils/            # 工具函数
│   │   └── provinceMap.ts      # 省份映射
│   ├── App.tsx           # 应用主组件
│   ├── main.tsx          # 应用入口
│   └── types.ts          # 类型定义
├── public/               # 静态资源
├── dist/                 # 构建产物
├── package.json          # 项目配置
└── vite.config.ts        # Vite 配置
```

## 使用说明

### 切换视图
- 点击左侧工具栏的地图图标切换到中国地图视图
- 点击左侧工具栏的九宫格图标切换到九宫格视图

### 图片上传
- 在图库面板中点击"上传图片"按钮
- 或直接拖拽图片到图库区域
- 支持多张图片同时上传

### 编辑地图
- 在地图视图中，点击省份区域
- 从图库中选择图片拖拽到省份上
- 可以调整图片的大小、位置和旋转角度

### 编辑九宫格
- 在九宫格视图中，点击网格单元
- 从图库中选择图片拖拽到网格上
- 可以调整图片的大小、位置和旋转角度
- 可以通过设置调整网格的行数、列数和间距

### 导出数据
- 在地图或九宫格视图中，点击导出按钮
- 选择导出为图片或导出为数据文件
- 导出的数据文件可以在以后导入使用

### 导入数据
- 在图库面板中点击"导入数据"按钮
- 选择之前导出的JSON数据文件
- 数据会被导入并应用到当前视图

## 注意事项

- 图片会被转换为Base64格式存储在本地IndexedDB中
- 导出的数据文件包含所有编辑信息和图片数据
- 建议定期导出数据以备份您的工作

## 浏览器兼容性

- 支持所有现代浏览器（Chrome、Firefox、Safari、Edge）
- 不支持IE浏览器

## 参考来源

- [MapLog GitHub 仓库](https://github.com/chyxin071-sys/maplog)

## 许可证

MIT License