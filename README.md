# 拆解者 · SuperNB Plane Battle

一小时内完成的黑客松作品 —— **three.js Roguelike 空战游戏**。

## 玩法

**BOSS 部件掠夺**:每一层先清理敌机波次,然后击杀巨型 BOSS。
击碎 BOSS 的部件(炮塔/引擎/护盾核心),战利品掉落后**三选一装到你自己机体上**,
层层叠加 build,看看你能打到第几层。

- 移动:鼠标 或 WASD/方向键
- 冲刺:空格(带短暂无敌)
- 开火:自动瞄准最近敌人

## 运行

```bash
npm install
npm run dev      # 开发
npm run build    # 构建 -> dist/
npm run preview  # 本地预览构建产物
```

## 技术

- three.js r160(EffectComposer + UnrealBloomPass 后期发光)
- 加色混合粒子爆炸池(3500 粒子复用池)
- 屏幕震动 / 顿帧 / 慢镜头 / 伤害数字 / 连击系统
- BOSS 可破坏部位 + 部件掠夺 Roguelike 升级
- localStorage 最佳纪录

Made with love at hackathon. 2026
