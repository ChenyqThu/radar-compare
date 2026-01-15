落地页技术分析报告：现代 AI & 创意机构风格
分析对象：Pulseboard Agency (Aura) & Google Design Gemini

一、 整体结构 (Structure)
该类页面的结构通常遵循“沉浸式叙事”逻辑：

Header (吸顶导航)：采用 Glassmorphism（磨砂玻璃）效果，利用 backdrop-filter: blur() 实现。

Hero Section (首屏视觉区)：核心视觉锚点，由大标题、动态背景（粒子/梯度）和高对比度 CTA 组成。

Bento Grid (便当盒布局)：功能展示区，采用非对称网格，通过不同尺寸的卡片承载复杂信息。

Footer (页脚)：极简设计，通常带有大尺寸的品牌 Logo 占位。

二、 布局与 UI 风格 (Layout & UI Style)
布局模式：高度模块化的 Bento Grid。卡片之间通过 gap 保持呼吸感，圆角通常在 24px - 32px 之间，营造柔和、现代的感官。

UI 风格：Linear Style (深色极简风)。

色彩：深黑色背景（#000）配合极细的暗灰色边框（1px border）。

质感：利用渐变（Gradients）和噪点（Noise）纹理打破纯黑的沉闷，模拟物理材质。

三、 特效与动效分析 (Special Effects & Motion)
1. 核心特效：Hero 粒子背景 (Hero Particle System)
2. 核心特效：反色圆形光标 (Inverted Circle Cursor)
技术实现：这是 Google Design Gemini 和 Pulseboard 都在使用的亮点。

实现原理：利用 CSS 的 混合模式 (Mix Blend Mode)。

CSS 设置：

CSS

.custom-cursor {
    position: fixed;
    width: 40px;
    height: 40px;
    background-color: white; /* 关键：白色在 difference 模式下实现取反 */
    border-radius: 50%;
    pointer-events: none; /* 确保不干扰点击 */
    z-index: 9999;
    mix-blend-mode: difference; /* 核心：差值模式 */
    transition: transform 0.1s ease-out;
}
JS 交互：

JavaScript

window.addEventListener('mousemove', (e) => {
    const cursor = document.querySelector('.custom-cursor');
    cursor.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`;
});
效果分析：在“差值（difference）”模式下，白色（#FFFFFF）减去任何底色都会得到其补色。例如：白 - 黑 = 白，白 - 白 = 黑。这使得光标在经过文字或图片时，内部呈现出完美的对比反色。

3. 页面动效 (Interaction Motion)
滚动揭示 (Scroll Reveal)：使用 Framer Motion 或 GSAP 监听滚动条。

实现：当元素进入视口时，触发 y: 20 -> 0 且 opacity: 0 -> 1 的过渡。

流光边框 (Border Beam)：卡片边缘有一道流动的光线。

实现：通常是一个带有渐变色的背景层在 mask-image 或 clip-path 下做旋转动画。

四、 总结与建议
Pulseboard 的成功在于对 “微动效” 的把控，粒子效果虽然多但极其轻量，不会分散注意力。

Gemini 设计文档 则更强调 “有机感 (Organicness)”，利用大面积的径向渐变（Radial Gradients）模拟光源。

建议方案：

若追求极致性能，粒子背景建议使用 Canvas 2D 编写。

反色光标可增加一个 transform: scale() 的缓动效果，当用户悬停在链接上时，圆圈变大，增强交互反馈。