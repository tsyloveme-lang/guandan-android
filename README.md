# 经典掼蛋 Android

一款完全离线运行的四人单机掼蛋练习应用。玩家与三名基础 AI 对战，对家组成搭档。

## 下载

预编译测试包：

- `releases/经典掼蛋-小米15Ultra-Android15-v1.1.0.apk`

该 APK 使用 Android 调试证书签名，适合个人安装测试，不适合直接提交应用商店。

## 功能

- 两副扑克牌、四人两队
- 三名本地 AI 玩家
- 单张、对子、三张、三带二
- 顺子、三连对、钢板
- 同花顺、普通炸弹、四王炸
- 名次结算与升级
- 无网络权限，游戏资源全部内置
- 针对小米 15 Ultra 的 3200×1440 高密度长屏优化
- Android 15 全面屏、状态栏、导航栏和摄像头开孔适配

## 当前规则范围

当前版本已实现基础牌型、炸弹、名次和升级。逢人配自动组牌、进贡及还贡交互仍待补齐，因此尚不能视为完整赛事规则实现。

## 构建环境

- Android Gradle Plugin 8.6.1
- Gradle 8.7
- JDK 17
- compileSdk / targetSdk 35
- minSdk 24

安装 Android SDK 35 后，在项目根目录运行：

```powershell
gradle assembleDebug
```

生成文件位于：

```text
app/build/outputs/apk/debug/app-debug.apk
```

## 安装

将 APK 发送到 Android 手机后，通过文件管理器打开。如果 HyperOS 阻止未知来源应用，请按系统提示允许当前文件管理器安装应用。

